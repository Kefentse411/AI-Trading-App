"""
Collect historical data for Gold, major forex pairs, and Treasury yields.
This is the PRIMARY data collector going forward.
"""
import yfinance as yf
import pandas as pd
from pathlib import Path


class ForexDataCollector:
    def __init__(self, data_path: str = "./data/raw"):
        self.data_path = Path(data_path)
        self.data_path.mkdir(parents=True, exist_ok=True)

    def collect_instrument(self, symbol: str, ticker: str, period: str = "10y") -> pd.DataFrame:
        """Collect OHLCV for a single instrument"""
        print(f"Collecting {symbol} ({ticker})...")
        try:
            data = yf.download(ticker, period=period, interval="1d", progress=False)

            if isinstance(data.columns, pd.MultiIndex):
                data.columns = data.columns.get_level_values(0)

            if data.empty:
                print(f"  ⚠ No data returned for {ticker}")
                return pd.DataFrame()

            filepath = self.data_path / f"{symbol}_historical.csv"
            data.to_csv(filepath)
            print(f"  ✓ Saved {len(data)} records "
                  f"({data.index.min().date()} to {data.index.max().date()})")
            return data
        except Exception as e:
            print(f"  ✗ Error: {e}")
            return pd.DataFrame()

    def collect_rates(self, period: str = "10y") -> pd.DataFrame:
        """
        Collect Treasury yield data for real-yield calculations.
        ^TNX = 10-year yield, ^IRX = 13-week (3-month) yield
        Note: yfinance reports these as (yield * 10), e.g. 45.0 = 4.5%
        """
        tickers = {"US10Y": "^TNX", "US3M": "^IRX"}
        frames = {}

        for name, ticker in tickers.items():
            print(f"Collecting {name} ({ticker})...")
            try:
                data = yf.download(ticker, period=period, interval="1d", progress=False)
                if isinstance(data.columns, pd.MultiIndex):
                    data.columns = data.columns.get_level_values(0)
                if not data.empty:
                    frames[name] = data['Close'] / 10.0  # convert to actual %
                    print(f"  ✓ {len(data)} records")
            except Exception as e:
                print(f"  ✗ Error fetching {ticker}: {e}")

        if not frames:
            return pd.DataFrame()

        combined = pd.DataFrame(frames)
        combined.columns = [f"{c}_yield" for c in combined.columns]
        filepath = self.data_path / "rates_historical.csv"
        combined.to_csv(filepath)
        print(f"✓ Saved rates data to {filepath} ({len(combined)} rows)")
        return combined

    def collect_all(self, period: str = "10y"):
        """Collect Gold, major forex pairs, DXY, SPY, and rates"""

        # Primary instruments — Gold first, forex pairs follow
        instruments = {
            "XAUUSD": "GC=F",       # Gold futures (primary focus)
            "EURUSD": "EURUSD=X",
            "GBPUSD": "GBPUSD=X",
            "USDJPY": "USDJPY=X",
            "AUDUSD": "AUDUSD=X",
            "USDCAD": "USDCAD=X",
        }

        for symbol, ticker in instruments.items():
            self.collect_instrument(symbol, ticker, period=period)

        # Macro context (reused from crypto pipeline, longer period)
        macro_instruments = {
            "DXY": "DX-Y.NYB",
            "SPY": "SPY",
        }
        macro_frames = {}
        for name, ticker in macro_instruments.items():
            print(f"Collecting {name} ({ticker})...")
            try:
                data = yf.download(ticker, period=period, interval="1d", progress=False)
                if isinstance(data.columns, pd.MultiIndex):
                    data.columns = data.columns.get_level_values(0)
                if not data.empty:
                    macro_frames[name] = data['Close']
                    print(f"  ✓ {len(data)} records")
            except Exception as e:
                print(f"  ✗ Error: {e}")

        if macro_frames:
            macro_df = pd.DataFrame(macro_frames)
            macro_df.columns = [f"{c}_close" for c in macro_df.columns]
            filepath = self.data_path / "macro_historical.csv"
            macro_df.to_csv(filepath)
            print(f"✓ Saved macro data to {filepath} ({len(macro_df)} rows)")

        # Interest rates
        self.collect_rates(period=period)


if __name__ == "__main__":
    collector = ForexDataCollector()
    collector.collect_all(period="10y")
