"""
Trend Following Strategy — Moving Average Crossover.
A real, backtestable technical strategy, independent of the ML models.
"""
import pandas as pd
import numpy as np
import yfinance as yf

# Maps friendly forex names (matching the ML ensemble's /predict/forex/{symbol}
# naming) to yfinance tickers. "gold" -> GLD to match the same underlying
# instrument the ML ensemble uses (per /model/info's instrument list), not
# a futures ticker — keeps both strategies referencing the same price series.
# NOTE: EURUSD/GBPUSD/etc use yfinance's standard "=X" spot syntax; this has
# not been verified against whatever data source the ML ensemble itself uses
# internally for those pairs, so the two signals could theoretically be
# tracking slightly different feeds even under the same symbol name.
FOREX_SYMBOL_MAP = {
    "gold": "GLD",
    "eurusd": "EURUSD=X",
    "gbpusd": "GBPUSD=X",
    "usdjpy": "USDJPY=X",
    "audusd": "AUDUSD=X",
    "usdcad": "USDCAD=X",
}


def resolve_ticker(symbol: str) -> str:
    """
    Resolves a user-facing symbol into a real yfinance ticker.
    Known forex friendly-names route through FOREX_SYMBOL_MAP;
    anything else (crypto, stocks) is assumed to already be a
    valid yfinance ticker and is just uppercased.
    """
    key = symbol.lower()
    if key in FOREX_SYMBOL_MAP:
        return FOREX_SYMBOL_MAP[key]
    return symbol.upper()


def calculate_smas(df: pd.DataFrame, fast: int = 20, slow: int = 50) -> pd.DataFrame:
    data = df.copy()
    data['sma_fast'] = data['Close'].rolling(window=fast).mean()
    data['sma_slow'] = data['Close'].rolling(window=slow).mean()
    return data


def generate_positions(df: pd.DataFrame) -> pd.DataFrame:
    """
    Long when fast SMA > slow SMA, short when fast < slow.
    Position is lagged by one day to avoid lookahead bias
    (today's stance is based on yesterday's crossover state).
    """
    data = df.copy()
    data['stance'] = np.where(data['sma_fast'] > data['sma_slow'], 1, -1)
    data.loc[data['sma_fast'].isna() | data['sma_slow'].isna(), 'stance'] = 0
    data['position'] = data['stance'].shift(1).fillna(0)
    return data


def _empty_backtest_result() -> dict:
    """Schema-consistent placeholder for when there's not enough data to backtest."""
    return {
        "error": "Not enough data to backtest",
        "num_trades": 0,
        "win_rate": 0.0,
        "total_return": 0.0,
        "buy_hold_return": 0.0,
        "sharpe_ratio": 0.0,
        "max_drawdown": 0.0,
        "trades": [],
    }


def backtest(df: pd.DataFrame, fast: int = 20, slow: int = 50) -> dict:
    """Runs the strategy over historical data and computes real performance metrics."""
    data = calculate_smas(df, fast, slow)
    data = generate_positions(data)

    data['daily_return'] = data['Close'].pct_change()
    data['strategy_return'] = data['position'] * data['daily_return']
    data = data.dropna(subset=['strategy_return'])

    if len(data) == 0:
        return _empty_backtest_result()

    data['position_change'] = data['position'].diff().fillna(0) != 0
    trade_id = data['position_change'].cumsum()

    trades = []
    for tid, group in data.groupby(trade_id):
        pos = group['position'].iloc[0]
        if pos == 0:
            continue
        trade_return = float((1 + group['strategy_return']).prod() - 1)
        trades.append({
            "direction": "long" if pos == 1 else "short",
            "start": str(group.index[0].date()),
            "end": str(group.index[-1].date()),
            "return": round(trade_return, 4),
            "won": trade_return > 0,
        })

    num_trades = len(trades)
    wins = sum(1 for t in trades if t["won"])
    win_rate = (wins / num_trades) if num_trades > 0 else 0.0
    total_return = float((1 + data['strategy_return']).prod() - 1)
    buy_hold_return = float((data['Close'].iloc[-1] / data['Close'].iloc[0]) - 1)

    # Sharpe ratio: assumes 0% risk-free rate and annualizes using 252 trading
    # days. This is a standard approximation for equities/forex; it slightly
    # understates crypto's actual annualized volatility since crypto trades
    # 365 days/year, not 252. Treat as directionally useful, not precise.
    daily_std = data['strategy_return'].std()
    sharpe_ratio = float(data['strategy_return'].mean() / daily_std * np.sqrt(252)) if daily_std > 0 else 0.0

    cum_returns = (1 + data['strategy_return']).cumprod()
    running_max = cum_returns.cummax()
    drawdown = (cum_returns / running_max) - 1
    max_drawdown = float(drawdown.min())

    return {
        "num_trades": num_trades,
        "win_rate": round(win_rate, 4),
        "total_return": round(total_return, 4),
        "buy_hold_return": round(buy_hold_return, 4),
        "sharpe_ratio": round(sharpe_ratio, 3),
        "max_drawdown": round(max_drawdown, 4),
        "trades": trades[-10:],
        "period_start": str(data.index[0].date()),
        "period_end": str(data.index[-1].date()),
    }


def get_live_signal(symbol: str, fast: int = 20, slow: int = 50, period: str = "2y") -> dict:
    """Fetches recent data, computes the current crossover stance, and backtests the same window."""
    try:
        ticker = resolve_ticker(symbol)
        raw = yf.download(ticker, period=period, interval="1d", progress=False, auto_adjust=True)
        if isinstance(raw.columns, pd.MultiIndex):
            raw.columns = raw.columns.get_level_values(0)

        if raw.empty:
            return {"error": f"No data available for {symbol} (resolved ticker: {ticker})"}

        data = generate_positions(calculate_smas(raw, fast, slow))
        latest = data.iloc[-1]
        stance = latest['stance']
        direction = "bullish" if stance == 1 else "bearish" if stance == -1 else "neutral"

        return {
            "symbol": symbol.upper(),
            "resolved_ticker": ticker,
            "strategy": "trend_following_ma",
            "direction": direction,
            "current_price": round(float(latest['Close']), 4),
            "sma_fast": round(float(latest['sma_fast']), 4) if not pd.isna(latest['sma_fast']) else None,
            "sma_slow": round(float(latest['sma_slow']), 4) if not pd.isna(latest['sma_slow']) else None,
            "fast_period": fast,
            "slow_period": slow,
            "backtest": backtest(raw, fast, slow),
        }
    except Exception as e:
        import traceback
        return {"error": str(e), "traceback": traceback.format_exc()}


if __name__ == "__main__":
    import json
    for symbol in ["BTC-USD", "ETH-USD", "SOL-USD", "gold", "eurusd", "gbpusd"]:
        print(f"\n── {symbol} ──")
        print(json.dumps(get_live_signal(symbol), indent=2, default=str))