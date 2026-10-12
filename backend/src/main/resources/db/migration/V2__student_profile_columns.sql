ALTER TABLE "user" ADD COLUMN phone varchar(20);

UPDATE "user"
SET student_code = 'S' || upper(substr(replace(id::text, '-', ''), 1, 9))
WHERE student_code IS NULL
  AND role_id = (SELECT id FROM role WHERE code = 'STUDENT');

CREATE UNIQUE INDEX uq_user_student_code ON "user" (student_code) WHERE student_code IS NOT NULL;

CREATE INDEX idx_user_full_name ON "user" (lower(full_name));
