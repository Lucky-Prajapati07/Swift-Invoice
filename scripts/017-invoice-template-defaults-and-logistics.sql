-- Add persistent invoice template defaults and complete logistics fields used by PDF template.
ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS default_supply_type VARCHAR(50),
  ADD COLUMN IF NOT EXISTS default_document_type VARCHAR(50),
  ADD COLUMN IF NOT EXISTS default_is_service VARCHAR(10),
  ADD COLUMN IF NOT EXISTS default_transport_mode VARCHAR(50),
  ADD COLUMN IF NOT EXISTS default_terms TEXT;

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS supply_type VARCHAR(50),
  ADD COLUMN IF NOT EXISTS document_type VARCHAR(50),
  ADD COLUMN IF NOT EXISTS is_service VARCHAR(10),
  ADD COLUMN IF NOT EXISTS transporter_doc_no VARCHAR(100),
  ADD COLUMN IF NOT EXISTS transporter_doc_date DATE,
  ADD COLUMN IF NOT EXISTS eway_bill_no VARCHAR(100),
  ADD COLUMN IF NOT EXISTS eway_bill_date DATE,
  ADD COLUMN IF NOT EXISTS dispatch_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS dispatch_address VARCHAR(500),
  ADD COLUMN IF NOT EXISTS dispatch_pincode VARCHAR(10),
  ADD COLUMN IF NOT EXISTS preceding_inv_ref VARCHAR(100),
  ADD COLUMN IF NOT EXISTS preceding_inv_date DATE,
  ADD COLUMN IF NOT EXISTS ack_no VARCHAR(120),
  ADD COLUMN IF NOT EXISTS ack_date DATE,
  ADD COLUMN IF NOT EXISTS irn VARCHAR(64);
