-- Add shipping and transport details for invoice detail sections
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS shipping_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS shipping_address VARCHAR(500),
  ADD COLUMN IF NOT EXISTS shipping_phone VARCHAR(20),
  ADD COLUMN IF NOT EXISTS shipping_email VARCHAR(255),
  ADD COLUMN IF NOT EXISTS transporter_name VARCHAR(150),
  ADD COLUMN IF NOT EXISTS vehicle_no VARCHAR(50);
