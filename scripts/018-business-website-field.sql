-- Add business website URL used in invoice PDF template header
ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS website_url VARCHAR(255);
