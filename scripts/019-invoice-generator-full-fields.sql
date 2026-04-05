-- Full-field invoice generator support
-- Adds all extra invoice detail and branding snapshot columns required by the new invoice format.

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS document_date DATE,
  ADD COLUMN IF NOT EXISTS invoice_type VARCHAR(50),
  ADD COLUMN IF NOT EXISTS supplier_legal_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS supplier_address TEXT,
  ADD COLUMN IF NOT EXISTS supplier_place VARCHAR(120),
  ADD COLUMN IF NOT EXISTS supplier_state_code VARCHAR(10),
  ADD COLUMN IF NOT EXISTS supplier_pincode VARCHAR(12),
  ADD COLUMN IF NOT EXISTS party_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS party_gstin VARCHAR(20),
  ADD COLUMN IF NOT EXISTS recipient_legal_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS recipient_address TEXT,
  ADD COLUMN IF NOT EXISTS recipient_state_code VARCHAR(10),
  ADD COLUMN IF NOT EXISTS place_of_supply_state_code VARCHAR(10),
  ADD COLUMN IF NOT EXISTS recipient_pincode VARCHAR(12),
  ADD COLUMN IF NOT EXISTS recipient_place VARCHAR(120),
  ADD COLUMN IF NOT EXISTS shipping_to_gstin VARCHAR(20),
  ADD COLUMN IF NOT EXISTS shipping_to_state VARCHAR(120),
  ADD COLUMN IF NOT EXISTS shipping_to_state_code VARCHAR(10),
  ADD COLUMN IF NOT EXISTS shipping_to_pincode VARCHAR(12),
  ADD COLUMN IF NOT EXISTS dispatch_from_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS dispatch_from_address TEXT,
  ADD COLUMN IF NOT EXISTS dispatch_from_place VARCHAR(120),
  ADD COLUMN IF NOT EXISTS dispatch_from_pincode VARCHAR(12),
  ADD COLUMN IF NOT EXISTS logo_url TEXT,
  ADD COLUMN IF NOT EXISTS company_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS bank_name VARCHAR(150),
  ADD COLUMN IF NOT EXISTS account_number VARCHAR(60),
  ADD COLUMN IF NOT EXISTS ifsc VARCHAR(20),
  ADD COLUMN IF NOT EXISTS branch VARCHAR(150),
  ADD COLUMN IF NOT EXISTS terms_conditions TEXT;

ALTER TABLE invoice_items
  ADD COLUMN IF NOT EXISTS hsn_code VARCHAR(20),
  ADD COLUMN IF NOT EXISTS discount_percent DECIMAL(5, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(12, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_percent DECIMAL(5, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(12, 2) DEFAULT 0;
