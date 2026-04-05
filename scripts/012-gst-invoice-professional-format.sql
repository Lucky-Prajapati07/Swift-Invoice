-- Add additional GST invoice fields for professional format
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS place_of_supply VARCHAR(120),
  ADD COLUMN IF NOT EXISTS supply_type VARCHAR(50),
  ADD COLUMN IF NOT EXISTS document_type VARCHAR(50),
  ADD COLUMN IF NOT EXISTS is_service VARCHAR(10),
  ADD COLUMN IF NOT EXISTS transport_mode VARCHAR(50),
  ADD COLUMN IF NOT EXISTS eway_bill_no VARCHAR(100),
  ADD COLUMN IF NOT EXISTS eway_bill_date DATE,
  ADD COLUMN IF NOT EXISTS dispatch_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS dispatch_address VARCHAR(500),
  ADD COLUMN IF NOT EXISTS dispatch_pincode VARCHAR(10),
  ADD COLUMN IF NOT EXISTS preceding_inv_ref VARCHAR(100),
  ADD COLUMN IF NOT EXISTS preceding_inv_date DATE,
  ADD COLUMN IF NOT EXISTS irn VARCHAR(64);
