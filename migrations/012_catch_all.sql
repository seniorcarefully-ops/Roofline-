-- Address published on the business's own site but its domain accepts all mail (catch-all).
ALTER TABLE prospects ADD COLUMN contact_catch_all boolean NOT NULL DEFAULT false;
