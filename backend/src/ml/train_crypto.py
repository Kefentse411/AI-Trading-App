"""
Train a trading direction classifier using scikit-learn.
Now incorporates macro/sentiment context alongside technical features.
Run: python -m src.ml.train
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

import pandas as pd
import numpy as np
import joblib
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.model_selection import TimeSeriesSplit
from sklearn.metrics import accuracy_score, classification_report, precision_score, recall_score
from sklearn.preprocessing import StandardScaler

from src.ml.features_crypto import build_features, merge_external_data, create_labels, FEATURE_COLUMNS


DATA_DIR = Path(__file__).parent.parent.parent / "data" / "raw"
MODEL_DIR = Path(__file__).parent.parent.parent / "models" / "saved"
MODEL_DIR.mkdir(parents=True, exist_ok=True)


def make_gb():
    return GradientBoostingClassifier(
        n_estimators=300,
        max_depth=3,
        learning_rate=0.03,
        subsample=0.8,
        min_samples_leaf=15,
        random_state=42,
    )


def load_macro_data() -> pd.DataFrame:
    """Load macro data once, shared across all symbols"""
    filepath = DATA_DIR / "macro_historical.csv"
    if not filepath.exists():
        print("  ⚠ No macro_historical.csv found — run macro_collector.py first")
        return pd.DataFrame()
    df = pd.read_csv(filepath, index_col=0, parse_dates=True)
    return df


def load_sentiment_data() -> pd.DataFrame:
    """Load sentiment data once, shared across all symbols"""
    filepath = DATA_DIR / "fear_greed_historical.csv"
    if not filepath.exists():
        print("  ⚠ No fear_greed_historical.csv found — run sentiment_collector.py first")
        return pd.DataFrame()
    df = pd.read_csv(filepath, index_col=0, parse_dates=True)
    return df


def load_and_prepare(symbol_file: str, macro_df: pd.DataFrame, sentiment_df: pd.DataFrame,
                      horizon: int = 3, vol_multiplier: float = 0.5) -> pd.DataFrame:
    filepath = DATA_DIR / symbol_file
    df = pd.read_csv(filepath, index_col=0, parse_dates=True)

    if isinstance(df.columns, pd.MultiIndex):
        df.columns = df.columns.get_level_values(0)

    df = build_features(df)
    df = merge_external_data(df, macro_df=macro_df, sentiment_df=sentiment_df)
    df['label'] = create_labels(df, horizon=horizon, vol_multiplier=vol_multiplier)
    df = df.dropna(subset=FEATURE_COLUMNS + ['label'])

    return df


def train_model(symbol_files: list, horizon: int = 3, vol_multiplier: float = 0.5):
    print("Loading macro and sentiment data...")
    macro_df = load_macro_data()
    sentiment_df = load_sentiment_data()
    print(f"  Macro rows: {len(macro_df)}, Sentiment rows: {len(sentiment_df)}")

    print("\nLoading and preparing symbol data...")
    print(f"  Label strategy: vol-adjusted (horizon={horizon}d, multiplier={vol_multiplier})")

    all_data = []
    for f in symbol_files:
        try:
            df = load_and_prepare(f, macro_df, sentiment_df, horizon=horizon, vol_multiplier=vol_multiplier)
            df['source'] = f
            all_data.append(df)
            print(f"  ✓ {f}: {len(df)} usable rows")
        except Exception as e:
            print(f"  ✗ {f}: {e}")

    if not all_data:
        print("No data available for training!")
        return None

    combined = pd.concat(all_data).sort_index()

    X = combined[FEATURE_COLUMNS].values
    y = combined['label'].values
    y_bull = (y == 1).astype(int)
    y_bear = (y == -1).astype(int)

    print(f"\nTotal samples: {len(X)}")
    print(f"Label distribution:")
    print(f"  Bearish (-1): {(y == -1).sum()}  ({(y==-1).mean()*100:.1f}%)")
    print(f"  Neutral  (0): {(y ==  0).sum()}  ({(y== 0).mean()*100:.1f}%)")
    print(f"  Bullish  (1): {(y ==  1).sum()}  ({(y== 1).mean()*100:.1f}%)")

    tscv = TimeSeriesSplit(n_splits=5)

    # ── 3-class CV ────────────────────────────────────────────────────────────
    print("\n" + "=" * 55)
    print("3-Class Model Cross-Validation")
    print("=" * 55)

    gb_accs = []
    for fold, (train_idx, test_idx) in enumerate(tscv.split(X), 1):
        fold_scaler = StandardScaler()
        X_train = fold_scaler.fit_transform(X[train_idx])
        X_test  = fold_scaler.transform(X[test_idx])

        gb = make_gb()
        gb.fit(X_train, y[train_idx])
        acc = accuracy_score(y[test_idx], gb.predict(X_test))
        gb_accs.append(acc)
        print(f"  Fold {fold}: {acc:.3f}")

    print(f"  Average: {np.mean(gb_accs):.3f}")
    
    # ── Binary specialists CV ────────────────────────────────────────────────
    print("\n" + "=" * 55)
    print("Binary Bull Detector Cross-Validation")
    print("=" * 55)
    bull_precisions = []
    for fold, (train_idx, test_idx) in enumerate(tscv.split(X), 1):
        fold_scaler = StandardScaler()
        X_train = fold_scaler.fit_transform(X[train_idx])
        X_test  = fold_scaler.transform(X[test_idx])
        gb = make_gb()
        gb.fit(X_train, y_bull[train_idx])
        preds = gb.predict(X_test)
        prec = precision_score(y_bull[test_idx], preds, zero_division=0)
        rec  = recall_score(y_bull[test_idx], preds, zero_division=0)
        n_pred_positive = int(preds.sum())
        n_actual_positive = int(y_bull[test_idx].sum())
        bull_precisions.append(prec)
        print(f"  Fold {fold}: precision={prec:.3f}  recall={rec:.3f}  "
              f"predicted_positive={n_pred_positive}  actual_positive={n_actual_positive}")
    print(f"  Avg bull precision: {np.mean(bull_precisions):.3f}  (base rate: {y_bull.mean():.3f})")

    print("\n" + "=" * 55)
    print("Binary Bear Detector Cross-Validation")
    print("=" * 55)
    bear_precisions = []
    for fold, (train_idx, test_idx) in enumerate(tscv.split(X), 1):
        fold_scaler = StandardScaler()
        X_train = fold_scaler.fit_transform(X[train_idx])
        X_test  = fold_scaler.transform(X[test_idx])
        gb = make_gb()
        gb.fit(X_train, y_bear[train_idx])
        preds = gb.predict(X_test)
        prec = precision_score(y_bear[test_idx], preds, zero_division=0)
        rec  = recall_score(y_bear[test_idx], preds, zero_division=0)
        n_pred_positive = int(preds.sum())
        n_actual_positive = int(y_bear[test_idx].sum())
        bear_precisions.append(prec)
        print(f"  Fold {fold}: precision={prec:.3f}  recall={rec:.3f}  "
              f"predicted_positive={n_pred_positive}  actual_positive={n_actual_positive}")
    print(f"  Avg bear precision: {np.mean(bear_precisions):.3f}  (base rate: {y_bear.mean():.3f})")

    # ── Classification report ────────────────────────────────────────────────
    print("\n" + "=" * 55)
    print("Classification Report — 3-class (final fold)")
    print("=" * 55)
    splits = list(tscv.split(X))
    last_train_idx, last_test_idx = splits[-1]
    fs = StandardScaler()
    X_lt = fs.fit_transform(X[last_train_idx])
    X_lte = fs.transform(X[last_test_idx])
    gb_last = make_gb()
    gb_last.fit(X_lt, y[last_train_idx])
    print(classification_report(
        y[last_test_idx], gb_last.predict(X_lte),
        target_names=['Bearish', 'Neutral', 'Bullish'], zero_division=0
    ))

    # ── Final models ──────────────────────────────────────────────────────────
    print("Training final models on all data...")
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    final_3class = make_gb()
    final_3class.fit(X_scaled, y)

    final_bull = make_gb()
    final_bull.fit(X_scaled, y_bull)

    final_bear = make_gb()
    final_bear.fit(X_scaled, y_bear)

    print("\nFeature Importances (3-class GB) — external features marked with *:")
    from src.ml.features_crypto import EXTERNAL_FEATURES
    importances = sorted(
        zip(FEATURE_COLUMNS, final_3class.feature_importances_),
        key=lambda x: -x[1]
    )
    for feat, imp in importances:
        marker = " *" if feat in EXTERNAL_FEATURES else "  "
        bar = "█" * int(imp * 300)
        print(f" {marker} {feat:<25} {imp:.3f}  {bar}")

    model_path = MODEL_DIR / "trading_model_crypto.joblib"
    joblib.dump({
        "model": final_3class,
        "model_bull": final_bull,
        "model_bear": final_bear,
        "scaler": scaler,
        "features": FEATURE_COLUMNS,
        "cv_accuracy": float(np.mean(gb_accs)),
        "bull_precision": float(np.mean(bull_precisions)),
        "bear_precision": float(np.mean(bear_precisions)),
        "trained_samples": len(X),
        "horizon": horizon,
        "vol_multiplier": vol_multiplier,
        "feature_importances": {f: float(i) for f, i in importances},
    }, model_path)

    print(f"\n✓ Model saved to {model_path}")
    return final_3class, scaler


if __name__ == "__main__":
    symbol_files = [
        "BTC-USD_historical.csv",
        "ETH-USD_historical.csv",
        "SOL-USD_historical.csv",
        "BNB-USD_historical.csv",
        "XRP-USD_historical.csv",
    ]
    train_model(symbol_files, horizon=3, vol_multiplier=0.5)
