-- Lead fit score (0-100) and the reasons behind it.
ALTER TABLE prospects ADD COLUMN fit_score integer, ADD COLUMN fit_reasons jsonb;
