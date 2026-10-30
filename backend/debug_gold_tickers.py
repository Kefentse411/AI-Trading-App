"""Find the right gold ticker that gives current spot prices."""
import yfinance as yf
import pandas as pd

tickers_to_test = {
    "GC=F (front month futures)": "GC=F",
    "GLD (ETF, tracks spot)": "GLD", 
    "IAU (ETF, tracks spot)": "IAU",
    "XAUUSD=X (spot)": "XAUUSD=X",
    "GCQ25.CMX (Aug 2025 contract)": "GCQ25.CMX",
}

for name, ticker in tickers_to_test.items():
    try:
        data = yf.download(ticker, period="5d", interval="1d", progress=False)
        if isinstance(data.columns, pd.MultiIndex):
            data.columns = data.columns.get_level_values(0)
        if not data.empty:
            latest_close = float(data['Close'].iloc[-1])
            latest_date = data.index[-1].date()
            print(f"{name}")
            print(f"  Latest: {latest_date}, Close: {latest_close:.4f}")
        else:
            print(f"{name}: NO DATA")
    except Exception as e:
        print(f"{name}: ERROR - {e}")

