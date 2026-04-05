ALTER TABLE invoices
  DROP COLUMN IF EXISTS place_of_supply,
  DROP COLUMN IF EXISTS supply_type,
  DROP COLUMN IF EXISTS document_type,
  DROP COLUMN IF EXISTS is_service,
  DROP COLUMN IF EXISTS transport_mode,
  DROP COLUMN IF EXISTS eway_bill_no,
  DROP COLUMN IF EXISTS eway_bill_date,
  DROP COLUMN IF EXISTS dispatch_name,
  DROP COLUMN IF EXISTS dispatch_address,
  DROP COLUMN IF EXISTS dispatch_pincode,
  DROP COLUMN IF EXISTS preceding_inv_ref,
  DROP COLUMN IF EXISTS preceding_inv_date,
  DROP COLUMN IF EXISTS irn;