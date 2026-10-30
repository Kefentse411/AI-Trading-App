"""
Ensemble predictor combining ML model with price action rules.
Signals only on high-confidence setups, uses uncertainty for risk management.
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

import joblib
import pandas as pd
import numpy as np
import yfinance as yf

from src.ml.features_forex import build_features, merge_external_data, FEATURE_COLUMNS
from src.ml.predictor_forex import ForexPredictor

MODEL_PATH = Path(__file__).parent.parent.parent / "models" / "saved" / "trading_model_forex.joblib"

class EnsemblePredictor(ForexPredictor):
    """
    Extends ForexPredictor with price action rules.
    Generates signals based on:
    - Model confidence + specialist thresholds
    - Price action confirmation (RSI, MACD, SMA structure)
    - Position sizing based on model uncertainty
    """
    
    def __init__(self, risk_mode: str = "balanced"):
        super().__init__(risk_mode=risk_mode)
        self.confidence_threshold = {
            "conservative": 0.55,  # require high 3-class confidence
            "balanced":     0.48,  # moderate confidence
            "aggressive":   0.40,  # lower bar
        }.get(risk_mode, 0.48)
    
    # ── Price action rules ────────────────────────────────────────────────────
    def _check_rsi_divergence(self, latest: pd.Series) -> dict:
        """
        Check RSI for overbought/oversold + divergence.
        Returns signal strength and direction hint.
        """
        rsi_14 = float(latest.get('rsi_14', 50))
        rsi_7 = float(latest.get('rsi_7', 50))
        
        if rsi_14 > 75:
            if rsi_7 > rsi_14:
                return {"signal": "overbought_accelerating", "hint": "bearish", "strength": 0.7}
            else:
                return {"signal": "overbought_diverging", "hint": "bearish", "strength": 0.5}
        elif rsi_14 < 25:
            if rsi_7 < rsi_14:
                return {"signal": "oversold_accelerating", "hint": "bullish", "strength": 0.7}
            else:
                return {"signal": "oversold_diverging", "hint": "bullish", "strength": 0.5}
        else:
            return {"signal": "rsi_neutral", "hint": None, "strength": 0.0}
    
    def _check_macd_structure(self, latest: pd.Series) -> dict:
        """
        Check MACD for momentum + histogram direction.
        """
        macd = float(latest.get('macd', 0))
        macd_signal = float(latest.get('macd_signal', 0))
        macd_diff = float(latest.get('macd_diff', 0))
        
        if macd > macd_signal and macd_diff > 0:
            return {"signal": "macd_bullish", "hint": "bullish", "strength": 0.6}
        elif macd < macd_signal and macd_diff < 0:
            return {"signal": "macd_bearish", "hint": "bearish", "strength": 0.6}
        else:
            return {"signal": "macd_neutral", "hint": None, "strength": 0.0}
    
    def _check_sma_structure(self, latest: pd.Series) -> dict:
        """
        Check moving average alignment for trend.
        """
        ratio_50_200 = float(latest.get('sma_ratio_50_200', 1.0))
        ratio_30_50 = float(latest.get('sma_ratio_30_50', 1.0))
        
        # Bullish: 50 > 200 and 30 > 50
        if ratio_50_200 > 1.01 and ratio_30_50 > 1.0:
            return {"signal": "sma_bullish_trend", "hint": "bullish", "strength": 0.7}
        # Bearish: 50 < 200 and 30 < 50
        elif ratio_50_200 < 0.99 and ratio_30_50 < 1.0:
            return {"signal": "sma_bearish_trend", "hint": "bearish", "strength": 0.7}
        else:
            return {"signal": "sma_no_trend", "hint": None, "strength": 0.0}
    
    def _check_momentum(self, latest: pd.Series) -> dict:
        """
        Check recent return for momentum direction.
        """
        return_7d = float(latest.get('return_7d', 0))
        return_1d = float(latest.get('return_1d', 0))
        vol_14d = float(latest.get('volatility_14d', 0.01))
        
        # Strong positive momentum
        if return_7d > vol_14d * 2:
            return {"signal": "momentum_bullish", "hint": "bullish", "strength": 0.6}
        # Strong negative momentum
        elif return_7d < -vol_14d * 2:
            return {"signal": "momentum_bearish", "hint": "bearish", "strength": 0.6}
        else:
            return {"signal": "momentum_neutral", "hint": None, "strength": 0.0}
    
    # ── Ensemble decision ─────────────────────────────────────────────────────
    def predict_ensemble(self, symbol: str) -> dict:
        """
        ML model + price action rules.
        """
        ml_result = self.predict(symbol)
        
        if "error" in ml_result and ml_result["error"]:
            return ml_result
        
        # Re-fetch for price action analysis
        ticker = self._resolve_ticker(symbol)
        raw = self._fetch(ticker, period="2y")
        if raw.empty:
            return ml_result
        
        featured = build_features(raw)
        macro_df = self._fetch_macro()
        rates_df = self._fetch_rates()
        featured = merge_external_data(featured, macro_df=macro_df, rates_df=rates_df)
        featured = featured.dropna(subset=self.features)
        
        if len(featured) == 0:
            return ml_result
        
        latest = featured.iloc[-1]
        
        # Run price action checks
        rsi_check = self._check_rsi_divergence(latest)
        macd_check = self._check_macd_structure(latest)
        sma_check = self._check_sma_structure(latest)
        momentum_check = self._check_momentum(latest)
        
        checks = [rsi_check, macd_check, sma_check, momentum_check]
        
        # Aggregate price action signals
        bullish_votes = sum(1 for c in checks if c["hint"] == "bullish" and c["strength"] > 0.5)
        bearish_votes = sum(1 for c in checks if c["hint"] == "bearish" and c["strength"] > 0.5)
        
        ml_confidence = ml_result["confidence"]
        ml_pred = ml_result["prediction"]
        specialist_prob = ml_result.get("specialist_prob", 0.5)
        
        # ── Decision logic ────────────────────────────────────────────────────
        
        # If ML is confident and price action agrees → STRONG signal
        if (ml_pred == "bullish" and specialist_prob >= self.bull_threshold 
            and bullish_votes >= 2):
            ensemble_pred = "bullish"
            confidence_boost = 0.10
            signal_source = "ml_confirmed_by_price_action"
        elif (ml_pred == "bearish" and specialist_prob >= self.bear_threshold 
              and bearish_votes >= 2):
            ensemble_pred = "bearish"
            confidence_boost = 0.10
            signal_source = "ml_confirmed_by_price_action"
        
        # If ML is weak but price action is strong → MEDIUM signal
        elif bullish_votes >= 3 and ml_pred != "bearish":
            ensemble_pred = "bullish"
            confidence_boost = 0.05
            signal_source = "price_action_strong"
        elif bearish_votes >= 3 and ml_pred != "bullish":
            ensemble_pred = "bearish"
            confidence_boost = 0.05
            signal_source = "price_action_strong"
        
        # If ML disagrees with price action → NEUTRAL (safety)
        else:
            ensemble_pred = "neutral"
            confidence_boost = 0.0
            signal_source = "no_consensus"
        
        # Update result
        ml_result["ensemble_prediction"] = ensemble_pred
        ml_result["ensemble_confidence"] = round(
            min(1.0, ml_confidence + confidence_boost), 3
        )
        ml_result["signal_source"] = signal_source
        ml_result["price_action_checks"] = {
            "rsi": rsi_check["signal"],
            "macd": macd_check["signal"],
            "sma": sma_check["signal"],
            "momentum": momentum_check["signal"],
            "bullish_votes": bullish_votes,
            "bearish_votes": bearish_votes,
        }
        
        # Position sizing based on uncertainty
        ml_uncertainty = 1.0 - ml_confidence
        position_size = 1.0 - (ml_uncertainty * 0.5)  # reduce size in uncertain markets
        ml_result["suggested_position_size"] = round(position_size, 2)
        
        if ensemble_pred == "neutral":
            ml_result["ensemble_signal_strength"] = "no_signal"
        elif ml_confidence >= 0.55:
            ml_result["ensemble_signal_strength"] = "strong"
        elif ml_confidence >= 0.48:
            ml_result["ensemble_signal_strength"] = "moderate"
        else:
            ml_result["ensemble_signal_strength"] = "weak"
        
        return ml_result
    
    def _resolve_ticker(self, symbol):
    	return SYMBOL_MAP.get(symbol.lower(),symbol)


if __name__ == "__main__":
    import json
    
    print(f"\n{'='*80}")
    print(f"ENSEMBLE PREDICTIONS (ML + Price Action)")
    print(f"{'='*80}\n")
    
    predictor = EnsemblePredictor(risk_mode="balanced")
    instruments = ["gold", "eurusd", "gbpusd", "usdjpy"]
    
    for symbol in instruments:
        print(f"\n{'─'*80}")
        print(f"{symbol.upper()}")
        print(f"{'─'*80}")
        result = predictor.predict_ensemble(symbol)
        
        if "error" in result and result["error"]:
            print(f"ERROR: {result['error']}")
        else:
            print(f"ML Prediction:       {result['prediction'].upper():8s} (conf={result['confidence']:.1%})")
            print(f"Ensemble Prediction: {result['ensemble_prediction'].upper():8s} (conf={result['ensemble_confidence']:.1%})")
            print(f"Signal Source:       {result['signal_source']}")
            print(f"Signal Strength:     {result['ensemble_signal_strength']}")
            print(f"Position Size:       {result['suggested_position_size']:.0%}")
            
            print(f"\nPrice Action Checks:")
            pa = result['price_action_checks']
            print(f"  RSI:      {pa['rsi']}")
            print(f"  MACD:     {pa['macd']}")
            print(f"  SMA:      {pa['sma']}")
            print(f"  Momentum: {pa['momentum']}")
            print(f"  Votes:    {pa['bullish_votes']} bull, {pa['bearish_votes']} bear")
            
            print(f"\nPrice Levels:")
            print(f"  Current: {result['current_price']:.5g}")
            print(f"  Target:  {result['target_price']:.5g}")
            print(f"  Stop:    {result['stop_loss']:.5g}")
            print(f"  Return:  {result['expected_return']:+.2%}")
