-- Background document ingestion: track content hash (duplicate detection), page count and completion time.
ALTER TABLE course_document ADD COLUMN content_hash varchar(64);
ALTER TABLE course_document ADD COLUMN page_count int;
ALTER TABLE course_document ADD COLUMN processed_at timestamptz;

-- The same file can be uploaded once per teacher and subject, unless the earlier upload failed.
CREATE UNIQUE INDEX uq_course_document_content
    ON course_document (course_id, uploaded_by, content_hash)
    WHERE content_hash IS NOT NULL AND extraction_status <> 'FAILED';

CREATE INDEX idx_course_document_status ON course_document (extraction_status);
