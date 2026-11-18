-- Customers and independent subscriptions, mirrored from Stripe.
CREATE TABLE customers (
  id                 bigserial PRIMARY KEY,
  prospect_id        bigint UNIQUE REFERENCES prospects(id),
  stripe_customer_id text UNIQUE NOT NULL,
  email              text,
  livemode           boolean NOT NULL,
  created_at         timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE subscriptions (
  id                     bigserial PRIMARY KEY,
  customer_id            bigint NOT NULL REFERENCES customers(id),
  stripe_subscription_id text UNIQUE NOT NULL,
  service                text NOT NULL CHECK (service IN ('website','sms','marketing')),
  status                 text NOT NULL,
  cancel_at_period_end   boolean NOT NULL DEFAULT false,
  current_period_end     timestamptz,
  livemode               boolean NOT NULL,
  updated_at             timestamptz NOT NULL DEFAULT now()
);

-- Every Stripe event processed exactly once.
CREATE TABLE billing_events (
  stripe_event_id text PRIMARY KEY,
  type            text NOT NULL,
  created         timestamptz NOT NULL,
  processed_at    timestamptz NOT NULL DEFAULT now()
);
