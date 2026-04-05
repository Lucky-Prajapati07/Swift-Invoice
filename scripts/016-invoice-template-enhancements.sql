-- Invoice template enhancements for PDF layout and default invoice settings
ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS default_place_of_supply VARCHAR(120),
  ADD COLUMN IF NOT EXISTS default_reverse_charge VARCHAR(10) DEFAULT 'No',
  ADD COLUMN IF NOT EXISTS default_transporter_name VARCHAR(150);

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS place_of_supply VARCHAR(120),
  ADD COLUMN IF NOT EXISTS reverse_charge VARCHAR(10) DEFAULT 'No',
  ADD COLUMN IF NOT EXISTS shipping_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS shipping_address VARCHAR(500),
  ADD COLUMN IF NOT EXISTS shipping_phone VARCHAR(20),
  ADD COLUMN IF NOT EXISTS shipping_email VARCHAR(255),
  ADD COLUMN IF NOT EXISTS transport_mode VARCHAR(50),
  ADD COLUMN IF NOT EXISTS transporter_name VARCHAR(150),
  ADD COLUMN IF NOT EXISTS vehicle_no VARCHAR(50);
