"""
Collect the Crypto Fear & Greed Index historical data.
Free public API, no key required.
"""
import requests
import pandas as pd
from pathlib import Path
from datetime import datetime


class SentimentDataCollector:
    def __init__(self, data_path: str = "./data/raw"):
        self.data_path = Path(data_path)
        self.data_path.mkdir(parents=True, exist_ok=True)

    def collect(self, limit: int = 0) -> pd.DataFrame:
        """
        Collect Fear & Greed Index history.
        limit=0 means "all available history" (goes back to ~2018)
        """
        url = f"https://api.alternative.me/fng/?limit={limit}&format=json"
        print("Collecting Fear & Greed Index history...")

        try:
            response = requests.get(url, timeout=15)
            response.raise_for_status()
            data = response.json()['data']
        except Exception as e:
            print(f"✗ Error fetching Fear & Greed data: {e}")
            return pd.DataFrame()

        records = []
        for entry in data:
            records.append({
                'date': datetime.fromtimestamp(int(entry['timestamp'])).date(),
                'fear_greed_value': int(entry['value']),
            })

        df = pd.DataFrame(records)
        df['date'] = pd.to_datetime(df['date'])
        df = df.set_index('date').sort_index()

        filepath = self.data_path / "fear_greed_historical.csv"
        df.to_csv(filepath)
        print(f"✓ Saved {len(df)} days of Fear & Greed data to {filepath}")
        return df


if __name__ == "__main__":
    collector = SentimentDataCollector()
    collector.collect(limit=0)
