-- Remove extra logistics/template fields from invoice records
ALTER TABLE invoices
  DROP COLUMN IF EXISTS ship_to_name,
  DROP COLUMN IF EXISTS ship_to_address,
  DROP COLUMN IF EXISTS ship_to_gstin,
  DROP COLUMN IF EXISTS dispatch_from,
  DROP COLUMN IF EXISTS dispatch_date,
  DROP COLUMN IF EXISTS dispatch_doc_no,
  DROP COLUMN IF EXISTS place_of_supply,
  DROP COLUMN IF EXISTS vendor_code,
  DROP COLUMN IF EXISTS vehicle_no,
  DROP COLUMN IF EXISTS ship_by,
  DROP COLUMN IF EXISTS transporter_name,
  DROP COLUMN IF EXISTS original_copy_label;
