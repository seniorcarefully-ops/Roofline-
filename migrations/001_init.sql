-- Roofline foundation schema.
-- Lifecycle tracks are separate columns so outreach status can never be
-- confused with website-production or permission status.

CREATE TABLE niches (
  id            text PRIMARY KEY,               -- e.g. 'roofing'
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Immutable niche/brand configuration versions. A prospect stores the version
-- it was contacted under, so switching the active niche never rewrites history.
CREATE TABLE niche_versions (
  id            bigserial PRIMARY KEY,
  niche_id      text NOT NULL REFERENCES niches(id),
  version       integer NOT NULL,
  config        jsonb NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (niche_id, version)
);

-- Single-row owner settings: active niche and global pause.
CREATE TABLE settings (
  id                    boolean PRIMARY KEY DEFAULT true CHECK (id),
  active_niche_version  bigint REFERENCES niche_versions(id),
  outreach_paused       boolean NOT NULL DEFAULT true,
  daily_email_cap       integer NOT NULL DEFAULT 0 CHECK (daily_email_cap >= 0)
);
INSERT INTO settings (id) VALUES (true);

CREATE TABLE prospects (
  id                 bigserial PRIMARY KEY,
  niche_version_id   bigint NOT NULL REFERENCES niche_versions(id),
  business_name      text NOT NULL,
  website_url        text,
  normalized_domain  text,
  place_id           text,
  phone              text,
  address            text,
  service_area       text,
  contact_first_name text,
  contact_email      text,
  contact_verified   boolean NOT NULL DEFAULT false,
  prospect_state     text NOT NULL DEFAULT 'discovered'
    CHECK (prospect_state IN ('discovered','qualified','contacted','interested','purchased','closed')),
  website_state      text NOT NULL DEFAULT 'none'
    CHECK (website_state IN ('none','build_queued','building','reviewing','changes_requested',
      'replacement_requested','approved','ready_to_send','sent','customer_approved','live')),
  email_state        text NOT NULL DEFAULT 'eligible' CHECK (email_state IN ('eligible','suppressed')),
  sms_state          text NOT NULL DEFAULT 'missing' CHECK (sms_state IN ('missing','granted','withdrawn')),
  revision_count     integer NOT NULL DEFAULT 0,
  experiment_variant text,
  next_action        text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX prospects_place_uq ON prospects(place_id) WHERE place_id IS NOT NULL;
CREATE UNIQUE INDEX prospects_domain_uq ON prospects(normalized_domain) WHERE normalized_domain IS NOT NULL;

-- Evidence-backed audit findings. Each finding needs a source and capture time.
CREATE TABLE audit_findings (
  id            bigserial PRIMARY KEY,
  prospect_id   bigint NOT NULL REFERENCES prospects(id),
  code          text NOT NULL,         -- e.g. 'no_tap_to_call'
  summary       text NOT NULL,         -- phrase used in the email ([X],[Y],[Z])
  detail        text NOT NULL,
  source_url    text NOT NULL,
  evidence_path text NOT NULL,         -- screenshot or captured HTML
  captured_at   timestamptz NOT NULL,
  verified      boolean NOT NULL DEFAULT false,
  UNIQUE (prospect_id, code)
);

CREATE TABLE audit_documents (
  id            bigserial PRIMARY KEY,
  prospect_id   bigint NOT NULL REFERENCES prospects(id),
  file_path     text NOT NULL,
  sha256        text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE previews (
  id            bigserial PRIMARY KEY,
  prospect_id   bigint NOT NULL REFERENCES prospects(id),
  version       integer NOT NULL,
  url           text,
  content_hash  text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (prospect_id, version)
);

CREATE TABLE reviews (
  id            bigserial PRIMARY KEY,
  preview_id    bigint NOT NULL REFERENCES previews(id),
  verdict       text NOT NULL CHECK (verdict IN ('approved','edits','replacement')),
  checks        jsonb NOT NULL,
  notes         text,
  reviewer      text NOT NULL,          -- builder and reviewer must differ
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Consent records are append-only evidence.
CREATE TABLE consents (
  id            bigserial PRIMARY KEY,
  prospect_id   bigint NOT NULL REFERENCES prospects(id),
  channel       text NOT NULL CHECK (channel IN ('sms','email')),
  action        text NOT NULL CHECK (action IN ('granted','withdrawn')),
  phone_e164    text,
  wording       text NOT NULL,          -- the exact words the person sent
  source        text NOT NULL,          -- e.g. 'email_reply:<message id>'
  scope         text NOT NULL,
  recorded_at   timestamptz NOT NULL DEFAULT now()
);

-- Global suppression list across channels; checked before every send.
CREATE TABLE suppressions (
  id            bigserial PRIMARY KEY,
  channel       text NOT NULL CHECK (channel IN ('sms','email','all')),
  address       text NOT NULL,          -- lowercased email or E.164 phone
  reason        text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (channel, address)
);

-- Every outbound/inbound message. idempotency_key prevents duplicate sends.
CREATE TABLE messages (
  id              bigserial PRIMARY KEY,
  prospect_id     bigint REFERENCES prospects(id),
  channel         text NOT NULL CHECK (channel IN ('sms','email')),
  direction       text NOT NULL CHECK (direction IN ('outbound','inbound')),
  idempotency_key text UNIQUE,
  provider_id     text,
  status          text NOT NULL DEFAULT 'pending',
  body            text NOT NULL,
  meta            jsonb NOT NULL DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Durable job queue (Postgres SKIP LOCKED).
CREATE TABLE jobs (
  id              bigserial PRIMARY KEY,
  kind            text NOT NULL,
  payload         jsonb NOT NULL DEFAULT '{}',
  idempotency_key text UNIQUE,
  status          text NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued','running','done','failed')),
  attempts        integer NOT NULL DEFAULT 0,
  max_attempts    integer NOT NULL DEFAULT 3,
  run_after       timestamptz NOT NULL DEFAULT now(),
  locked_at       timestamptz,
  last_error      text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX jobs_ready_idx ON jobs(run_after) WHERE status = 'queued';

CREATE TABLE exceptions (
  id            bigserial PRIMARY KEY,
  subject_type  text NOT NULL,
  subject_id    text NOT NULL,
  reason        text NOT NULL,
  state         text NOT NULL DEFAULT 'open' CHECK (state IN ('open','assigned','resolved','paused')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  resolved_at   timestamptz
);

-- Append-only log of every state transition and significant action.
CREATE TABLE events (
  id            bigserial PRIMARY KEY,
  subject_type  text NOT NULL,
  subject_id    text NOT NULL,
  track         text NOT NULL,
  from_state    text,
  to_state      text,
  actor         text NOT NULL,
  detail        jsonb NOT NULL DEFAULT '{}',
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX events_subject_idx ON events(subject_type, subject_id);

CREATE RULE events_no_update AS ON UPDATE TO events DO INSTEAD NOTHING;
CREATE RULE events_no_delete AS ON DELETE TO events DO INSTEAD NOTHING;
CREATE RULE consents_no_update AS ON UPDATE TO consents DO INSTEAD NOTHING;
CREATE RULE consents_no_delete AS ON DELETE TO consents DO INSTEAD NOTHING;
