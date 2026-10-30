"""
Train Gold/Forex directional model.
- 5-year history captures extreme regimes (2020 COVID, 2022 inflation, 2024-26 gold bull)
- Stores feature_stats for live distribution-shift detection
- Stores label_counts for baseline diagnostics
- Tuned specialist thresholds for bull/bear confirmation

CHANGES:
1. make_labels() threshold now scales by sqrt(horizon), matching the
   (unused) reference implementation in features_forex.create_labels().
   Previously the threshold used raw 1-day volatility to judge a 5-day
   forward return — roughly 3x too tight — causing most days to cross
   the bar from noise alone rather than genuine directional signal.

2. Threshold tuning for specialist bull/bear detectors now enforces a
   minimum recall floor (MIN_RECALL = 0.10). Previously the search
   greedily maximized precision with no recall constraint, producing
   thresholds that fired 3-4 times per year — too infrequent to be
   operationally useful regardless of precision. The floor ensures at
   least 10% of real directional days generate a signal (~2-3/month
   for a 5-day horizon system). A precision/recall frontier is printed
   for each specialist so the floor can be adjusted deliberately.
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

import joblib
import numpy as np
import pandas as pd
import yfinance as yf
import warnings
warnings.filterwarnings('ignore')

from sklearn.ensemble import GradientBoostingClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import cross_val_score, StratifiedKFold
from sklearn.metrics import precision_score, recall_score
from datetime import datetime

from src.ml.features_forex import build_features, merge_external_data, FEATURE_COLUMNS

# ── Config ────────────────────────────────────────────────────────────────────
INSTRUMENTS = {
    "GLD":    "GLD",
    "EURUSD": "EURUSD=X",
    "GBPUSD": "GBPUSD=X",
    "USDJPY": "USDJPY=X",
    "AUDUSD": "AUDUSD=X",
    "USDCAD": "USDCAD=X",
}

HORIZON        = 5     # predict 5-day forward return
VOL_MULTIPLIER = 0.75  # threshold = VOL_MULTIPLIER * realized_vol * sqrt(horizon)
PERIOD         = "5y"  # capture 2020-2026 extreme regimes
MIN_RECALL     = 0.10  # specialist threshold tuning: minimum recall floor

MODEL_SAVE_PATH = Path("models/saved/trading_model_forex.joblib")

print(f"\n{'='*80}")
print(f"TRAINING FOREX/GOLD MODEL")
print(f"{'='*80}")
print(f"Instruments:        {list(INSTRUMENTS.keys())}")
print(f"History:            {PERIOD}")
print(f"Prediction horizon: {HORIZON} days")
print(f"Vol multiplier:     {VOL_MULTIPLIER}")
print(f"Min recall floor:   {MIN_RECALL}")
print(f"Timestamp:          {datetime.now().isoformat()}")

# ── Data fetching ─────────────────────────────────────────────────────────────
def fetch_instrument(ticker: str, period: str) -> pd.DataFrame:
    """Fetch OHLCV data, handle multi-level column names from yfinance."""
    try:
        data = yf.download(ticker, period=period, interval="1d", progress=False)
        if isinstance(data.columns, pd.MultiIndex):
            data.columns = data.columns.get_level_values(0)
        return data
    except Exception as e:
        print(f"  ERROR fetching {ticker}: {e}")
        return pd.DataFrame()


def fetch_macro(period: str) -> pd.DataFrame:
    """Fetch DXY and SPY for macro features."""
    frames = {}
    for name, ticker in {"DXY": "DX-Y.NYB", "SPY": "SPY"}.items():
        try:
            d = yf.download(ticker, period=period, interval="1d", progress=False)
            if isinstance(d.columns, pd.MultiIndex):
                d.columns = d.columns.get_level_values(0)
            if not d.empty:
                frames[name] = d['Close']
        except Exception as e:
            print(f"  Warning: failed to fetch {name}: {e}")
    if not frames:
        return pd.DataFrame()
    df = pd.DataFrame(frames)
    df.columns = [f"{c}_close" for c in df.columns]
    return df


def fetch_rates(period: str) -> pd.DataFrame:
    """Fetch 10Y and 3M yields for rate features."""
    frames = {}
    for name, ticker in {"US10Y": "^TNX", "US3M": "^IRX"}.items():
        try:
            d = yf.download(ticker, period=period, interval="1d", progress=False)
            if isinstance(d.columns, pd.MultiIndex):
                d.columns = d.columns.get_level_values(0)
            if not d.empty:
                frames[name] = d['Close'] / 10.0  # TNX/IRX are in basis points
        except Exception as e:
            print(f"  Warning: failed to fetch {name}: {e}")
    if not frames:
        return pd.DataFrame()
    df = pd.DataFrame(frames)
    df.columns = [f"{c}_yield" for c in df.columns]
    return df

# ── Label generation ──────────────────────────────────────────────────────────
def make_labels(df: pd.DataFrame, horizon: int, vol_mult: float) -> pd.Series:
    """
    Generate 3-class labels based on forward return vs volatility threshold.

    forward_return = close[t+horizon] / close[t] - 1
    threshold      = vol_mult * rolling_vol_14d * sqrt(horizon)

    sqrt(horizon) scaling: a 5-day forward return has ~sqrt(5)x the natural
    standard deviation of a 1-day return under a random walk. Without this
    scaling, the threshold was calibrated to 1-day volatility while being
    compared against a 5-day return — roughly 3x too tight — causing most
    days to cross the bar from noise alone rather than genuine directional
    signal.

    label:   1 if fwd_ret >  threshold  (bullish)
            -1 if fwd_ret < -threshold  (bearish)
             0 otherwise               (neutral)
    """
    fwd_ret   = df['Close'].shift(-horizon) / df['Close'] - 1
    threshold = df['Close'].pct_change().rolling(14).std() * np.sqrt(horizon) * vol_mult

    labels = pd.Series(0, index=df.index)
    labels[fwd_ret >  threshold] =  1
    labels[fwd_ret < -threshold] = -1

    return labels

# ── Dataset assembly ──────────────────────────────────────────────────────────
def build_dataset(macro_df: pd.DataFrame, rates_df: pd.DataFrame):
    """Fetch, feature-engineer, and label all instruments."""
    all_X, all_y, all_symbols = [], [], []

    print(f"\n{'─'*80}")
    print(f"Building dataset from {len(INSTRUMENTS)} instruments...")
    print(f"{'─'*80}")

    for name, ticker in INSTRUMENTS.items():
        print(f"\n{name} ({ticker})")
        raw = fetch_instrument(ticker, PERIOD)

        if raw.empty or len(raw) < 300:
            print(f"  ✗ Insufficient data ({len(raw)} rows)")
            continue

        print(f"  Raw data: {len(raw)} rows, {raw.index[0].date()} to {raw.index[-1].date()}")

        featured = build_features(raw)
        featured = merge_external_data(featured, macro_df=macro_df, rates_df=rates_df)

        labels          = make_labels(raw, HORIZON, VOL_MULTIPLIER)
        featured        = featured.copy()
        featured['_label'] = labels

        featured = featured.dropna(subset=FEATURE_COLUMNS + ['_label'])
        featured = featured.iloc[:-HORIZON]  # remove last HORIZON rows (fwd ret not realized)

        if len(featured) < 50:
            print(f"  ✗ Too few clean rows ({len(featured)})")
            continue

        label_dist = featured['_label'].value_counts().sort_index().to_dict()
        print(f"  ✓ {len(featured)} clean rows")
        print(f"    Labels: bearish={label_dist.get(-1, 0):5d} "
              f"neutral={label_dist.get(0, 0):5d} "
              f"bullish={label_dist.get(1, 0):5d}")

        all_X.append(featured[FEATURE_COLUMNS])
        all_y.append(featured['_label'])
        all_symbols.extend([name] * len(featured))

    if not all_X:
        raise RuntimeError("No instruments had enough data to train on.")

    X = pd.concat(all_X, ignore_index=True)
    y = pd.concat(all_y, ignore_index=True).astype(int)

    print(f"\n{'─'*80}")
    print(f"COMBINED DATASET")
    print(f"{'─'*80}")
    print(f"Total rows: {len(X)}")

    return X, y, all_symbols

# ── Threshold tuning helper ───────────────────────────────────────────────────
def tune_specialist_threshold(
    probs_oof: np.ndarray,
    y_binary: pd.Series,
    base_rate: float,
    label: str,
) -> tuple[float, float, float]:
    """
    Find the probability threshold that maximizes precision subject to
    a minimum recall floor (MIN_RECALL).

    Prints a precision/recall frontier so the floor can be reviewed and
    adjusted deliberately rather than tuned blindly.

    Returns (best_threshold, best_precision, best_recall).
    """
    thresholds = np.arange(0.30, 0.80, 0.01)
    results = []

    for t in thresholds:
        preds = (probs_oof >= t).astype(int)
        n_pos = preds.sum()
        if n_pos < 20:
            continue
        prec = precision_score(y_binary, preds, zero_division=0)
        rec  = recall_score(y_binary, preds, zero_division=0)
        results.append({"threshold": t, "precision": prec, "recall": rec, "n_pos": n_pos})

    # Print frontier for thresholds that meet the recall floor
    qualifying = [r for r in results if r["recall"] >= MIN_RECALL]
    print(f"\n  {label} precision/recall frontier (recall >= {MIN_RECALL:.2f}):")
    if qualifying:
        for r in qualifying[::max(1, len(qualifying) // 8)]:
            print(f"    threshold={r['threshold']:.2f}  prec={r['precision']:.3f}  "
                  f"recall={r['recall']:.3f}  n_signals={r['n_pos']}")
    else:
        print(f"    No threshold met the recall floor — "
              f"falling back to best-precision with no floor.")

    # Select best threshold: maximize precision, recall >= MIN_RECALL floor.
    # Fall back to unconstrained best-precision if nothing meets the floor
    # (keeps the model usable rather than crashing — but surfaced clearly).
    candidates = qualifying if qualifying else results
    best = max(candidates, key=lambda r: r["precision"], default=None)

    if best is None:
        print(f"  WARNING: no valid threshold found for {label}. Defaulting to 0.50.")
        return 0.50, base_rate, 0.0

    return best["threshold"], best["precision"], best["recall"]

# ── Training ──────────────────────────────────────────────────────────────────
def train():
    MODEL_SAVE_PATH.parent.mkdir(parents=True, exist_ok=True)

    print(f"\nFetching macro data ({PERIOD})...")
    macro_df = fetch_macro(PERIOD)
    print(f"  DXY shape: {macro_df[['DXY_close']].shape if 'DXY_close' in macro_df.columns else 'N/A'}")

    print(f"Fetching rates data ({PERIOD})...")
    rates_df = fetch_rates(PERIOD)
    print(f"  US10Y shape: {rates_df[['US10Y_yield']].shape if 'US10Y_yield' in rates_df.columns else 'N/A'}")

    X, y, symbols = build_dataset(macro_df, rates_df)

    # ── Label distribution ────────────────────────────────────────────────────
    label_counts = y.value_counts().sort_index().to_dict()
    print(f"\nLabel distribution (overall):")
    print(f"  Bearish (-1): {label_counts.get(-1, 0):6d} ({label_counts.get(-1, 0) / len(y) * 100:5.1f}%)")
    print(f"  Neutral  (0): {label_counts.get(0,  0):6d} ({label_counts.get(0,  0) / len(y) * 100:5.1f}%)")
    print(f"  Bullish  (1): {label_counts.get(1,  0):6d} ({label_counts.get(1,  0) / len(y) * 100:5.1f}%)")
    print(f"  Random baseline: {1 / 3 * 100:.1f}%")

    # ── Scaling ───────────────────────────────────────────────────────────────
    print(f"\n{'─'*80}")
    print(f"SCALING")
    print(f"{'─'*80}")
    scaler   = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    print(f"Scaler fitted on {len(X)} samples, {len(FEATURE_COLUMNS)} features")

    feature_stats = {
        feat: {"mean": float(scaler.mean_[i]), "std": float(scaler.scale_[i])}
        for i, feat in enumerate(FEATURE_COLUMNS)
    }

    # ── 3-class model ─────────────────────────────────────────────────────────
    print(f"\n{'─'*80}")
    print(f"3-CLASS MODEL (bearish / neutral / bullish)")
    print(f"{'─'*80}")

    model = GradientBoostingClassifier(
        n_estimators=200,
        max_depth=3,
        learning_rate=0.05,
        subsample=0.8,
        min_samples_leaf=20,
        random_state=42,
        verbose=0,
    )

    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    cv_scores   = cross_val_score(model, X_scaled, y, cv=cv, scoring='accuracy')
    cv_accuracy = float(cv_scores.mean())
    cv_std      = float(cv_scores.std())

    print(f"Cross-validation accuracy: {cv_accuracy:.3f} ± {cv_std:.3f}")
    print(f"Random baseline:           {1/3:.3f}")
    print(f"Lift:                      {cv_accuracy / (1/3):.2f}x")

    model.fit(X_scaled, y)
    print(f"Model fitted.")

    # ── Specialist bull detector ──────────────────────────────────────────────
    print(f"\n{'─'*80}")
    print(f"SPECIALIST BULL DETECTOR")
    print(f"{'─'*80}")

    y_bull         = (y == 1).astype(int)
    bull_base_rate = y_bull.mean()
    print(f"Bull base rate: {bull_base_rate:.3f} ({y_bull.sum()} / {len(y)} days)")

    model_bull = GradientBoostingClassifier(
        n_estimators=200, max_depth=3, learning_rate=0.05,
        subsample=0.8, min_samples_leaf=20, random_state=42, verbose=0,
    )

    bull_probs_oof = np.zeros(len(y))
    for train_idx, val_idx in cv.split(X_scaled, y):
        m = GradientBoostingClassifier(
            n_estimators=200, max_depth=3, learning_rate=0.05,
            subsample=0.8, min_samples_leaf=20, random_state=42, verbose=0,
        )
        m.fit(X_scaled[train_idx], y_bull.iloc[train_idx])
        bull_probs_oof[val_idx] = m.predict_proba(X_scaled[val_idx])[:, 1]

    best_bull_threshold, best_bull_precision, best_bull_recall = tune_specialist_threshold(
        bull_probs_oof, y_bull, bull_base_rate, label="Bull"
    )

    model_bull.fit(X_scaled, y_bull)
    print(f"\nBest threshold (recall >= {MIN_RECALL:.2f}): {best_bull_threshold:.2f}")
    print(f"Precision at threshold: {best_bull_precision:.3f} "
          f"(lift: {best_bull_precision / bull_base_rate:.2f}x)")
    print(f"Recall at threshold:    {best_bull_recall:.3f}")
    print(f"Expected positives:     "
          f"{int(len(y) * bull_base_rate * best_bull_recall)} / {len(y)} days")

    # ── Specialist bear detector ──────────────────────────────────────────────
    print(f"\n{'─'*80}")
    print(f"SPECIALIST BEAR DETECTOR")
    print(f"{'─'*80}")

    y_bear         = (y == -1).astype(int)
    bear_base_rate = y_bear.mean()
    print(f"Bear base rate: {bear_base_rate:.3f} ({y_bear.sum()} / {len(y)} days)")

    model_bear = GradientBoostingClassifier(
        n_estimators=200, max_depth=3, learning_rate=0.05,
        subsample=0.8, min_samples_leaf=20, random_state=42, verbose=0,
    )

    bear_probs_oof = np.zeros(len(y))
    for train_idx, val_idx in cv.split(X_scaled, y):
        m = GradientBoostingClassifier(
            n_estimators=200, max_depth=3, learning_rate=0.05,
            subsample=0.8, min_samples_leaf=20, random_state=42, verbose=0,
        )
        m.fit(X_scaled[train_idx], y_bear.iloc[train_idx])
        bear_probs_oof[val_idx] = m.predict_proba(X_scaled[val_idx])[:, 1]

    best_bear_threshold, best_bear_precision, best_bear_recall = tune_specialist_threshold(
        bear_probs_oof, y_bear, bear_base_rate, label="Bear"
    )

    model_bear.fit(X_scaled, y_bear)
    print(f"\nBest threshold (recall >= {MIN_RECALL:.2f}): {best_bear_threshold:.2f}")
    print(f"Precision at threshold: {best_bear_precision:.3f} "
          f"(lift: {best_bear_precision / bear_base_rate:.2f}x)")
    print(f"Recall at threshold:    {best_bear_recall:.3f}")
    print(f"Expected positives:     "
          f"{int(len(y) * bear_base_rate * best_bear_recall)} / {len(y)} days")

    # ── Feature importances ───────────────────────────────────────────────────
    print(f"\n{'─'*80}")
    print(f"FEATURE IMPORTANCES (3-class model)")
    print(f"{'─'*80}")

    importances = dict(zip(FEATURE_COLUMNS, model.feature_importances_.tolist()))
    top10 = sorted(importances.items(), key=lambda x: x[1], reverse=True)[:10]
    for i, (fname, imp) in enumerate(top10, 1):
        print(f"{i:2d}. {fname:<35} {imp:.4f}")

    # ── Save bundle ───────────────────────────────────────────────────────────
    print(f"\n{'─'*80}")
    print(f"SAVING MODEL BUNDLE")
    print(f"{'─'*80}")

    bundle = {
        # Core models
        "model":      model,
        "model_bull": model_bull,
        "model_bear": model_bear,
        "scaler":     scaler,

        # Configuration
        "features":       FEATURE_COLUMNS,
        "horizon":        HORIZON,
        "vol_multiplier": VOL_MULTIPLIER,
        "period":         PERIOD,
        "min_recall":     MIN_RECALL,

        # Performance metrics
        "cv_accuracy":    cv_accuracy,
        "bull_precision": best_bull_precision,
        "bear_precision": best_bear_precision,
        "bull_threshold": best_bull_threshold,
        "bear_threshold": best_bear_threshold,
        "bull_recall":    best_bull_recall,
        "bear_recall":    best_bear_recall,

        # Training data metadata
        "trained_samples": len(X),
        "label_counts":    label_counts,
        "instruments":     list(INSTRUMENTS.keys()),

        # For live distribution-shift detection
        "feature_stats": feature_stats,

        # Diagnostics
        "feature_importances": importances,
        "trained_timestamp":   datetime.now().isoformat(),
    }

    joblib.dump(bundle, MODEL_SAVE_PATH)
    print(f"✓ Saved to: {MODEL_SAVE_PATH}")
    print(f"  Size: {MODEL_SAVE_PATH.stat().st_size / 1024 / 1024:.2f} MB")

    return bundle


if __name__ == "__main__":
    try:
        train()
        print(f"\n{'='*80}")
        print(f"✓ TRAINING COMPLETE")
        print(f"{'='*80}\n")
    except Exception as e:
        print(f"\n{'='*80}")
        print(f"✗ TRAINING FAILED: {e}")
        print(f"{'='*80}\n")
        import traceback
        traceback.print_exc()