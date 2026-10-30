"""
Load trained model and generate predictions on live/recent data.
Fetches macro/sentiment context at prediction time to match training features.
"""
import sys
import traceback
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

import joblib
import pandas as pd
import numpy as np
import yfinance as yf
import requests
from datetime import datetime

from src.ml.features_crypto import build_features, merge_external_data, FEATURE_COLUMNS

MODEL_PATH = Path(__file__).parent.parent.parent / "models" / "saved" / "trading_model_crypto.joblib"

CONFIDENCE_THRESHOLD = 0.40
SPECIALIST_THRESHOLD = 0.35


def _model_quality_label(cv_accuracy):
    if cv_accuracy is None:
        return "unknown"
    if cv_accuracy >= 0.50:
        return "high"
    if cv_accuracy >= 0.40:
        return "moderate"
    return "low"


class MLPredictor:
    def __init__(self):
        self.loaded = False
        self.model = None
        self.model_bull = None
        self.model_bear = None
        self.scaler = None
        self.features = None
        self.cv_accuracy = None
        self.bull_precision = None
        self.bear_precision = None

        if MODEL_PATH.exists():
            bundle = joblib.load(MODEL_PATH)
            self.model      = bundle["model"]
            self.model_bull = bundle.get("model_bull")
            self.model_bear = bundle.get("model_bear")
            self.scaler     = bundle["scaler"]
            self.features   = bundle["features"]
            self.cv_accuracy    = bundle.get("cv_accuracy")
            self.bull_precision = bundle.get("bull_precision")
            self.bear_precision = bundle.get("bear_precision")
            self.loaded = True
            print(f"✓ ML model loaded — CV acc: {self.cv_accuracy:.3f}, "
                  f"bull_prec: {self.bull_precision:.3f}, bear_prec: {self.bear_precision:.3f}")
        else:
            print("⚠ No trained model found. Run: python -m src.ml.train_crypto")

    def fetch_recent_data(self, symbol: str, period: str = "1y") -> pd.DataFrame:
        data = yf.download(symbol, period=period, interval="1d", progress=False)
        if isinstance(data.columns, pd.MultiIndex):
            data.columns = data.columns.get_level_values(0)
        return data

    def fetch_macro_data(self, period: str = "1y") -> pd.DataFrame:
        """Fetch live macro data for context features"""
        tickers = {"DXY": "DX-Y.NYB", "SPY": "SPY", "GOLD": "GC=F"}
        frames = {}
        for name, ticker in tickers.items():
            try:
                data = yf.download(ticker, period=period, interval="1d", progress=False)
                if isinstance(data.columns, pd.MultiIndex):
                    data.columns = data.columns.get_level_values(0)
                if not data.empty:
                    frames[name] = data['Close']
            except Exception:
                pass

        if not frames:
            return pd.DataFrame()

        combined = pd.DataFrame(frames)
        combined.columns = [f"{c}_close" for c in combined.columns]
        return combined

    def fetch_sentiment_data(self, limit: int = 60) -> pd.DataFrame:
        """Fetch recent Fear & Greed data (enough for rolling calcs)"""
        try:
            url = f"https://api.alternative.me/fng/?limit={limit}&format=json"
            response = requests.get(url, timeout=10)
            response.raise_for_status()
            data = response.json()['data']

            records = []
            for entry in data:
                records.append({
                    'date': datetime.fromtimestamp(int(entry['timestamp'])).date(),
                    'fear_greed_value': int(entry['value']),
                })

            df = pd.DataFrame(records)
            df['date'] = pd.to_datetime(df['date'])
            df = df.set_index('date').sort_index()
            return df
        except Exception:
            return pd.DataFrame()

    def predict(self, symbol: str) -> dict:
        if not self.loaded:
            return {"error": "Model not trained yet", "prediction": "neutral", "confidence": 0.5}

        try:
            raw = self.fetch_recent_data(symbol)
            featured = build_features(raw)

            macro_df = self.fetch_macro_data()
            sentiment_df = self.fetch_sentiment_data()
            featured = merge_external_data(featured, macro_df=macro_df, sentiment_df=sentiment_df)

            featured = featured.dropna(subset=self.features)

            if len(featured) == 0:
                return {"error": "Not enough data", "prediction": "neutral", "confidence": 0.5}

            latest = featured.iloc[-1]

            # REVERTED: back to a plain array. train_crypto.py fits the scaler
            # on combined[FEATURE_COLUMNS].values — a bare numpy array with no
            # column names — so this was already correctly matched before my
            # earlier "fix." Wrapping it in a named DataFrame was wrong; it
            # broke a working match and introduced a new, previously-absent
            # warning. Confirmed: crypto never showed this warning in any
            # prior test in this session, unlike forex.
            X = latest[self.features].values.reshape(1, -1)
            X_scaled = self.scaler.transform(X)

            pred_class = self.model.predict(X_scaled)[0]
            probs      = self.model.predict_proba(X_scaled)[0]
            classes    = self.model.classes_

            prob_map   = {int(c): float(p) for c, p in zip(classes, probs)}
            confidence = max(prob_map.values())

            direction_map = {-1: "bearish", 0: "neutral", 1: "bullish"}
            raw_direction = direction_map.get(int(pred_class), "neutral")

            specialist_confirmed = False
            specialist_prob = None

            if raw_direction == "bullish" and self.model_bull is not None:
                bull_prob = self.model_bull.predict_proba(X_scaled)[0][1]
                specialist_prob = round(float(bull_prob), 3)
                specialist_confirmed = bull_prob >= SPECIALIST_THRESHOLD
            elif raw_direction == "bearish" and self.model_bear is not None:
                bear_prob = self.model_bear.predict_proba(X_scaled)[0][1]
                specialist_prob = round(float(bear_prob), 3)
                specialist_confirmed = bear_prob >= SPECIALIST_THRESHOLD
            elif raw_direction == "neutral":
                specialist_confirmed = True

            if confidence >= CONFIDENCE_THRESHOLD and specialist_confirmed:
                direction = raw_direction
                filter_reason = None
            elif confidence < CONFIDENCE_THRESHOLD:
                direction = "neutral"
                filter_reason = f"low_confidence ({confidence:.3f})"
            else:
                direction = "neutral"
                filter_reason = f"specialist_rejected (prob={specialist_prob})"

            if direction == "neutral":
                signal_strength = "no_signal"
            elif confidence >= 0.55:
                signal_strength = "moderate"
            else:
                signal_strength = "weak"

            current_price = float(latest['Close'])
            current_vol = float(latest.get('volatility_14d', 0.02))
            target_pct = max(0.02, current_vol * 2)
            stop_pct   = max(0.01, current_vol * 1)

            if direction == "bullish":
                target = current_price * (1 + target_pct)
                stop   = current_price * (1 - stop_pct)
            elif direction == "bearish":
                target = current_price * (1 - target_pct)
                stop   = current_price * (1 + stop_pct)
            else:
                target = current_price
                stop   = current_price

            return {
                "prediction": direction,
                "raw_prediction": raw_direction,
                "signal_strength": signal_strength,
                "filter_reason": filter_reason,
                "confidence": round(confidence, 3),
                "specialist_prob": specialist_prob,
                "current_price": round(current_price, 2),
                "target_price": round(target, 2),
                "stop_loss": round(stop, 2),
                "expected_return": round((target - current_price) / current_price, 4),
                "probabilities": {
                    "bearish": round(prob_map.get(-1, 0), 3),
                    "neutral": round(prob_map.get(0, 0), 3),
                    "bullish": round(prob_map.get(1, 0), 3),
                },
                "model_cv_accuracy": round(self.cv_accuracy, 3) if self.cv_accuracy else None,
                "bull_precision": round(self.bull_precision, 3) if self.bull_precision else None,
                "bear_precision": round(self.bear_precision, 3) if self.bear_precision else None,
                "model_quality": _model_quality_label(self.cv_accuracy),
            }
        except Exception as e:
            print(f"⚠ MLPredictor.predict({symbol}) failed:")
            print(traceback.format_exc())
            return {"error": str(e), "prediction": "neutral", "confidence": 0.5}


if __name__ == "__main__":
    predictor = MLPredictor()
    import json
    for symbol in ["BTC-USD", "ETH-USD", "SOL-USD"]:
        print(f"\n── {symbol} ──")
        result = predictor.predict(symbol)
        print(json.dumps(result, indent=2))