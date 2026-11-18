-- Store the verified brief with each preview version so the server can render it.
ALTER TABLE previews ADD COLUMN brief jsonb;
