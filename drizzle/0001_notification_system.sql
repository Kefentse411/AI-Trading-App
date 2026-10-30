-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('email', 'sms', 'in_app')),
  channel TEXT NOT NULL CHECK(channel IN ('bullish_signal', 'bearish_signal', 'risk_alert')),
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create index for quick lookups by user
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);

-- Create signal_history table
CREATE TABLE IF NOT EXISTS signal_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  symbol TEXT NOT NULL,
  direction TEXT NOT NULL CHECK(direction IN ('bullish', 'bearish', 'neutral')),
  confidence REAL NOT NULL,
  entry_price REAL NOT NULL,
  target_price REAL NOT NULL,
  stop_loss REAL NOT NULL,
  notification_sent INTEGER NOT NULL DEFAULT 0,
  email_sent INTEGER NOT NULL DEFAULT 0,
  sms_sent INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes for signal_history
CREATE INDEX IF NOT EXISTS idx_signal_history_user ON signal_history(user_id);
CREATE INDEX IF NOT EXISTS idx_signal_history_symbol ON signal_history(symbol);
CREATE INDEX IF NOT EXISTS idx_signal_history_created ON signal_history(created_at);

-- Create user_notification_preferences table
CREATE TABLE IF NOT EXISTS user_notification_preferences (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER UNIQUE NOT NULL,
  email_address TEXT NOT NULL,
  phone_number TEXT,
  email_notifications INTEGER NOT NULL DEFAULT 1,
  sms_notifications INTEGER NOT NULL DEFAULT 0,
  bullish_signals INTEGER NOT NULL DEFAULT 1,
  bearish_signals INTEGER NOT NULL DEFAULT 1,
  risk_alerts INTEGER NOT NULL DEFAULT 1,
  min_confidence_threshold REAL NOT NULL DEFAULT 0.50,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create index for user_notification_preferences
CREATE INDEX IF NOT EXISTS idx_user_notification_prefs_user ON user_notification_preferences(user_id);
