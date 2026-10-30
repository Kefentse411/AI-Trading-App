"""
Load trained Gold/Forex model with adaptive specialist thresholds.
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

import joblib
import pandas as pd
import numpy as np
import yfinance as yf

from src.ml.features_forex import build_features, merge_external_data, FEATURE_COLUMNS

MODEL_PATH = Path(__file__).parent.parent.parent / "models" / "saved" / "trading_model_forex.joblib"

from src.ml.constants import SYMBOL_MAP, GLD_MULTIPLIER

# Duplicated from predictor_crypto.py rather than shared-imported — these two
# predictor classes aren't otherwise coupled. Centralize into a shared utils
# module later if this drifts or needs to change in more than one place.
def _model_quality_label(cv_accuracy):
    if cv_accuracy is None:
        return "unknown"
    if cv_accuracy >= 0.50:
        return "high"
    if cv_accuracy >= 0.40:
        return "moderate"
    return "low"


class ForexPredictor:
    def __init__(self, risk_mode: str = "balanced"):
        """
        risk_mode:
          'conservative' - high precision, few signals (0.72/0.64 thresholds)
          'balanced'     - mix of precision and recall (0.60/0.55 thresholds)
          'aggressive'   - more signals, lower precision (0.50/0.50 thresholds)
        """
        self.loaded = False
        self.model = self.model_bull = self.model_bear = None
        self.scaler = self.features = None
        self.feature_stats = {}
        self.risk_mode = risk_mode

        # NOTE: cv_accuracy / precisions / thresholds are only set below, inside
        # the "model exists" branch — same latent gap as before, flagged in
        # chat, not fixed here since it wasn't part of this request.

        # Adaptive thresholds based on risk mode
        self.threshold_config = {
            "conservative": {"bull": 0.72, "bear": 0.64},
            "balanced":     {"bull": 0.60, "bear": 0.55},
            "aggressive":   {"bull": 0.50, "bear": 0.50},
        }
        
        if MODEL_PATH.exists():
            bundle = joblib.load(MODEL_PATH)
            self.model          = bundle["model"]
            self.model_bull     = bundle.get("model_bull")
            self.model_bear     = bundle.get("model_bear")
            self.scaler         = bundle["scaler"]
            self.features       = bundle["features"]
            self.cv_accuracy    = bundle.get("cv_accuracy")
            self.bull_precision = bundle.get("bull_precision")
            self.bear_precision = bundle.get("bear_precision")
            self.feature_stats  = bundle.get("feature_stats", {})
            self.loaded = True
            
            # Get active thresholds
            active_thresholds = self.threshold_config[risk_mode]
            self.bull_threshold = active_thresholds["bull"]
            self.bear_threshold = active_thresholds["bear"]
            
            print(f"✓ Forex model loaded (risk_mode='{risk_mode}')")
            print(f"  CV accuracy: {self.cv_accuracy:.3f}")
            print(f"  Bull precision@tuned: {self.bull_precision:.3f}")
            print(f"  Bear precision@tuned: {self.bear_precision:.3f}")
            print(f"  Active thresholds: bull={self.bull_threshold:.2f}, bear={self.bear_threshold:.2f}")
        else:
            print(f"✗ No model found at {MODEL_PATH}")
            print(f"  Run: python -m src.ml.train_forex")

    # [Data fetching methods - same as before]
    def _fetch(self, ticker: str, period: str = "2y") -> pd.DataFrame:
        data = yf.download(ticker, period=period, interval="1d", progress=False)
        if isinstance(data.columns, pd.MultiIndex):
            data.columns = data.columns.get_level_values(0)
        return data

    def _fetch_macro(self, period: str = "2y") -> pd.DataFrame:
        frames = {}
        for name, ticker in {"DXY": "DX-Y.NYB", "SPY": "SPY"}.items():
            try:
                d = self._fetch(ticker, period)
                if not d.empty:
                    frames[name] = d['Close']
            except Exception:
                pass
        if not frames:
            return pd.DataFrame()
        df = pd.DataFrame(frames)
        df.columns = [f"{c}_close" for c in df.columns]
        return df

    def _fetch_rates(self, period: str = "2y") -> pd.DataFrame:
        frames = {}
        for name, ticker in {"US10Y": "^TNX", "US3M": "^IRX"}.items():
            try:
                d = self._fetch(ticker, period)
                if not d.empty:
                    frames[name] = d['Close'] / 10.0
            except Exception:
                pass
        if not frames:
            return pd.DataFrame()
        df = pd.DataFrame(frames)
        df.columns = [f"{c}_yield" for c in df.columns]
        return df

    def _analyze_regime(self, X_raw: np.ndarray) -> dict:
        """Compare live features against training distribution."""
        if not self.feature_stats:
            return {
                "out_of_range_count": 0,
                "total_features": len(self.features),
                "flagged_features": [],
                "regime_warning": False,
                "regime_message": None,
            }

        flagged = []
        for i, fname in enumerate(self.features):
            if fname not in self.feature_stats:
                continue
            stats = self.feature_stats[fname]
            mean = stats["mean"]
            std = stats["std"]
            z = (X_raw[0, i] - mean) / std if std > 0 else 0.0
            
            if abs(z) > 2.5:
                flagged.append({
                    "feature": fname,
                    "z_score": round(z, 2),
                    "live_value": round(X_raw[0, i], 6),
                    "training_mean": round(mean, 6),
                })

        flagged.sort(key=lambda x: abs(x["z_score"]), reverse=True)
        regime_warning = len(flagged) >= 5
        regime_message = None
        
        if regime_warning:
            worst = flagged[0]
            regime_message = (
                f"Unusual regime: {len(flagged)} features out-of-range. "
                f"Worst: {worst['feature']} (z={worst['z_score']}). "
                f"Model confidence reduced."
            )

        return {
            "out_of_range_count": len(flagged),
            "total_features": len(self.features),
            "flagged_features": flagged[:5],
            "regime_warning": regime_warning,
            "regime_message": regime_message,
        }

    def predict(self, symbol: str) -> dict:
        """Generate prediction for a forex/gold instrument."""
        if not self.loaded:
            return {
                "error": "Model not trained",
                "prediction": "neutral",
                "confidence": 0.5,
            }

        ticker = SYMBOL_MAP.get(symbol.lower(), symbol)
        is_gold = (ticker == "GLD")

        try:
            raw = self._fetch(ticker, period="2y")
            if raw.empty:
                return {
                    "error": f"No data for {ticker}",
                    "prediction": "neutral",
                    "confidence": 0.5,
                }

            featured = build_features(raw)
            macro_df = self._fetch_macro()
            rates_df = self._fetch_rates()
            featured = merge_external_data(featured, macro_df=macro_df, rates_df=rates_df)
            featured = featured.dropna(subset=self.features)

            if len(featured) == 0:
                return {
                    "error": "Not enough data after feature engineering",
                    "prediction": "neutral",
                    "confidence": 0.5,
                }

            latest = featured.iloc[-1]
            X_raw = latest[self.features].values.reshape(1, -1)

            # CHANGED: transform a named DataFrame instead of the raw ndarray —
            # the scaler was fit on named columns during training, and passing
            # an unnamed array triggers sklearn's "X does not have valid
            # feature names" warning on every prediction call. X_raw itself is
            # kept as-is below for _analyze_regime, which indexes it
            # positionally and doesn't need column names.
            X_df = pd.DataFrame(X_raw, columns=self.features)
            X_scaled = self.scaler.transform(X_df)

            regime = self._analyze_regime(X_raw)

            # 3-class prediction
            pred_class = self.model.predict(X_scaled)[0]
            probs      = self.model.predict_proba(X_scaled)[0]
            classes    = self.model.classes_
            prob_map   = {int(c): float(p) for c, p in zip(classes, probs)}
            confidence = max(prob_map.values())

            direction_map = {-1: "bearish", 0: "neutral", 1: "bullish"}
            raw_direction = direction_map.get(int(pred_class), "neutral")

            # Specialist confirmation
            bull_prob = (float(self.model_bull.predict_proba(X_scaled)[0][1])
                         if self.model_bull else None)
            bear_prob = (float(self.model_bear.predict_proba(X_scaled)[0][1])
                         if self.model_bear else None)

            specialist_prob = None
            specialist_confirmed = False

            if raw_direction == "bullish" and bull_prob is not None:
                specialist_prob = round(bull_prob, 3)
                specialist_confirmed = bull_prob >= self.bull_threshold
            elif raw_direction == "bearish" and bear_prob is not None:
                specialist_prob = round(bear_prob, 3)
                specialist_confirmed = bear_prob >= self.bear_threshold
            elif raw_direction == "neutral":
                specialist_confirmed = True

            if specialist_confirmed:
                direction = raw_direction
                filter_reason = None
            else:
                direction = "neutral"
                needed_threshold = (self.bull_threshold if raw_direction == "bullish" 
                                   else self.bear_threshold)
                filter_reason = (
                    f"Specialist rejected ({raw_direction}). "
                    f"Prob {specialist_prob} < {needed_threshold:.2f} "
                    f"(risk_mode={self.risk_mode})"
                )

            # Signal strength
            if direction == "neutral":
                signal_strength = "no_signal"
            elif confidence >= 0.55:
                signal_strength = "strong"
            elif confidence >= 0.50:
                signal_strength = "moderate"
            else:
                signal_strength = "weak"

            if regime["regime_warning"] and direction != "neutral":
                signal_strength = "low_confidence_regime"

            # Price levels
            raw_price = float(latest['Close'])
            display_price = raw_price * GLD_MULTIPLIER if is_gold else raw_price

            current_vol = float(latest.get('volatility_14d', 0.005))
            target_pct = max(0.005, current_vol * 2)
            stop_pct = max(0.0025, current_vol * 1)

            if direction == "bullish":
                target = display_price * (1 + target_pct)
                stop = display_price * (1 - stop_pct)
            elif direction == "bearish":
                target = display_price * (1 - target_pct)
                stop = display_price * (1 + stop_pct)
            else:
                target = display_price
                stop = display_price

            decimals = 1 if is_gold else 5

            return {
                "symbol": symbol.upper(),
                "ticker": ticker,
                "prediction": direction,
                "raw_prediction": raw_direction,
                "signal_strength": signal_strength,
                "filter_reason": filter_reason,
                "confidence": round(confidence, 3),
                "specialist_prob": specialist_prob,
                "current_price": round(display_price, decimals),
                "target_price": round(target, decimals),
                "stop_loss": round(stop, decimals),
                "expected_return": round((target - display_price) / display_price, 5),
                "probabilities": {
                    "bearish": round(prob_map.get(-1, 0), 3),
                    "neutral": round(prob_map.get(0, 0), 3),
                    "bullish": round(prob_map.get(1, 0), 3),
                },
                "regime": regime,
                "model_info": {
                    "cv_accuracy": round(self.cv_accuracy, 3) if self.cv_accuracy else None,
                    "bull_precision": round(self.bull_precision, 3) if self.bull_precision else None,
                    "bear_precision": round(self.bear_precision, 3) if self.bear_precision else None,
                    "risk_mode": self.risk_mode,
                    "bull_threshold": self.bull_threshold,
                    "bear_threshold": self.bear_threshold,
                    # NEW: consistent with the crypto predictor's model_quality label.
                    "model_quality": _model_quality_label(self.cv_accuracy),
                },
            }

        except Exception as e:
            import traceback
            return {
                "error": str(e),
                "traceback": traceback.format_exc(),
                "prediction": "neutral",
                "confidence": 0.5,
            }


if __name__ == "__main__":
    import json
    
    print(f"\n{'='*80}")
    print(f"FOREX PREDICTIONS - ADAPTIVE THRESHOLD TEST")
    print(f"{'='*80}\n")
    
    for mode in ["conservative", "balanced", "aggressive"]:
        print(f"\n{'─'*80}")
        print(f"RISK MODE: {mode.upper()}")
        print(f"{'─'*80}\n")
        
        predictor = ForexPredictor(risk_mode=mode)
        instruments = ["gold", "eurusd"]
        
        for symbol in instruments:
            result = predictor.predict(symbol)
            
            if "error" in result and result["error"]:
                print(f"  {symbol.upper()}: ERROR - {result['error']}")
            else:
                pred = result["prediction"]
                conf = result["confidence"]
                sig = result["signal_strength"]
                ret = result["expected_return"]
                print(f"  {symbol.upper():10s} → {pred:8s} (conf={conf:.1%}, "
                      f"signal={sig:20s}, return={ret:+.2%})")