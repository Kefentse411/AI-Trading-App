"""
Analyze why the model is uncertain about current market conditions.
Check if we're in an out-of-distribution regime.
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

import joblib
import pandas as pd
import numpy as np
import yfinance as yf

from src.ml.features_forex import build_features, merge_external_data, FEATURE_COLUMNS

MODEL_PATH = Path("models/saved/trading_model_forex.joblib")
bundle = joblib.load(MODEL_PATH)

scaler = bundle["scaler"]
features = bundle["features"]
feature_stats = bundle.get("feature_stats", {})

def analyze_instrument(ticker, name):
    print(f"\n{'='*80}")
    print(f"{name.upper()} ({ticker})")
    print(f"{'='*80}")
    
    raw = yf.download(ticker, period="2y", interval="1d", progress=False)
    if isinstance(raw.columns, pd.MultiIndex):
        raw.columns = raw.columns.get_level_values(0)
    
    if raw.empty:
        print(f"No data for {ticker}")
        return
    
    featured = build_features(raw)
    
    macro_frames = {}
    for fname, fticker in {"DXY": "DX-Y.NYB", "SPY": "SPY"}.items():
        try:
            d = yf.download(fticker, period="2y", interval="1d", progress=False)
            if isinstance(d.columns, pd.MultiIndex):
                d.columns = d.columns.get_level_values(0)
            if not d.empty:
                macro_frames[fname] = d['Close']
        except:
            pass
    
    rates_frames = {}
    for fname, fticker in {"US10Y": "^TNX", "US3M": "^IRX"}.items():
        try:
            d = yf.download(fticker, period="2y", interval="1d", progress=False)
            if isinstance(d.columns, pd.MultiIndex):
                d.columns = d.columns.get_level_values(0)
            if not d.empty:
                rates_frames[fname] = d['Close'] / 10.0
        except:
            pass
    
    macro_df = pd.DataFrame(macro_frames)
    if not macro_df.empty:
        macro_df.columns = [f"{c}_close" for c in macro_df.columns]
    rates_df = pd.DataFrame(rates_frames)
    if not rates_df.empty:
        rates_df.columns = [f"{c}_yield" for c in rates_df.columns]
    
    featured = merge_external_data(featured, macro_df=macro_df, rates_df=rates_df)
    featured = featured.dropna(subset=features)
    
    if len(featured) == 0:
        print("No clean data")
        return
    
    latest = featured.iloc[-1]
    X_raw = latest[features].values.reshape(1, -1)
    X_scaled = scaler.transform(X_raw)
    
    # Find out-of-range features
    print(f"\nCurrent date: {latest.name.date()}")
    print(f"\nOUT-OF-RANGE FEATURES (|z| > 2.5):")
    print(f"{'Feature':<35} {'Z-score':>10} {'Live':>12} {'Train Mean':>12}")
    print(f"{'-'*70}")
    
    out_of_range = []
    for i, fname in enumerate(features):
        if fname not in feature_stats:
            continue
        stats = feature_stats[fname]
        mean = stats["mean"]
        std = stats["std"]
        z = (X_raw[0, i] - mean) / std if std > 0 else 0.0
        
        if abs(z) > 2.5:
            out_of_range.append((fname, z, X_raw[0, i], mean))
            print(f"{fname:<35} {z:>10.2f} {X_raw[0, i]:>12.6f} {mean:>12.6f}")
    
    if not out_of_range:
        print("(None)")
    else:
        print(f"\nTotal: {len(out_of_range)}/{len(features)} features out of range")
    
    # What's the model seeing?
    print(f"\n3-CLASS MODEL DECISION:")
    model = bundle["model"]
    pred = model.predict(X_scaled)[0]
    probs = model.predict_proba(X_scaled)[0]
    classes = model.classes_
    
    for c, p in zip(classes, probs):
        label = {-1: "bearish", 0: "neutral", 1: "bullish"}[int(c)]
        print(f"  {label:8s}: {p:.1%}")
    
    # Raw feature values for key indicators
    print(f"\nKEY INDICATORS:")
    key_features = [
        'return_7d', 'return_14d', 'volatility_14d', 'rsi_14', 'macd_diff',
        'sma_ratio_50_200', 'price_position', 'yield_curve_slope'
    ]
    for feat in key_features:
        if feat in features:
            idx = features.index(feat)
            val = X_raw[0, idx]
            if feat in feature_stats:
                stats = feature_stats[feat]
                z = (val - stats["mean"]) / stats["std"] if stats["std"] > 0 else 0
                print(f"  {feat:<25} = {val:>10.6f}  (z={z:>+6.2f})")

instruments = {
    "GLD": "GLD",
    "EUR/USD": "EURUSD=X",
    "GBP/USD": "GBPUSD=X",
    "USD/JPY": "USDJPY=X",
}

for name, ticker in instruments.items():
    analyze_instrument(ticker, name)

