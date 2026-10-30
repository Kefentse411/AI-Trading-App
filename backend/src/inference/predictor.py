import json
import random
from datetime import datetime
from pathlib import Path

class SimpleTradingPredictor:
    """Simple rule-based predictor for now"""
    
    def predict(self, market_data: dict) -> dict:
        """Make a trading prediction based on simple rules"""
        
        rsi = market_data.get('rsi', 50)
        price = market_data.get('price', 0)
        macd = market_data.get('macd', 'neutral')
        
        # Simple rule-based logic
        if rsi > 70 and macd == 'bullish':
            direction = 'bullish'
            confidence = 0.75
        elif rsi < 30 and macd == 'bearish':
            direction = 'bearish'
            confidence = 0.75
        else:
            direction = 'neutral'
            confidence = 0.55
        
        # Calculate targets
        if direction == 'bullish':
            target = price * 1.03
            stop = price * 0.98
        elif direction == 'bearish':
            target = price * 0.97
            stop = price * 1.02
        else:
            target = price
            stop = price
        
        return {
            "prediction": direction,
            "direction": direction,
            "confidence": confidence,
            "target_price": round(target, 2),
            "stop_loss": round(stop, 2),
            "expected_return": round((target - price) / price if price else 0, 4),
            "timestamp": datetime.now().isoformat()
        }

if __name__ == "__main__":
    predictor = SimpleTradingPredictor()
    
    test_data = {
        "symbol": "BTC/USD",
        "price": 43500,
        "rsi": 65,
        "macd": "bullish",
        "volatility": 0.25
    }
    
    prediction = predictor.predict(test_data)
    print(json.dumps(prediction, indent=2))
