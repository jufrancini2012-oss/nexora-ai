-- NEXORA AI — base score for deterministic commercial learning
ALTER TABLE affiliate_products ADD COLUMN base_score REAL;

UPDATE affiliate_products
SET base_score = CASE
  WHEN base_score IS NOT NULL THEN base_score
  WHEN json_extract(evidence_json, '$.priority') = 'very_high' THEN 75
  WHEN json_extract(evidence_json, '$.priority') = 'high' THEN 65
  WHEN json_extract(evidence_json, '$.priority') = 'medium' THEN 55
  ELSE COALESCE(score, 50)
END
WHERE base_score IS NULL;

CREATE INDEX IF NOT EXISTS idx_affiliate_products_base_score ON affiliate_products(base_score DESC);
