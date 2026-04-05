ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS trial_starts_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS payment_provider VARCHAR(50) DEFAULT 'RAZORPAY',
  ADD COLUMN IF NOT EXISTS last_payment_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS last_payment_at TIMESTAMP WITH TIME ZONE;

CREATE TABLE IF NOT EXISTS razorpay_webhook_events (
  id UUID PRIMARY KEY,
  event_id VARCHAR(255) UNIQUE NOT NULL,
  event_name VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_razorpay_webhook_event_id ON razorpay_webhook_events(event_id);
