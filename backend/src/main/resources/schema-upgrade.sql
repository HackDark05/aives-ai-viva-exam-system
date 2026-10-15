-- Brings a database created before schema.sql gained these columns up to date. Every statement is idempotent;
-- SchemaInitializer runs this file on each start when the tables already exist.

ALTER TABLE "user" ADD COLUMN IF NOT EXISTS phone varchar(20);
UPDATE "user"
SET student_code = 'S' || upper(substr(replace(id::text, '-', ''), 1, 9))
WHERE student_code IS NULL
  AND role_id = (SELECT id FROM role WHERE code = 'STUDENT');
CREATE UNIQUE INDEX IF NOT EXISTS uq_user_student_code ON "user" (student_code) WHERE student_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_full_name ON "user" (lower(full_name));

ALTER TABLE answer ADD COLUMN IF NOT EXISTS score numeric(5,2);
ALTER TABLE answer ADD COLUMN IF NOT EXISTS is_sufficient boolean;
ALTER TABLE answer ADD COLUMN IF NOT EXISTS feedback text;
ALTER TABLE answer ADD COLUMN IF NOT EXISTS evaluator varchar(20);
ALTER TABLE answer DROP CONSTRAINT IF EXISTS ck_answer_score;
ALTER TABLE answer ADD CONSTRAINT ck_answer_score CHECK (score IS NULL OR (score >= 0 AND score <= 100));

ALTER TABLE course_document ADD COLUMN IF NOT EXISTS content_hash varchar(64);
ALTER TABLE course_document ADD COLUMN IF NOT EXISTS page_count int;
ALTER TABLE course_document ADD COLUMN IF NOT EXISTS processed_at timestamptz;
CREATE UNIQUE INDEX IF NOT EXISTS uq_course_document_content
    ON course_document (course_id, uploaded_by, content_hash)
    WHERE content_hash IS NOT NULL AND extraction_status <> 'FAILED';
CREATE INDEX IF NOT EXISTS idx_course_document_status ON course_document (extraction_status);

-- Left over from when Flyway managed the schema.
DROP TABLE IF EXISTS flyway_schema_history;
