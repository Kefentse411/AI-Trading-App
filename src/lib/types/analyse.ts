export type ForexSymbol = "gold" | "eurusd" | "gbpusd" | "usdjpy" | "audusd" | "usdcad";
export type Timeframe = "15m" | "1h" | "4h" | "1d" | "1wk";
export type Direction = "bullish" | "bearish" | "neutral";

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface CandlesResponse {
  symbol: string;
  ticker: string;
  timeframe: string;
  candles: Candle[];
}

export interface PriceActionChecks {
  rsi: string;
  macd: string;
  sma: string;
  momentum: string;
  bullish_votes: number;
  bearish_votes: number;
}

export interface ForexPrediction {
  symbol: string;
  ticker: string;
  prediction: Direction;
  raw_prediction: Direction;
  signal_strength: string;
  filter_reason: string | null;
  confidence: number;
  specialist_prob: number;
  current_price: number;
  target_price: number;
  stop_loss: number;
  expected_return: number;
  probabilities: { bearish: number; neutral: number; bullish: number };
  ensemble_prediction: Direction;
  ensemble_confidence: number;
  signal_source: string;
  price_action_checks: PriceActionChecks;
  model_info: {
    cv_accuracy: number;
    bull_precision: number;
    bear_precision: number;
    risk_mode: string;
    bull_threshold: number;
    bear_threshold: number;
    model_quality: string;
  };
}

export interface TrendFollowingTrade {
  direction: "long" | "short";
  start: string;
  end: string;
  return: number;
  won: boolean;
}

export interface TrendFollowingSignal {
  symbol: string;
  resolved_ticker: string;
  strategy: string;
  direction: Direction;
  current_price: number;
  sma_fast: number;
  sma_slow: number;
  fast_period: number;
  slow_period: number;
  backtest: {
    num_trades: number;
    win_rate: number;
    total_return: number;
    buy_hold_return: number;
    sharpe_ratio: number;
    max_drawdown: number;
    trades: TrendFollowingTrade[];
    period_start: string;
    period_end: string;
  };
}