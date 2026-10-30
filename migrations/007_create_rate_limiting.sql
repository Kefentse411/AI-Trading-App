-- Rate limiting attempts table
CREATE TABLE IF NOT EXISTS rate_limits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  identifier TEXT NOT NULL, -- email, IP, or combo
  action TEXT NOT NULL,     -- 'passcode_request', 'login_attempt', 'verify_attempt'
  attempts INTEGER DEFAULT 1,
  first_attempt INTEGER DEFAULT (strftime('%s', 'now')),
  last_attempt INTEGER DEFAULT (strftime('%s', 'now')),
  blocked_until INTEGER DEFAULT NULL,
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  UNIQUE(identifier, action)
);

-- Blocked IPs/users table
CREATE TABLE IF NOT EXISTS blocked_entities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  identifier TEXT NOT NULL UNIQUE, -- IP or email
  type TEXT NOT NULL,               -- 'ip' or 'user'
  reason TEXT NOT NULL,             -- 'brute_force', 'suspicious_activity', etc
  blocked_until INTEGER NOT NULL,
  blocked_by INTEGER REFERENCES users(id),
  created_at INTEGER DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_identifier ON rate_limits(identifier, action);
CREATE INDEX IF NOT EXISTS idx_rate_limits_blocked ON rate_limits(blocked_until);
CREATE INDEX IF NOT EXISTS idx_blocked_entities_identifier ON blocked_entities(identifier);
CREATE INDEX IF NOT EXISTS idx_blocked_entities_until ON blocked_entities(blocked_until);