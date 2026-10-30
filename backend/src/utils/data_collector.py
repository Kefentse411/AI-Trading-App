import yfinance as yf
import pandas as pd
from pathlib import Path
import json

class MarketDataCollector:
    def __init__(self, data_path: str = "./data/raw"):
        self.data_path = Path(data_path)
        self.data_path.mkdir(parents=True, exist_ok=True)

    def collect_historical_data(self, symbol: str, period: str = "2y"):
        """Collect historical OHLCV data"""
        print(f"Collecting {period} of {symbol} data...")

        try:
            data = yf.download(
                symbol,
                period=period,
                interval="1d",
                progress=False
            )

            # CHANGED: flatten MultiIndex BEFORE saving, not after
            if isinstance(data.columns, pd.MultiIndex):
                data.columns = data.columns.get_level_values(0)

            filepath = self.data_path / f"{symbol}_historical.csv"
            data.to_csv(filepath)
            print(f"✓ Saved {len(data)} records to {filepath}")

            return data
        except Exception as e:
            print(f"Error: {e}")
            return None

if __name__ == "__main__":
    collector = MarketDataCollector()

    # CHANGED: more symbols for more training diversity
    symbols = ["BTC-USD", "ETH-USD", "SOL-USD", "BNB-USD", "XRP-USD"]
    for symbol in symbols:
        collector.collect_historical_data(symbol, period="2y")
