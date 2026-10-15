package com.aives.config;

import jakarta.annotation.PostConstruct;
import javax.sql.DataSource;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.init.ResourceDatabasePopulator;
import org.springframework.stereotype.Component;

@Component
public class SchemaInitializer {

    private static final String SEED_KEY = "seed_applied";

    private final DataSource dataSource;
    private final JdbcTemplate jdbc;

    public SchemaInitializer(DataSource dataSource, JdbcTemplate jdbc) {
        this.dataSource = dataSource;
        this.jdbc = jdbc;
    }

    @PostConstruct
    void init() {
        ensureMetaTable();
        ensureAnswerColumns();
        if (isSeeded()) {
            return;
        }
        if (!hasAnyQuestions()) {
            new ResourceDatabasePopulator(new ClassPathResource("seed.sql")).execute(dataSource);
        }
        markSeeded();
    }

    /**
     * Databases created from an older schema (or on a branch without these migrations) can lack the
     * grading columns on {@code answer}; adding them idempotently keeps every machine's schema in step.
     */
    private void ensureAnswerColumns() {
        String[] columns = {
            "score numeric(5,2) CHECK (score IS NULL OR (score >= 0 AND score <= 100))",
            "is_sufficient boolean",
            "feedback text",
            "evaluator varchar(20)",
            "teacher_score numeric(5,2) CHECK (teacher_score IS NULL OR (teacher_score >= 0 AND teacher_score <= 100))",
            "teacher_feedback text",
            "graded_by uuid",
            "graded_at timestamptz"
        };
        for (String column : columns) {
            jdbc.execute("ALTER TABLE answer ADD COLUMN IF NOT EXISTS " + column);
        }
    }

    private void ensureMetaTable() {
        jdbc.execute(
                """
                CREATE TABLE IF NOT EXISTS app_meta (
                  key text PRIMARY KEY,
                  value text NOT NULL,
                  updated_at timestamptz NOT NULL DEFAULT now()
                )
                """
        );
    }

    private boolean hasAnyQuestions() {
        Integer count = jdbc.queryForObject("SELECT COUNT(*) FROM question", Integer.class);
        return count != null && count > 0;
    }

    private boolean isSeeded() {
        Integer count = jdbc.queryForObject(
                "SELECT COUNT(*) FROM app_meta WHERE key = ?",
                Integer.class,
                SEED_KEY
        );
        return count != null && count > 0;
    }

    private void markSeeded() {
        jdbc.update(
                """
                INSERT INTO app_meta (key, value) VALUES (?, 'true')
                ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()
                """,
                SEED_KEY
        );
    }
}
