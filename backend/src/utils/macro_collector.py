"""
Collect macro/cross-asset data: dollar index, S&P 500, gold.
Uses a longer period than the crypto data to ensure full overlap
after date alignment (prevents truncating crypto training rows).
"""
import yfinance as yf
import pandas as pd
from pathlib import Path


class MacroDataCollector:
    def __init__(self, data_path: str = "./data/raw"):
        self.data_path = Path(data_path)
        self.data_path.mkdir(parents=True, exist_ok=True)

    def collect(self, period: str = "5y") -> pd.DataFrame:
        """Collect DXY, SPY, Gold and merge into a single dataframe.
        CHANGED: default period bumped 2y -> 5y so macro history starts
        well before crypto history, avoiding row loss during merge.
        """
        tickers = {
            "DXY": "DX-Y.NYB",
            "SPY": "SPY",
            "GOLD": "GC=F",
        }

        frames = {}
        for name, ticker in tickers.items():
            print(f"Collecting {name} ({ticker})...")
            try:
                data = yf.download(ticker, period=period, interval="1d", progress=False)
                if isinstance(data.columns, pd.MultiIndex):
                    data.columns = data.columns.get_level_values(0)

                if data.empty or 'Close' not in data.columns:
                    print(f"  ⚠ No data returned for {ticker}, skipping")
                    continue

                frames[name] = data['Close']
                print(f"  ✓ {len(data)} records, from {data.index.min().date()} to {data.index.max().date()}")
            except Exception as e:
                print(f"  ✗ Error fetching {ticker}: {e}")

        if not frames:
            print("No macro data collected!")
            return pd.DataFrame()

        combined = pd.DataFrame(frames)
        combined.columns = [f"{c}_close" for c in combined.columns]

        filepath = self.data_path / "macro_historical.csv"
        combined.to_csv(filepath)
        print(f"\n✓ Saved macro data to {filepath} ({len(combined)} rows)")
        return combined


if __name__ == "__main__":
    collector = MacroDataCollector()
    collector.collect(period="5y")
