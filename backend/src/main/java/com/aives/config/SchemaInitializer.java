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
        jdbc.execute("CREATE UNIQUE INDEX IF NOT EXISTS \"User_email_key\" ON \"User\" (email)");
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
    }
}
