-- Remove invoice settings template fields from businesses table
-- These inputs were removed from Invoice Settings UI/backend.

ALTER TABLE businesses
  DROP COLUMN IF EXISTS invoice_copy_label,
  DROP COLUMN IF EXISTS default_dispatch_from,
  DROP COLUMN IF EXISTS default_place_of_supply,
  DROP COLUMN IF EXISTS default_vendor_code,
  DROP COLUMN IF EXISTS default_ship_by,
  DROP COLUMN IF EXISTS default_transporter_name,
  DROP COLUMN IF EXISTS default_invoice_terms,
  DROP COLUMN IF EXISTS default_invoice_note;
