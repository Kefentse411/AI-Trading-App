-- Add roles table
CREATE TABLE IF NOT EXISTS roles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- Insert default roles
INSERT OR IGNORE INTO roles (name, description) VALUES 
  ('admin', 'Full system access'),
  ('user', 'Standard user access'),
  ('viewer', 'Read-only access');

-- Add role_id to users table
ALTER TABLE users ADD COLUMN role_id INTEGER REFERENCES roles(id) DEFAULT 2;

-- Create index for role lookups
CREATE INDEX IF NOT EXISTS idx_users_role_id ON users(role_id);

-- Update existing users to have 'user' role by default
UPDATE users SET role_id = 2 WHERE role_id IS NULL;