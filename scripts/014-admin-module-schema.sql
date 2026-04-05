ALTER TABLE users
  ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS admin_settings (
  id INTEGER PRIMARY KEY,
  monthly_price DECIMAL(10, 2) NOT NULL DEFAULT 499,
  yearly_price DECIMAL(10, 2) NOT NULL DEFAULT 4999,
  feature_flags JSONB NOT NULL DEFAULT '{"invoicing": true, "transactions": true, "reports": true, "reminders": true}'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO admin_settings (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_users_is_blocked ON users(is_blocked);
