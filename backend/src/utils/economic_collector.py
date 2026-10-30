"""
Collect economic calendar context: Fed funds rate, CPI, unemployment,
non-farm payrolls (via FRED), plus known FOMC meeting dates.

IMPORTANT LIMITATION: This does NOT include true "actual vs consensus
forecast" surprise data (the most predictive calendar feature), since
that requires paid data providers. Instead we approximate market-moving
potential via:
  1. Proximity to known/scheduled high-impact events (FOMC, NFP, CPI)
  2. Deviation of actual releases from their own recent trend (a rough
     proxy for "surprising", not a true consensus-based surprise)
"""
import os
import pandas as pd
import numpy as np
from pathlib import Path
from fredapi import Fred


# FOMC meeting dates are published years in advance by the Federal
# Reserve and are public record. This is the actual historical schedule.
FOMC_MEETING_DATES = [
    "2015-01-28", "2015-03-18", "2015-04-29", "2015-06-17", "2015-07-29", "2015-09-17", "2015-10-28", "2015-12-16",
    "2016-01-27", "2016-03-16", "2016-04-27", "2016-06-15", "2016-07-27", "2016-09-21", "2016-11-02", "2016-12-14",
    "2017-02-01", "2017-03-15", "2017-05-03", "2017-06-14", "2017-07-26", "2017-09-20", "2017-11-01", "2017-12-13",
    "2018-01-31", "2018-03-21", "2018-05-02", "2018-06-13", "2018-08-01", "2018-09-26", "2018-11-08", "2018-12-19",
    "2019-01-30", "2019-03-20", "2019-05-01", "2019-06-19", "2019-07-31", "2019-09-18", "2019-10-30", "2019-12-11",
    "2020-01-29", "2020-03-03", "2020-03-15", "2020-04-29", "2020-06-10", "2020-07-29", "2020-09-16", "2020-11-05", "2020-12-16",
    "2021-01-27", "2021-03-17", "2021-04-28", "2021-06-16", "2021-07-28", "2021-09-22", "2021-11-03", "2021-12-15",
    "2022-01-26", "2022-03-16", "2022-05-04", "2022-06-15", "2022-07-27", "2022-09-21", "2022-11-02", "2022-12-14",
    "2023-02-01", "2023-03-22", "2023-05-03", "2023-06-14", "2023-07-26", "2023-09-20", "2023-11-01", "2023-12-13",
    "2024-01-31", "2024-03-20", "2024-05-01", "2024-06-12", "2024-07-31", "2024-09-18", "2024-11-07", "2024-12-18",
    "2025-01-29", "2025-03-19", "2025-05-07", "2025-06-18", "2025-07-30",
]


class EconomicDataCollector:
    def __init__(self, data_path: str = "./data/raw"):
        self.data_path = Path(data_path)
        self.data_path.mkdir(parents=True, exist_ok=True)

        api_key = os.environ.get("FRED_API_KEY")
        if not api_key:
            raise ValueError(
                "FRED_API_KEY environment variable not set. "
                "Get a free key at https://fred.stlouisfed.org/docs/api/api_key.html"
            )
        self.fred = Fred(api_key=api_key)

    def collect_series(self, series_id: str, name: str, start_date: str = "2014-01-01") -> pd.Series:
        """Fetch a single FRED economic data series"""
        print(f"Collecting {name} ({series_id})...")
        try:
            data = self.fred.get_series(series_id, observation_start=start_date)
            print(f"  ✓ {len(data)} observations")
            return data
        except Exception as e:
            print(f"  ✗ Error: {e}")
            return pd.Series(dtype=float)

    def collect_all(self, start_date: str = "2014-01-01") -> pd.DataFrame:
        """
        Collect key economic indicators:
        - FEDFUNDS: Effective Federal Funds Rate (monthly)
        - CPIAUCSL: Consumer Price Index (monthly, drives inflation expectations)
        - UNRATE: Unemployment Rate (monthly)
        - PAYEMS: Total Non-Farm Payrolls (monthly, released first Friday)
        """
        series_map = {
            "FEDFUNDS": "fed_funds_rate",
            "CPIAUCSL": "cpi_index",
            "UNRATE": "unemployment_rate",
            "PAYEMS": "nonfarm_payrolls",
        }

        frames = {}
        for series_id, name in series_map.items():
            data = self.collect_series(series_id, name, start_date=start_date)
            if not data.empty:
                frames[name] = data

        if not frames:
            print("No economic data collected!")
            return pd.DataFrame()

        combined = pd.DataFrame(frames)
        combined.index.name = "date"

        filepath = self.data_path / "economic_historical.csv"
        combined.to_csv(filepath)
        print(f"\n✓ Saved economic data to {filepath} ({len(combined)} rows)")

        # Save FOMC dates separately as a simple reference list
        fomc_df = pd.DataFrame({"date": pd.to_datetime(FOMC_MEETING_DATES)})
        fomc_filepath = self.data_path / "fomc_dates.csv"
        fomc_df.to_csv(fomc_filepath, index=False)
        print(f"✓ Saved {len(fomc_df)} FOMC meeting dates to {fomc_filepath}")

        return combined


if __name__ == "__main__":
    collector = EconomicDataCollector()
    collector.collect_all(start_date="2014-01-01")
