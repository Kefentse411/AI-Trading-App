"""
Feature engineering for Gold/Forex ML model.
PRIMARY model - this is the main focus going forward.

Includes:
- Technical indicators (momentum, volatility, trend, oscillators)
- Macro context (DXY, SPY)
- Interest rate context (regime-robust changes/percentiles, not raw levels)
- Economic calendar context (trend-deviation "surprise" proxies)
"""
import pandas as pd
import numpy as np


def calculate_rsi(prices: pd.Series, period: int = 14) -> pd.Series:
    delta = prices.diff()
    gain = delta.where(delta > 0, 0)
    loss = -delta.where(delta < 0, 0)
    avg_gain = gain.rolling(window=period, min_periods=1).mean()
    avg_loss = loss.rolling(window=period, min_periods=1).mean()
    rs = avg_gain / avg_loss.replace(0, np.nan)
    rsi = 100 - (100 / (1 + rs))
    return rsi.fillna(50)


def calculate_macd(prices: pd.Series, fast: int = 12, slow: int = 26, signal: int = 9):
    ema_fast = prices.ewm(span=fast, adjust=False).mean()
    ema_slow = prices.ewm(span=slow, adjust=False).mean()
    macd_line = ema_fast - ema_slow
    signal_line = macd_line.ewm(span=signal, adjust=False).mean()
    return macd_line, signal_line


def calculate_bollinger_bands(prices: pd.Series, period: int = 20):
    sma = prices.rolling(window=period).mean()
    std = prices.rolling(window=period).std()
    upper = sma + (2 * std)
    lower = sma - (2 * std)
    band_width = (upper - lower).replace(0, np.nan)
    position = (prices - lower) / band_width
    return position, (upper - lower) / sma


def calculate_atr(df: pd.DataFrame, period: int = 14) -> pd.Series:
    high_low = df['High'] - df['Low']
    high_close = (df['High'] - df['Close'].shift()).abs()
    low_close = (df['Low'] - df['Close'].shift()).abs()
    true_range = pd.concat([high_low, high_close, low_close], axis=1).max(axis=1)
    atr = true_range.rolling(window=period).mean()
    return atr / df['Close']


def build_features(df: pd.DataFrame) -> pd.DataFrame:
    """Build technical features from raw OHLC data."""
    data = df.copy()

    data['return_1d'] = data['Close'].pct_change(1)
    data['return_3d'] = data['Close'].pct_change(3)
    data['return_7d'] = data['Close'].pct_change(7)
    data['return_14d'] = data['Close'].pct_change(14)

    data['volatility_7d']  = data['return_1d'].rolling(7).std()
    data['volatility_14d'] = data['return_1d'].rolling(14).std()
    data['volatility_30d'] = data['return_1d'].rolling(30).std()
    data['vol_regime']     = data['volatility_7d'] / data['volatility_30d']

    data['sma_10'] = data['Close'].rolling(10).mean()
    data['sma_30'] = data['Close'].rolling(30).mean()
    data['sma_50'] = data['Close'].rolling(50).mean()
    data['sma_200'] = data['Close'].rolling(200).mean()
    data['sma_ratio_10_30'] = data['sma_10'] / data['sma_30']
    data['sma_ratio_30_50'] = data['sma_30'] / data['sma_50']
    data['sma_ratio_50_200'] = data['sma_50'] / data['sma_200']

    data['rsi_14'] = calculate_rsi(data['Close'], period=14)
    data['rsi_7']  = calculate_rsi(data['Close'], period=7)
    data['rsi_divergence'] = data['rsi_7'] - data['rsi_14']

    macd_line, signal_line = calculate_macd(data['Close'])
    data['macd']        = macd_line / data['Close']
    data['macd_signal'] = signal_line / data['Close']
    data['macd_diff']   = (macd_line - signal_line) / data['Close']

    bb_pos, bb_width = calculate_bollinger_bands(data['Close'])
    data['bb_position'] = bb_pos
    data['bb_width']    = bb_width

    data['atr_14'] = calculate_atr(data, period=14)

    data['high_14d'] = data['High'].rolling(14).max()
    data['low_14d']  = data['Low'].rolling(14).min()
    range_14d = (data['high_14d'] - data['low_14d']).replace(0, np.nan)
    data['price_position'] = (data['Close'] - data['low_14d']) / range_14d
    data['candle_body'] = (data['Close'] - data['Open']) / (
        data['High'] - data['Low']
    ).replace(0, np.nan)

    vol_baseline = data['volatility_14d'].replace(0, np.nan)
    data['return_1d_normalized'] = data['return_1d'] / vol_baseline
    data['return_3d_normalized'] = data['return_3d'] / (vol_baseline * np.sqrt(3))
    data['return_7d_normalized'] = data['return_7d'] / (vol_baseline * np.sqrt(7))

    if hasattr(data.index, 'dayofweek'):
        data['day_of_week'] = data.index.dayofweek / 6.0
    else:
        data['day_of_week'] = 0.0

    return data


def merge_external_data(
    df: pd.DataFrame,
    macro_df: pd.DataFrame = None,
    rates_df: pd.DataFrame = None,
) -> pd.DataFrame:
    """Merge macro context (DXY, SPY) and interest rate data."""
    data = df.copy()

    if macro_df is not None and not macro_df.empty:
        macro_aligned = macro_df.reindex(data.index, method='ffill')
        for col in macro_aligned.columns:
            data[col] = macro_aligned[col]

        if 'DXY_close' in data.columns:
            data['dxy_return_7d'] = data['DXY_close'].pct_change(7)
            data['dxy_return_14d'] = data['DXY_close'].pct_change(14)
        else:
            data['dxy_return_7d'] = 0.0
            data['dxy_return_14d'] = 0.0

        if 'SPY_close' in data.columns:
            data['spy_return_7d'] = data['SPY_close'].pct_change(7)
        else:
            data['spy_return_7d'] = 0.0
    else:
        data['dxy_return_7d'] = 0.0
        data['dxy_return_14d'] = 0.0
        data['spy_return_7d'] = 0.0

    if rates_df is not None and not rates_df.empty:
        rates_aligned = rates_df.reindex(data.index, method='ffill')

        if 'US10Y_yield' in rates_aligned.columns:
            us10y = rates_aligned['US10Y_yield']
            data['us10y_change_7d'] = us10y.diff(7)
            data['us10y_change_30d'] = us10y.diff(30)
            data['us10y_percentile'] = us10y.rolling(252, min_periods=60).rank(pct=True)
        else:
            data['us10y_change_7d'] = 0.0
            data['us10y_change_30d'] = 0.0
            data['us10y_percentile'] = 0.5

        if 'US3M_yield' in rates_aligned.columns:
            us3m = rates_aligned['US3M_yield']
            data['us3m_change_7d'] = us3m.diff(7)
        else:
            data['us3m_change_7d'] = 0.0

        if 'US10Y_yield' in rates_aligned.columns and 'US3M_yield' in rates_aligned.columns:
            slope = rates_aligned['US10Y_yield'] - rates_aligned['US3M_yield']
            data['yield_curve_slope'] = slope
            data['yield_curve_change_7d'] = slope.diff(7)
        else:
            data['yield_curve_slope'] = 0.0
            data['yield_curve_change_7d'] = 0.0
    else:
        data['us10y_change_7d'] = 0.0
        data['us10y_change_30d'] = 0.0
        data['us10y_percentile'] = 0.5
        data['us3m_change_7d'] = 0.0
        data['yield_curve_slope'] = 0.0
        data['yield_curve_change_7d'] = 0.0

    return data


def merge_economic_calendar(
    df: pd.DataFrame,
    economic_df: pd.DataFrame = None,
    fomc_dates: pd.DatetimeIndex = None,
) -> pd.DataFrame:
    """
    Merge economic trend-deviation proxies (approximate 'surprise' signal).

    NOTE: Proximity/flag features (days to FOMC, NFP calendar windows)
    were tested and removed - they added noise and cost training rows
    without improving accuracy. Only the trend-deviation proxies showed
    genuine signal (cpi_surprise_proxy ranked in the top 5 features).
    """
    data = df.copy()

    if economic_df is not None and not economic_df.empty:
        econ_aligned = economic_df.reindex(data.index, method='ffill')

        if 'fed_funds_rate' in econ_aligned.columns:
            data['fed_funds_rate_change'] = econ_aligned['fed_funds_rate'].diff(30)
        else:
            data['fed_funds_rate_change'] = 0.0

        if 'cpi_index' in econ_aligned.columns:
            cpi = econ_aligned['cpi_index']
            cpi_yoy = cpi.pct_change(365, fill_method=None) * 100
            cpi_trend = cpi_yoy.rolling(180, min_periods=30).mean()
            data['cpi_yoy'] = cpi_yoy
            data['cpi_surprise_proxy'] = cpi_yoy - cpi_trend
        else:
            data['cpi_yoy'] = 0.0
            data['cpi_surprise_proxy'] = 0.0

        if 'unemployment_rate' in econ_aligned.columns:
            unemp = econ_aligned['unemployment_rate']
            data['unemployment_change'] = unemp.diff(30)
        else:
            data['unemployment_change'] = 0.0

        if 'nonfarm_payrolls' in econ_aligned.columns:
            nfp = econ_aligned['nonfarm_payrolls']
            nfp_change = nfp.diff(1)
            nfp_trend = nfp_change.rolling(6, min_periods=2).mean()
            data['nfp_surprise_proxy'] = nfp_change - nfp_trend
        else:
            data['nfp_surprise_proxy'] = 0.0
    else:
        data['fed_funds_rate_change'] = 0.0
        data['cpi_yoy'] = 0.0
        data['cpi_surprise_proxy'] = 0.0
        data['unemployment_change'] = 0.0
        data['nfp_surprise_proxy'] = 0.0

    return data


def create_labels(df: pd.DataFrame, horizon: int = 3, vol_multiplier: float = 0.5) -> pd.Series:
    """Volatility-adjusted labels."""
    future_return = df['Close'].shift(-horizon) / df['Close'] - 1
    vol_14d = df['Close'].pct_change().rolling(14).std()
    dynamic_threshold = vol_14d * np.sqrt(horizon) * vol_multiplier

    labels = pd.Series(0, index=df.index)
    labels[future_return >  dynamic_threshold] =  1
    labels[future_return < -dynamic_threshold] = -1

    return labels


TECHNICAL_FEATURES = [
    'return_1d', 'return_3d', 'return_7d', 'return_14d',
    'return_1d_normalized', 'return_3d_normalized', 'return_7d_normalized',
    'volatility_7d', 'volatility_14d', 'volatility_30d', 'vol_regime',
    'sma_ratio_10_30', 'sma_ratio_30_50', 'sma_ratio_50_200',
    'rsi_14', 'rsi_7', 'rsi_divergence',
    'macd', 'macd_signal', 'macd_diff',
    'bb_position', 'bb_width',
    'atr_14',
    'price_position', 'candle_body',
    'day_of_week',
]

MACRO_FEATURES = [
    'dxy_return_7d', 'dxy_return_14d', 'spy_return_7d',
    'us10y_change_7d', 'us10y_change_30d', 'us10y_percentile',
    'us3m_change_7d', 'yield_curve_slope', 'yield_curve_change_7d',
]

# Pruned to only the calendar-derived features that showed real signal
# in testing. Proximity/flag features (days_to_fomc, etc.) added noise
# and cost training rows without improving accuracy - removed.
# Trend-deviation proxies kept since cpi_surprise_proxy ranked highly.
CALENDAR_FEATURES = [
    'fed_funds_rate_change', 'cpi_yoy', 'cpi_surprise_proxy',
    'unemployment_change', 'nfp_surprise_proxy',
]

# CALENDAR_FEATURES tested and found roughly neutral-to-negative:
# cost ~1,588 training rows (365-day CPI YoY lookback) for no net
# accuracy or precision gain over macro+rates alone. Kept defined
# above for future use if true consensus-surprise data becomes
# available, but excluded from the active feature set for now.
EXTERNAL_FEATURES = MACRO_FEATURES

FEATURE_COLUMNS = TECHNICAL_FEATURES + EXTERNAL_FEATURES
