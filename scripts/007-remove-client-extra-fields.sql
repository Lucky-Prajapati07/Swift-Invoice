-- Remove client fields deleted from Client tab

DROP INDEX IF EXISTS idx_clients_client_code;

ALTER TABLE clients
  DROP COLUMN IF EXISTS client_code,
  DROP COLUMN IF EXISTS contact_person,
  DROP COLUMN IF EXISTS shipping_address,
  DROP COLUMN IF EXISTS pan_number;
