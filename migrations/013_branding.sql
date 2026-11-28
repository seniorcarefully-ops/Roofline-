-- Site signals and branding captured by the audit (from the business's own site only).
ALTER TABLE prospects ADD COLUMN site_builder text;      -- e.g. wix, squarespace, godaddy, wordpress, duda
ALTER TABLE prospects ADD COLUMN agency_credit text;     -- e.g. "Website by Scorpion" found on the site
ALTER TABLE prospects ADD COLUMN brand_color text;       -- #rrggbb, most-used saturated color on their site
ALTER TABLE prospects ADD COLUMN brand_logo bytea;       -- their own logo file, only if it passed quality checks
ALTER TABLE prospects ADD COLUMN brand_logo_type text;   -- image/png, image/svg+xml, ...
