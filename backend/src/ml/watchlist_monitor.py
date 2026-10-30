"""
Watchlist monitor - tracks instruments in transition and alerts on breakouts.
Waits for price action to confirm direction before signaling.
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

import json
from datetime import datetime
import pandas as pd
import yfinance as yf

from src.ml.ensemble_predictor import EnsemblePredictor

class WatchlistMonitor:
    """
    Monitor instruments for trading setups.
    - CONFLICTED: Mixed signals (no trade)
    - BUILDING: Consensus forming (watch closely)
    - READY: Strong consensus (ready to trade)
    """
    
    STATUS_MAP = {
        "conflicted": {
            "color": "⚪",
            "message": "Mixed signals - wait for clarity",
            "action": "WATCH",
        },
        "building": {
            "color": "🟡",
            "message": "Consensus forming - monitor next candle",
            "action": "PREPARE",
        },
        "ready": {
            "color": "🟢",
            "message": "Strong consensus - ready to trade",
            "action": "TRADE",
        },
    }
    
    def __init__(self):
        self.predictor = EnsemblePredictor(risk_mode="balanced")
        self.symbols = {
            "gold": "GLD",
            "eurusd": "EURUSD=X",
            "gbpusd": "GBPUSD=X",
            "usdjpy": "USDJPY=X",
	    "audusd": "AUDUSD=X",
            "usdcad": "USDCAD=X",
        }
    
    def _classify_status(self, result):
        """
        Classify instrument readiness based on signal consensus.
        """
        if result.get("ensemble_prediction") == "neutral":
            # Check how conflicted the signals are
            pa = result.get("price_action_checks", {})
            bull_votes = pa.get("bullish_votes", 0)
            bear_votes = pa.get("bearish_votes", 0)
            
            if bull_votes + bear_votes >= 3:
                # Multiple signals but mixed → conflicted
                return "conflicted"
            elif bull_votes + bear_votes >= 2:
                # Some consensus forming
                return "building"
            else:
                return "conflicted"
        else:
            # Actual signal generated
            return "ready"
    
    def _get_setup_type(self, result):
        """
        Identify the type of setup forming.
        """
        pa = result.get("price_action_checks", {})
        pred = result.get("ensemble_prediction", "neutral")
        
        # Mean reversion (overbought/oversold)
        if "overbought" in pa.get("rsi", ""):
            return "mean_reversion_bearish"
        elif "oversold" in pa.get("rsi", ""):
            return "mean_reversion_bullish"
        
        # Trend breakout (multiple confirmations)
        bull_votes = pa.get("bullish_votes", 0)
        bear_votes = pa.get("bearish_votes", 0)
        if bull_votes >= 2:
            return "breakout_bullish"
        elif bear_votes >= 2:
            return "breakout_bearish"
        
        return "uncertain"
    
    def scan(self):
        """
        Scan all instruments and return watchlist.
        """
        print(f"\n{'='*90}")
        print(f"WATCHLIST MONITOR - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"{'='*90}\n")
        
        watchlist = {
            "ready": [],      # Ready to trade
            "building": [],   # Watch closely
            "conflicted": [], # Mixed signals
        }
        
        for symbol_name, ticker in self.symbols.items():
            result = self.predictor.predict_ensemble(symbol_name)
            
            if "error" in result and result["error"]:
                continue
            
            status = self._classify_status(result)
            setup_type = self._get_setup_type(result)
            
            watchlist_entry = {
                "symbol": symbol_name.upper(),
                "ticker": ticker,
                "status": status,
                "setup_type": setup_type,
                "current_price": result["current_price"],
                "ml_prediction": result["prediction"],
                "ensemble_prediction": result["ensemble_prediction"],
                "ml_confidence": result["confidence"],
                "ensemble_confidence": result["ensemble_confidence"],
                "signal_source": result.get("signal_source", "N/A"),
                "position_size": result["suggested_position_size"],
                "price_action": {
                    "rsi": result["price_action_checks"]["rsi"],
                    "macd": result["price_action_checks"]["macd"],
                    "sma": result["price_action_checks"]["sma"],
                    "momentum": result["price_action_checks"]["momentum"],
                },
                "target": result["target_price"],
                "stop": result["stop_loss"],
                "expected_return": result["expected_return"],
            }
            
            watchlist[status].append(watchlist_entry)
        
        # ── Display by status ─────────────────────────────────────────────────
        for status_key in ["ready", "building", "conflicted"]:
            status_info = self.STATUS_MAP[status_key]
            entries = watchlist[status_key]
            
            if not entries:
                continue
            
            print(f"{status_info['color']}  {status_key.upper():12s} - {status_info['message']}")
            print(f"{'─'*90}")
            
            for entry in entries:
                symbol = entry["symbol"]
                setup = entry["setup_type"]
                pred = entry["ensemble_prediction"]
                conf = entry["ensemble_confidence"]
                ret = entry["expected_return"]
                
                print(f"  {symbol:10s} | Setup: {setup:25s} | Pred: {pred:8s} "
                      f"({conf:.0%}) | Return: {ret:+.2%}")
                
                # Price action details
                pa = entry["price_action"]
                print(f"    └─ {pa['rsi']:30s} | {pa['macd']:30s}")
                print(f"    └─ {pa['sma']:30s} | {pa['momentum']:30s}")
                print(f"    └─ Levels: Entry {entry['current_price']:.5g} "
                      f"→ TP {entry['target']:.5g} | SL {entry['stop']:.5g}\n")
        
        # ── Summary ───────────────────────────────────────────────────────────
        print(f"\n{'='*90}")
        print(f"SUMMARY")
        print(f"{'='*90}")
        print(f"Ready to trade:  {len(watchlist['ready'])} instruments")
        print(f"Building setup:  {len(watchlist['building'])} instruments")
        print(f"Conflicted:      {len(watchlist['conflicted'])} instruments")
        
        total = sum(len(v) for v in watchlist.values())
        print(f"Total monitored: {total}")
        
        if watchlist["ready"]:
            print(f"\n🟢 TRADE NOW (high confidence):")
            for entry in watchlist["ready"]:
                print(f"   - {entry['symbol']}: {entry['ensemble_prediction'].upper()}")
        
        if watchlist["building"]:
            print(f"\n🟡 WATCH NEXT CANDLE (consensus forming):")
            for entry in watchlist["building"]:
                print(f"   - {entry['symbol']}: {entry['setup_type']}")
        
        return watchlist


if __name__ == "__main__":
    monitor = WatchlistMonitor()
    monitor.scan()
