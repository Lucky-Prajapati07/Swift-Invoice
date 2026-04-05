-- Extended client master fields for richer invoicing

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS client_code VARCHAR(50),
  ADD COLUMN IF NOT EXISTS contact_person VARCHAR(255),
  ADD COLUMN IF NOT EXISTS shipping_address TEXT,
  ADD COLUMN IF NOT EXISTS pan_number VARCHAR(20),
  ADD COLUMN IF NOT EXISTS state_code VARCHAR(10);

CREATE INDEX IF NOT EXISTS idx_clients_client_code ON clients(business_id, client_code);
