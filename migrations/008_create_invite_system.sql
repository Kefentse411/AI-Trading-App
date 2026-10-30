-- Invite codes table
CREATE TABLE IF NOT EXISTS invite_codes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  created_by INTEGER NOT NULL REFERENCES users(id),
  max_uses INTEGER DEFAULT 1,
  current_uses INTEGER DEFAULT 0,
  expires_at INTEGER NOT NULL,
  role_id INTEGER DEFAULT 2 REFERENCES roles(id),
  notes TEXT,
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- Track invite usage
CREATE TABLE IF NOT EXISTS invite_usage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invite_code_id INTEGER NOT NULL REFERENCES invite_codes(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  email TEXT NOT NULL,
  used_at INTEGER DEFAULT (strftime('%s', 'now')),
  ip_address TEXT
);

-- System settings for invite requirements
CREATE TABLE IF NOT EXISTS system_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  updated_by INTEGER REFERENCES users(id),
  updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- Insert default settings
INSERT OR IGNORE INTO system_settings (key, value, description) VALUES 
('invite_required', 'true', 'Whether invite codes are required for new registrations'),
('invite_default_role', '2', 'Default role ID for invited users'),
('invite_default_expires_days', '7', 'Default expiration days for new invites');

CREATE INDEX IF NOT EXISTS idx_invite_codes_code ON invite_codes(code);
CREATE INDEX IF NOT EXISTS idx_invite_codes_expires ON invite_codes(expires_at);
CREATE INDEX IF NOT EXISTS idx_invite_usage_invite ON invite_usage(invite_code_id);
CREATE INDEX IF NOT EXISTS idx_invite_usage_user ON invite_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(key);