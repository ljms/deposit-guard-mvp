-- Reports: payment status and Stripe session id for checkout
ALTER TABLE reports
ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'unpaid';

ALTER TABLE reports
ADD COLUMN IF NOT EXISTS stripe_session_id text;

-- Single-row settings table for global flags (e.g. payments_enabled)
CREATE TABLE IF NOT EXISTS settings (
  id int PRIMARY KEY DEFAULT 1,
  payments_enabled boolean NOT NULL DEFAULT false,
  CONSTRAINT single_row CHECK (id = 1)
);

INSERT INTO settings (id, payments_enabled) VALUES (1, false)
ON CONFLICT (id) DO NOTHING;
