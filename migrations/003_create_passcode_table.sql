CREATE TABLE IF NOT EXISTS passcodes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  UNIQUE(email)
);

CREATE INDEX idx_passcodes_email ON passcodes(email);
CREATE INDEX idx_passcodes_expires_at ON passcodes(expires_at);
