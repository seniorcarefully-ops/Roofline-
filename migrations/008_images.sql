-- Evidence screenshots and preview thumbnails live in the database so any
-- server instance can serve them (container disks are ephemeral).
CREATE TABLE evidence_images (
  prospect_id bigint NOT NULL REFERENCES prospects(id),
  key         text NOT NULL,          -- e.g. 'mobile-top.png'
  png         bytea NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (prospect_id, key)
);
ALTER TABLE previews ADD COLUMN thumb bytea;   -- mobile hero screenshot of the approved preview
