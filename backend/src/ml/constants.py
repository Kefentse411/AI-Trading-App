"""
Shared constants used across predictor and API layers.
Centralized to avoid drift between prediction pricing and chart pricing.
"""

# GLD (Gold ETF) trades at roughly 1/10th the price of spot gold per ounce.
# This approximates GLD's share price back to a spot-gold-equivalent display
# price. Used consistently wherever GLD price is shown to the user, so the
# chart and the ML prediction panel never disagree.
GLD_MULTIPLIER = 10.0

SYMBOL_MAP = {
    "gold":   "GLD",
    "eurusd": "EURUSD=X",
    "gbpusd": "GBPUSD=X",
    "usdjpy": "USDJPY=X",
    "audusd": "AUDUSD=X",
    "usdcad": "USDCAD=X",
}