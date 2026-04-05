-- Section-wise invoice generator alignment
-- Keeps the schema compatible with the new invoice form sections.

ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS bank_branch VARCHAR(150);

-- Optional cleanup for legacy invoice fields can be done later after data migration.
-- This release intentionally keeps old columns to avoid breaking existing records.
