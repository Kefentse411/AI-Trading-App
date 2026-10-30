"""
Check which specific features are most out-of-range.
Uses the scaler's stored mean/scale to compute z-scores manually.
"""
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
scaler = bundle["scaler"]
features = bundle["features"]

# Fetch and build features (reuse gold for now)
raw = yf.download("GC=F", period="2y", interval="1d", progress=False)
if isinstance(raw.columns, pd.MultiIndex):
    raw.columns = raw.columns.get_level_values(0)

featured = build_features(raw)

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

latest = featured.iloc[-1]
X = latest[features].values.reshape(1, -1)

# scaler.mean_ and scaler.scale_ are from training data
train_means = scaler.mean_
train_stds  = scaler.scale_

print("=== FEATURE Z-SCORES (how many training std-devs from training mean) ===")
print(f"{'Feature':<35} {'Raw Value':>12} {'Train Mean':>12} {'Z-score':>10}  Status")
print("-" * 80)

out_of_range = []
for i, fname in enumerate(features):
    raw_val   = float(X[0, i])
    t_mean    = float(train_means[i])
    t_std     = float(train_stds[i])
    z         = (raw_val - t_mean) / t_std if t_std > 0 else 0.0
    status    = "⚠️  OUT OF RANGE" if abs(z) > 2.5 else "ok"
    if abs(z) > 2.5:
        out_of_range.append((fname, z, raw_val, t_mean))
    print(f"{fname:<35} {raw_val:>12.4f} {t_mean:>12.4f} {z:>10.2f}  {status}")

print(f"\n=== SUMMARY ===")
print(f"Features out of range (|z| > 2.5): {len(out_of_range)}/{len(features)}")
if out_of_range:
    print("\nWorst offenders:")
    for fname, z, raw_val, t_mean in sorted(out_of_range, key=lambda x: abs(x[1]), reverse=True):
        print(f"  {fname:<35} z={z:+.2f}  (live={raw_val:.4f}, train_mean={t_mean:.4f})")

