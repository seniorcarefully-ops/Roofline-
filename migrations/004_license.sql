-- Verified state license facts (WA L&I). NULL = not checked / not found.
ALTER TABLE prospects
  ADD COLUMN license_number text,
  ADD COLUMN license_status text,
  ADD COLUMN license_bonded boolean,
  ADD COLUMN license_insured boolean,
  ADD COLUMN license_match text CHECK (license_match IN ('phone','exact_name')),
  ADD COLUMN principal_first_name text,
  ADD COLUMN license_checked_at timestamptz;
