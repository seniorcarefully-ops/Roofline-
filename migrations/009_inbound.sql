-- "Get my free preview" requests from the public brand site (inbound leads).
CREATE TABLE inbound_requests (
  id            bigserial PRIMARY KEY,
  business_name text NOT NULL,
  city          text NOT NULL,
  website       text,
  phone_e164    text NOT NULL,
  consent_text  text NOT NULL,     -- exact consent wording shown, stored verbatim
  niche         text NOT NULL,
  status        text NOT NULL DEFAULT 'new' CHECK (status IN ('new','matched','built','sent','rejected')),
  prospect_id   bigint REFERENCES prospects(id),
  user_agent    text,
  created_at    timestamptz NOT NULL DEFAULT now()
);
