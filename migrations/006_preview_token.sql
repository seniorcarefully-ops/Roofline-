-- Unguessable public link per preview version.
ALTER TABLE previews ADD COLUMN token text UNIQUE;
UPDATE previews SET token = md5(random()::text || clock_timestamp()::text || id::text) WHERE token IS NULL;
ALTER TABLE previews ALTER COLUMN token SET NOT NULL;
