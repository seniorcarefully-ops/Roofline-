-- Per-prospect unsubscribe token for the one-click link in every email.
ALTER TABLE prospects ADD COLUMN unsub_token text UNIQUE;
UPDATE prospects SET unsub_token = md5(random()::text || clock_timestamp()::text || id::text) WHERE unsub_token IS NULL;
ALTER TABLE prospects ALTER COLUMN unsub_token SET DEFAULT md5(random()::text || clock_timestamp()::text);
