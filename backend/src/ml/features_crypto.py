"""
Feature engineering for trading ML model.
Combines technical indicators with macro/sentiment context.
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
    """
    Build TECHNICAL features from raw OHLCV dataframe.
    Expects columns: Open, High, Low, Close, Volume
    """
    data = df.copy()

    # ── Momentum / Returns ────────────────────────────────────────────────────
    data['return_1d'] = data['Close'].pct_change(1)
    data['return_3d'] = data['Close'].pct_change(3)
    data['return_7d'] = data['Close'].pct_change(7)
    data['return_14d'] = data['Close'].pct_change(14)

    # ── Volatility ────────────────────────────────────────────────────────────
    data['volatility_7d']  = data['return_1d'].rolling(7).std()
    data['volatility_14d'] = data['return_1d'].rolling(14).std()
    data['volatility_30d'] = data['return_1d'].rolling(30).std()
    data['vol_regime']     = data['volatility_7d'] / data['volatility_30d']

    # ── Trend ─────────────────────────────────────────────────────────────────
    data['sma_10'] = data['Close'].rolling(10).mean()
    data['sma_30'] = data['Close'].rolling(30).mean()
    data['sma_50'] = data['Close'].rolling(50).mean()
    data['sma_ratio_10_30'] = data['sma_10'] / data['sma_30']
    data['sma_ratio_30_50'] = data['sma_30'] / data['sma_50']

    # ── Oscillators ───────────────────────────────────────────────────────────
    data['rsi_14'] = calculate_rsi(data['Close'], period=14)
    data['rsi_7']  = calculate_rsi(data['Close'], period=7)
    data['rsi_divergence'] = data['rsi_7'] - data['rsi_14']

    macd_line, signal_line = calculate_macd(data['Close'])
    data['macd']        = macd_line / data['Close']
    data['macd_signal'] = signal_line / data['Close']
    data['macd_diff']   = (macd_line - signal_line) / data['Close']

    # ── Bollinger Bands ───────────────────────────────────────────────────────
    bb_pos, bb_width = calculate_bollinger_bands(data['Close'])
    data['bb_position'] = bb_pos
    data['bb_width']    = bb_width

    # ── ATR ───────────────────────────────────────────────────────────────────
    data['atr_14'] = calculate_atr(data, period=14)

    # ── Volume ────────────────────────────────────────────────────────────────
    data['volume_change']      = data['Volume'].pct_change()
    data['volume_ma_ratio']    = data['Volume'] / data['Volume'].rolling(10).mean()
    data['volume_price_trend'] = data['volume_ma_ratio'] * data['return_1d'].apply(np.sign)

    # ── Price structure ───────────────────────────────────────────────────────
    data['high_14d'] = data['High'].rolling(14).max()
    data['low_14d']  = data['Low'].rolling(14).min()
    range_14d = (data['high_14d'] - data['low_14d']).replace(0, np.nan)
    data['price_position'] = (data['Close'] - data['low_14d']) / range_14d
    data['candle_body'] = (data['Close'] - data['Open']) / (
        data['High'] - data['Low']
    ).replace(0, np.nan)

    # ── Volatility-normalized returns ─────────────────────────────────────────
    vol_baseline = data['volatility_14d'].replace(0, np.nan)
    data['return_1d_normalized'] = data['return_1d'] / vol_baseline
    data['return_3d_normalized'] = data['return_3d'] / (vol_baseline * np.sqrt(3))
    data['return_7d_normalized'] = data['return_7d'] / (vol_baseline * np.sqrt(7))

    # ── Time ──────────────────────────────────────────────────────────────────
    if hasattr(data.index, 'dayofweek'):
        data['day_of_week'] = data.index.dayofweek / 6.0
    else:
        data['day_of_week'] = 0.0

    return data


def merge_external_data(
    df: pd.DataFrame,
    macro_df: pd.DataFrame = None,
    sentiment_df: pd.DataFrame = None,
) -> pd.DataFrame:
    """
    Merge macro/sentiment context onto the technical feature dataframe.
    Must be called AFTER build_features() since it uses return_7d.

    Uses forward-fill alignment since traditional markets (SPY, DXY, Gold)
    don't trade on weekends/holidays but crypto does.
    """
    data = df.copy()

    # ── Macro context ─────────────────────────────────────────────────────────
    if macro_df is not None and not macro_df.empty:
        macro_aligned = macro_df.reindex(data.index, method='ffill')

        for col in macro_aligned.columns:
            data[col] = macro_aligned[col]

        if 'DXY_close' in data.columns:
            data['dxy_return_7d'] = data['DXY_close'].pct_change(7)
        else:
            data['dxy_return_7d'] = 0.0

        if 'SPY_close' in data.columns:
            data['spy_return_7d'] = data['SPY_close'].pct_change(7)
            # Rolling correlation: is crypto moving with or against equities?
            data['crypto_spy_corr'] = data['return_7d'].rolling(14).corr(data['spy_return_7d'])
        else:
            data['spy_return_7d'] = 0.0
            data['crypto_spy_corr'] = 0.0

        if 'GOLD_close' in data.columns:
            data['gold_return_7d'] = data['GOLD_close'].pct_change(7)
        else:
            data['gold_return_7d'] = 0.0
    else:
        data['dxy_return_7d'] = 0.0
        data['spy_return_7d'] = 0.0
        data['gold_return_7d'] = 0.0
        data['crypto_spy_corr'] = 0.0

    # ── Sentiment context ─────────────────────────────────────────────────────
    if sentiment_df is not None and not sentiment_df.empty:
        sentiment_aligned = sentiment_df.reindex(data.index, method='ffill')
        data['fear_greed_value'] = sentiment_aligned['fear_greed_value']
        data['fear_greed_change_3d'] = data['fear_greed_value'].diff(3)
        # Extreme readings are often contrarian signals
        data['fear_greed_extreme'] = (
            (data['fear_greed_value'] < 20) | (data['fear_greed_value'] > 80)
        ).astype(float)
    else:
        data['fear_greed_value'] = 50.0
        data['fear_greed_change_3d'] = 0.0
        data['fear_greed_extreme'] = 0.0

    return data


def create_labels(df: pd.DataFrame, horizon: int = 3, vol_multiplier: float = 0.5) -> pd.Series:
    """
    Volatility-adjusted labels.
    A move must exceed (vol * sqrt(horizon) * vol_multiplier) to be directional.
    """
    future_return = df['Close'].shift(-horizon) / df['Close'] - 1
    vol_14d = df['Close'].pct_change().rolling(14).std()
    dynamic_threshold = vol_14d * np.sqrt(horizon) * vol_multiplier

    labels = pd.Series(0, index=df.index)
    labels[future_return >  dynamic_threshold] =  1
    labels[future_return < -dynamic_threshold] = -1

    return labels


# Technical features (always available)
TECHNICAL_FEATURES = [
    'return_1d', 'return_3d', 'return_7d', 'return_14d',
    'return_1d_normalized', 'return_3d_normalized', 'return_7d_normalized',
    'volatility_7d', 'volatility_14d', 'volatility_30d', 'vol_regime',
    'sma_ratio_10_30', 'sma_ratio_30_50',
    'rsi_14', 'rsi_7', 'rsi_divergence',
    'macd', 'macd_signal', 'macd_diff',
    'bb_position', 'bb_width',
    'atr_14',
    'volume_change', 'volume_ma_ratio', 'volume_price_trend',
    'price_position', 'candle_body',
    'day_of_week',
]

# External features (macro + sentiment)
EXTERNAL_FEATURES = [
    'dxy_return_7d', 'spy_return_7d', 'gold_return_7d', 'crypto_spy_corr',
    'fear_greed_value', 'fear_greed_change_3d', 'fear_greed_extreme',
]

FEATURE_COLUMNS = TECHNICAL_FEATURES + EXTERNAL_FEATURES
