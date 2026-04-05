-- Invoice template defaults + per-invoice logistics fields

ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS invoice_copy_label VARCHAR(100) DEFAULT 'Original for Recipient',
  ADD COLUMN IF NOT EXISTS default_dispatch_from VARCHAR(255),
  ADD COLUMN IF NOT EXISTS default_place_of_supply VARCHAR(255),
  ADD COLUMN IF NOT EXISTS default_vendor_code VARCHAR(100),
  ADD COLUMN IF NOT EXISTS default_ship_by VARCHAR(100),
  ADD COLUMN IF NOT EXISTS default_transporter_name VARCHAR(150),
  ADD COLUMN IF NOT EXISTS default_invoice_terms TEXT,
  ADD COLUMN IF NOT EXISTS default_invoice_note TEXT;

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS ship_to_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS ship_to_address TEXT,
  ADD COLUMN IF NOT EXISTS ship_to_gstin VARCHAR(30),
  ADD COLUMN IF NOT EXISTS dispatch_from VARCHAR(255),
  ADD COLUMN IF NOT EXISTS dispatch_date DATE,
  ADD COLUMN IF NOT EXISTS dispatch_doc_no VARCHAR(100),
  ADD COLUMN IF NOT EXISTS place_of_supply VARCHAR(255),
  ADD COLUMN IF NOT EXISTS vendor_code VARCHAR(100),
  ADD COLUMN IF NOT EXISTS vehicle_no VARCHAR(50),
  ADD COLUMN IF NOT EXISTS ship_by VARCHAR(100),
  ADD COLUMN IF NOT EXISTS transporter_name VARCHAR(150),
  ADD COLUMN IF NOT EXISTS original_copy_label VARCHAR(100);
