-- NEXORA AI — deterministic baseline for content learning
ALTER TABLE content_items ADD COLUMN base_score REAL;

UPDATE content_items
SET base_score = CASE
  WHEN base_score IS NOT NULL THEN base_score
  ELSE COALESCE(score, 0)
END;

CREATE INDEX IF NOT EXISTS idx_content_items_score ON content_items(score DESC);
