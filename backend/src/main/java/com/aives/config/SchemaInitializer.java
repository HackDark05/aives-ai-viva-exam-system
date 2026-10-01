package com.aives.config;

import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
@Order(0)
public class SchemaInitializer implements ApplicationRunner {

    private final JdbcTemplate jdbc;

    public SchemaInitializer(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public void run(org.springframework.boot.ApplicationArguments args) {
        jdbc.execute("CREATE EXTENSION IF NOT EXISTS vector");
        jdbc.execute(
                """
                DO $$
                BEGIN
                    CREATE TYPE "Role" AS ENUM ('STUDENT', 'EXAMINER', 'ADMIN');
                EXCEPTION
                    WHEN duplicate_object THEN NULL;
                END $$
                """
        );
        jdbc.execute(
                """
                CREATE TABLE IF NOT EXISTS "User" (
                    id TEXT PRIMARY KEY,
                    email TEXT NOT NULL,
                    password TEXT NOT NULL,
                    name TEXT NOT NULL,
                    role "Role" NOT NULL DEFAULT 'STUDENT',
                    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
                """
        );
        jdbc.execute("ALTER TABLE \"User\" ALTER COLUMN password DROP NOT NULL");
        jdbc.execute("ALTER TABLE \"User\" ADD COLUMN IF NOT EXISTS google_sub TEXT");
        jdbc.execute("CREATE UNIQUE INDEX IF NOT EXISTS \"User_email_key\" ON \"User\" (email)");
        jdbc.execute("CREATE UNIQUE INDEX IF NOT EXISTS \"User_google_sub_key\" ON \"User\" (google_sub)");
        jdbc.execute(
                """
                CREATE TABLE IF NOT EXISTS knowledge_chunk (
                    id UUID PRIMARY KEY,
                    title TEXT NOT NULL,
                    content TEXT NOT NULL,
                    embedding vector(384) NOT NULL,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
                )
                """
        );
        jdbc.execute(
                """
                CREATE INDEX IF NOT EXISTS knowledge_chunk_embedding_idx
                ON knowledge_chunk USING hnsw (embedding vector_cosine_ops)
                """
        );
        jdbc.execute("ALTER TABLE knowledge_chunk ADD COLUMN IF NOT EXISTS document_id UUID");
        jdbc.execute("ALTER TABLE knowledge_chunk ADD COLUMN IF NOT EXISTS source_label TEXT");
        jdbc.execute("ALTER TABLE knowledge_chunk ADD COLUMN IF NOT EXISTS chunk_index INT");
        jdbc.execute(
                """
                DO $$
                BEGIN
                    CREATE TYPE exam_format AS ENUM ('MULTIPLE_CHOICE', 'ORAL');
                EXCEPTION
                    WHEN duplicate_object THEN NULL;
                END $$
                """
        );
        jdbc.execute(
                """
                DO $$
                BEGIN
                    CREATE TYPE exam_status AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED');
                EXCEPTION
                    WHEN duplicate_object THEN NULL;
                END $$
                """
        );
        jdbc.execute(
                """
                CREATE TABLE IF NOT EXISTS exam (
                    id UUID PRIMARY KEY,
                    title TEXT NOT NULL,
                    format exam_format NOT NULL,
                    status exam_status NOT NULL,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
                )
                """
        );
        jdbc.execute("ALTER TABLE exam ADD COLUMN IF NOT EXISTS subject_id UUID");
        jdbc.execute("ALTER TABLE exam ADD COLUMN IF NOT EXISTS teacher_id TEXT");
        jdbc.execute(
                """
                CREATE TABLE IF NOT EXISTS subject (
                    id UUID PRIMARY KEY,
                    code TEXT NOT NULL UNIQUE,
                    name TEXT NOT NULL
                )
                """
        );
        jdbc.execute(
                """
                CREATE TABLE IF NOT EXISTS subject_teacher (
                    subject_id UUID NOT NULL REFERENCES subject(id),
                    teacher_id TEXT NOT NULL REFERENCES "User"(id),
                    PRIMARY KEY (subject_id, teacher_id)
                )
                """
        );
        jdbc.execute(
                """
                CREATE TABLE IF NOT EXISTS rubric (
                    id UUID PRIMARY KEY,
                    name TEXT NOT NULL,
                    criteria TEXT NOT NULL,
                    max_score INT NOT NULL
                )
                """
        );
        jdbc.execute(
                """
                CREATE TABLE IF NOT EXISTS bank_question (
                    id UUID PRIMARY KEY,
                    subject_id UUID NOT NULL REFERENCES subject(id),
                    topic TEXT NOT NULL,
                    prompt TEXT NOT NULL,
                    bloom TEXT NOT NULL,
                    rubric_id UUID NOT NULL REFERENCES rubric(id),
                    status TEXT NOT NULL,
                    source TEXT NOT NULL,
                    author_id TEXT NOT NULL REFERENCES "User"(id),
                    source_ref TEXT,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
                )
                """
        );
        jdbc.execute("ALTER TABLE bank_question ADD COLUMN IF NOT EXISTS source_ref TEXT");
        jdbc.execute(
                """
                CREATE TABLE IF NOT EXISTS course_document (
                    id UUID PRIMARY KEY,
                    teacher_id TEXT NOT NULL REFERENCES "User"(id),
                    subject_id UUID NOT NULL REFERENCES subject(id),
                    original_name TEXT NOT NULL,
                    content_type TEXT NOT NULL,
                    storage_path TEXT NOT NULL,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
                )
                """
        );
        jdbc.execute(
                """
                CREATE TABLE IF NOT EXISTS exam_question (
                    exam_id UUID NOT NULL REFERENCES exam(id),
                    question_id UUID NOT NULL REFERENCES bank_question(id),
                    PRIMARY KEY (exam_id, question_id)
                )
                """
        );
        jdbc.execute(
                """
                CREATE TABLE IF NOT EXISTS exam_attempt (
                    id UUID PRIMARY KEY,
                    exam_id UUID NOT NULL REFERENCES exam(id),
                    student_id TEXT NOT NULL REFERENCES "User"(id),
                    score INT,
                    entered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                    UNIQUE (exam_id, student_id)
                )
                """
        );
        jdbc.execute(
                """
                CREATE TABLE IF NOT EXISTS app_setting (
                    key TEXT PRIMARY KEY,
                    value TEXT NOT NULL
                )
                """
        );
        jdbc.update("INSERT INTO app_setting (key, value) VALUES ('stt_language', 'vi') ON CONFLICT (key) DO NOTHING");
        jdbc.update("INSERT INTO app_setting (key, value) VALUES ('tts_language', 'vi') ON CONFLICT (key) DO NOTHING");
    }
}
