-- Persist the per-turn evaluation so the final attempt score can be computed on the server.
ALTER TABLE answer ADD COLUMN score numeric(5,2);
ALTER TABLE answer ADD COLUMN is_sufficient boolean;
ALTER TABLE answer ADD COLUMN feedback text;

ALTER TABLE answer ADD CONSTRAINT ck_answer_score CHECK (score IS NULL OR (score >= 0 AND score <= 100));
