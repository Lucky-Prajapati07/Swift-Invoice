-- Add common invoice-level fields and invoice settings defaults
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS place_of_supply VARCHAR(120),
  ADD COLUMN IF NOT EXISTS reverse_charge VARCHAR(10) DEFAULT 'No',
  ADD COLUMN IF NOT EXISTS transporter_name VARCHAR(150),
  ADD COLUMN IF NOT EXISTS vehicle_no VARCHAR(50),
  ADD COLUMN IF NOT EXISTS transporter_doc_no VARCHAR(100),
  ADD COLUMN IF NOT EXISTS transporter_doc_date DATE,
  ADD COLUMN IF NOT EXISTS eway_bill_no VARCHAR(100),
  ADD COLUMN IF NOT EXISTS eway_bill_date DATE,
  ADD COLUMN IF NOT EXISTS ack_no VARCHAR(120),
  ADD COLUMN IF NOT EXISTS ack_date DATE;

ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS default_place_of_supply VARCHAR(120),
  ADD COLUMN IF NOT EXISTS default_reverse_charge VARCHAR(10) DEFAULT 'No',
  ADD COLUMN IF NOT EXISTS default_transporter_name VARCHAR(150);
