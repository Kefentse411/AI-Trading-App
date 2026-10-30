"""Diagnose predictor_forex issues."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

import yfinance as yf
import pandas as pd
import numpy as np
import joblib

from src.ml.features_forex import build_features, merge_external_data

MODEL_PATH = Path("models/saved/trading_model_forex.joblib")
bundle = joblib.load(MODEL_PATH)

print("=== MODEL BUNDLE KEYS ===")
print(list(bundle.keys()))

print("\n=== TRAINING LABEL DISTRIBUTION ===")
if "label_counts" in bundle:
    print(bundle["label_counts"])
else:
    print("(not stored — we should add this)")

print("\n=== FEATURE LIST (first 10) ===")
features = bundle["features"]
print(features[:10])
print(f"Total features: {len(features)}")

# --- Check Gold data ---
print("\n=== GOLD RAW DATA (last 5 rows) ===")
raw = yf.download("GC=F", period="2y", interval="1d", progress=False)
if isinstance(raw.columns, pd.MultiIndex):
    raw.columns = raw.columns.get_level_values(0)
print(raw[['Open','High','Low','Close','Volume']].tail(5))
print(f"Shape: {raw.shape}")
print(f"Date range: {raw.index[0].date()} to {raw.index[-1].date()}")

# --- Check features on latest row ---
print("\n=== GOLD FEATURES (latest row) ===")
featured = build_features(raw)

# Macro data
macro_frames = {}
for name, ticker in {"DXY": "DX-Y.NYB", "SPY": "SPY"}.items():
    try:
        d = yf.download(ticker, period="2y", interval="1d", progress=False)
        if isinstance(d.columns, pd.MultiIndex):
            d.columns = d.columns.get_level_values(0)
        if not d.empty:
            macro_frames[name] = d['Close']
    except Exception:
        pass

rates_frames = {}
for name, ticker in {"US10Y": "^TNX", "US3M": "^IRX"}.items():
    try:
        d = yf.download(ticker, period="2y", interval="1d", progress=False)
        if isinstance(d.columns, pd.MultiIndex):
            d.columns = d.columns.get_level_values(0)
        if not d.empty:
            rates_frames[name] = d['Close'] / 10.0
    except Exception:
        pass

macro_df = pd.DataFrame(macro_frames)
if not macro_df.empty:
    macro_df.columns = [f"{c}_close" for c in macro_df.columns]

rates_df = pd.DataFrame(rates_frames)
if not rates_df.empty:
    rates_df.columns = [f"{c}_yield" for c in rates_df.columns]

featured = merge_external_data(featured, macro_df=macro_df, rates_df=rates_df)
featured = featured.dropna(subset=features)

print(f"Rows after dropna: {len(featured)}")
if len(featured) > 0:
    latest = featured.iloc[-1]
    print(f"\nLatest date: {latest.name}")
    print(f"Close price in features: {latest['Close']:.4f}")
    print("\nFeature values (latest row):")
    for f in features:
        val = latest[f]
        print(f"  {f:35s} = {val:.6f}")

# --- Check if features look in-distribution ---
print("\n=== FEATURE RANGE CHECK vs TRAINING ===")
if "feature_stats" in bundle:
    stats = bundle["feature_stats"]
    print("Training stats available:")
    for f in features[:5]:
        if f in stats:
            print(f"  {f}: train_mean={stats[f]['mean']:.4f}, "
                  f"live={latest[f]:.4f}")
else:
    print("(feature_stats not stored in bundle)")
    print("Run training with feature_stats to diagnose distribution shift")

# --- Raw model output on latest ---
print("\n=== RAW MODEL OUTPUT ===")
scaler = bundle["scaler"]
model = bundle["model"]
X = latest[features].values.reshape(1, -1)
X_scaled = scaler.transform(X)

print(f"X_scaled min: {X_scaled.min():.3f}, max: {X_scaled.max():.3f}, "
      f"mean: {X_scaled.mean():.3f}")

probs = model.predict_proba(X_scaled)[0]
classes = model.classes_
for c, p in zip(classes, probs):
    label = {-1: "bearish", 0: "neutral", 1: "bullish"}[c]
    print(f"  {label}: {p:.4f}")

# --- Check neutral bias in model ---
print("\n=== MODEL NEUTRAL BIAS CHECK ===")
print("Generating 1000 random scaled inputs to check model bias...")
rng = np.random.RandomState(42)
X_random = rng.randn(1000, len(features))
preds = model.predict(X_random)
unique, counts = np.unique(preds, return_counts=True)
for u, c in zip(unique, counts):
    label = {-1: "bearish", 0: "neutral", 1: "bullish"}[u]
    print(f"  {label}: {c}/1000 ({c/10:.1f}%)")

