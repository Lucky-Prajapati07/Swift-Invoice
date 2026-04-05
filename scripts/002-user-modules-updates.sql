-- User modules schema updates
-- Safe, additive migration for clients/invoices/transactions/reports/settings enhancements

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

ALTER TABLE invoice_items
  ADD COLUMN IF NOT EXISTS tax_percent DECIMAL(5, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(12, 2) DEFAULT 0;

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS share_token VARCHAR(100) UNIQUE;

CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(business_id, name);
CREATE INDEX IF NOT EXISTS idx_invoices_dates ON invoices(business_id, invoice_date, status);
CREATE INDEX IF NOT EXISTS idx_transactions_client_date ON transactions(business_id, client_id, transaction_date);

-- Ensure a share token exists for existing invoices
UPDATE invoices
SET share_token = COALESCE(share_token, md5(random()::text || clock_timestamp()::text))
WHERE share_token IS NULL;
