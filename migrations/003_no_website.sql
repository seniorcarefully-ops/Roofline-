-- Which approved outreach template a prospect qualifies for, plus listing facts used in it.
ALTER TABLE prospects
  ADD COLUMN outreach_template text NOT NULL DEFAULT 'website_audit'
    CHECK (outreach_template IN ('website_audit','no_website')),
  ADD COLUMN google_rating numeric(2,1),
  ADD COLUMN google_review_count integer;
