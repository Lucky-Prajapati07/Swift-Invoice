-- Extended business settings fields
-- Adds legal/display naming, business type, bank details, and signatory details

ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS legal_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS display_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS business_type VARCHAR(100),
  ADD COLUMN IF NOT EXISTS bank_account_number VARCHAR(50),
  ADD COLUMN IF NOT EXISTS bank_ifsc VARCHAR(20),
  ADD COLUMN IF NOT EXISTS bank_name VARCHAR(150),
  ADD COLUMN IF NOT EXISTS bank_account_holder VARCHAR(255),
  ADD COLUMN IF NOT EXISTS signatory_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS signatory_mobile VARCHAR(20),
  ADD COLUMN IF NOT EXISTS signatory_email VARCHAR(255),
  ADD COLUMN IF NOT EXISTS signatory_designation VARCHAR(150);
