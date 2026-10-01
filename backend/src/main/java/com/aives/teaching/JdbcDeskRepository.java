package com.aives.teaching;

import com.aives.teaching.DeskRecords.AttemptItem;
import com.aives.teaching.DeskRecords.QuestionItem;
import com.aives.teaching.DeskRecords.RubricItem;
import com.aives.teaching.DeskRecords.SessionItem;
import com.aives.teaching.DeskRecords.SpeechSettings;
import com.aives.teaching.DeskRecords.SubjectItem;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class JdbcDeskRepository {

    private final JdbcTemplate jdbc;

    public JdbcDeskRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public List<SubjectItem> subjects() {
        return jdbc.query(
                """
                SELECT id::text, code, name FROM subject ORDER BY code
                """,
                (rs, row) -> new SubjectItem(
                        rs.getString(1),
                        rs.getString(2),
                        rs.getString(3),
                        teacherIds(rs.getString(1))
                )
        );
    }

    public List<String> teacherIds(String subjectId) {
        return jdbc.query(
                """
                SELECT teacher_id FROM subject_teacher WHERE subject_id = ?::uuid
                """,
                (rs, row) -> rs.getString(1),
                subjectId
        );
    }

    public void insertSubject(UUID id, String code, String name) {
        jdbc.update(
                "INSERT INTO subject (id, code, name) VALUES (?::uuid, ?, ?)",
                id.toString(),
                code,
                name
        );
    }

    public void assignTeacher(String subjectId, String teacherId) {
        jdbc.update(
                """
                INSERT INTO subject_teacher (subject_id, teacher_id)
                VALUES (?::uuid, ?)
                ON CONFLICT DO NOTHING
                """,
                subjectId,
                teacherId
        );
    }

    public List<RubricItem> rubrics() {
        return jdbc.query(
                "SELECT id::text, name, criteria, max_score FROM rubric ORDER BY name",
                (rs, row) -> new RubricItem(rs.getString(1), rs.getString(2), rs.getString(3), rs.getInt(4))
        );
    }

    public void insertRubric(UUID id, String name, String criteria, int maxScore) {
        jdbc.update(
                "INSERT INTO rubric (id, name, criteria, max_score) VALUES (?::uuid, ?, ?, ?)",
                id.toString(),
                name,
                criteria,
                maxScore
        );
    }

    public List<QuestionItem> questions(String status) {
        String sql = """
                SELECT q.id::text, q.subject_id::text, s.name, q.topic, q.prompt, q.bloom,
                       q.rubric_id::text, r.name, r.criteria, r.max_score, q.status, q.source, u.name,
                       q.source_ref
                FROM bank_question q
                JOIN subject s ON s.id = q.subject_id
                JOIN rubric r ON r.id = q.rubric_id
                JOIN "User" u ON u.id = q.author_id
                """;
        if (status == null || status.isBlank()) {
            return jdbc.query(sql + " ORDER BY q.created_at DESC", questionMapper());
        }
        return jdbc.query(sql + " WHERE q.status = ? ORDER BY q.created_at DESC", questionMapper(), status);
    }

    public void insertQuestion(
            UUID id,
            String subjectId,
            String topic,
            String prompt,
            String bloom,
            String rubricId,
            String status,
            String source,
            String authorId,
            String sourceRef
    ) {
        jdbc.update(
                """
                INSERT INTO bank_question
                    (id, subject_id, topic, prompt, bloom, rubric_id, status, source, author_id, source_ref)
                VALUES (?::uuid, ?::uuid, ?, ?, ?, ?::uuid, ?, ?, ?, ?)
                """,
                id.toString(),
                subjectId,
                topic,
                prompt,
                bloom,
                rubricId,
                status,
                source,
                authorId,
                sourceRef
        );
    }

    public void updateQuestion(String id, String prompt, String bloom, String status) {
        jdbc.update(
                """
                UPDATE bank_question
                SET prompt = ?, bloom = ?, status = ?
                WHERE id = ?::uuid
                """,
                prompt,
                bloom,
                status,
                id
        );
    }

    public QuestionItem question(String id) {
        List<QuestionItem> rows = jdbc.query(
                """
                SELECT q.id::text, q.subject_id::text, s.name, q.topic, q.prompt, q.bloom,
                       q.rubric_id::text, r.name, r.criteria, r.max_score, q.status, q.source, u.name,
                       q.source_ref
                FROM bank_question q
                JOIN subject s ON s.id = q.subject_id
                JOIN rubric r ON r.id = q.rubric_id
                JOIN "User" u ON u.id = q.author_id
                WHERE q.id = ?::uuid
                """,
                questionMapper(),
                id
        );
        return rows.isEmpty() ? null : rows.getFirst();
    }

    public void insertExam(UUID id, String title, String format, String teacherId, String subjectId) {
        jdbc.update(
                """
                INSERT INTO exam (id, title, format, status, subject_id, teacher_id)
                VALUES (?::uuid, ?, ?::exam_format, 'IN_PROGRESS'::exam_status, ?::uuid, ?)
                """,
                id.toString(),
                title,
                format,
                subjectId,
                teacherId
        );
    }

    public void linkQuestion(String examId, String questionId) {
        jdbc.update(
                """
                INSERT INTO exam_question (exam_id, question_id)
                VALUES (?::uuid, ?::uuid)
                ON CONFLICT DO NOTHING
                """,
                examId,
                questionId
        );
    }

    public List<SessionItem> sessionsForStudent(String studentId) {
        return jdbc.query(
                """
                SELECT e.id::text, e.title, e.format::text, e.status::text,
                       COALESCE(s.name, 'General'), COALESCE(t.name, 'Unassigned'),
                       a.id IS NOT NULL, a.score
                FROM exam e
                LEFT JOIN subject s ON s.id = e.subject_id
                LEFT JOIN "User" t ON t.id = e.teacher_id
                LEFT JOIN exam_attempt a ON a.exam_id = e.id AND a.student_id = ?
                WHERE e.status = 'IN_PROGRESS'
                ORDER BY e.created_at DESC
                """,
                (rs, row) -> new SessionItem(
                        rs.getString(1),
                        rs.getString(2),
                        rs.getString(3),
                        rs.getString(4),
                        rs.getString(5),
                        rs.getString(6),
                        rs.getBoolean(7),
                        (Integer) rs.getObject(8)
                ),
                studentId
        );
    }

    public List<QuestionItem> questionsOnExam(String examId) {
        return jdbc.query(
                """
                SELECT q.id::text, q.subject_id::text, s.name, q.topic, q.prompt, q.bloom,
                       q.rubric_id::text, r.name, r.criteria, r.max_score, q.status, q.source, u.name,
                       q.source_ref
                FROM exam_question eq
                JOIN bank_question q ON q.id = eq.question_id
                JOIN subject s ON s.id = q.subject_id
                JOIN rubric r ON r.id = q.rubric_id
                JOIN "User" u ON u.id = q.author_id
                WHERE eq.exam_id = ?::uuid
                """,
                questionMapper(),
                examId
        );
    }

    public void enterExam(UUID attemptId, String examId, String studentId) {
        jdbc.update(
                """
                INSERT INTO exam_attempt (id, exam_id, student_id)
                VALUES (?::uuid, ?::uuid, ?)
                ON CONFLICT (exam_id, student_id) DO NOTHING
                """,
                attemptId.toString(),
                examId,
                studentId
        );
    }

    public List<AttemptItem> attemptsForTeacher(String teacherId) {
        return jdbc.query(
                """
                SELECT a.id::text, e.id::text, e.title, s.name, COALESCE(t.name, ''), a.score, e.status::text
                FROM exam_attempt a
                JOIN exam e ON e.id = a.exam_id
                JOIN "User" s ON s.id = a.student_id
                LEFT JOIN "User" t ON t.id = e.teacher_id
                WHERE e.teacher_id = ?
                ORDER BY a.entered_at DESC
                """,
                attemptMapper(),
                teacherId
        );
    }

    public List<AttemptItem> attemptsForStudent(String studentId) {
        return jdbc.query(
                """
                SELECT a.id::text, e.id::text, e.title, s.name, COALESCE(t.name, ''), a.score, e.status::text
                FROM exam_attempt a
                JOIN exam e ON e.id = a.exam_id
                JOIN "User" s ON s.id = a.student_id
                LEFT JOIN "User" t ON t.id = e.teacher_id
                WHERE a.student_id = ?
                ORDER BY a.entered_at DESC
                """,
                attemptMapper(),
                studentId
        );
    }

    public List<AttemptItem> allAttempts() {
        return jdbc.query(
                """
                SELECT a.id::text, e.id::text, e.title, s.name, COALESCE(t.name, ''), a.score, e.status::text
                FROM exam_attempt a
                JOIN exam e ON e.id = a.exam_id
                JOIN "User" s ON s.id = a.student_id
                LEFT JOIN "User" t ON t.id = e.teacher_id
                ORDER BY a.entered_at DESC
                """,
                attemptMapper()
        );
    }

    public void setScore(String attemptId, String teacherId, int score) {
        jdbc.update(
                """
                UPDATE exam_attempt a
                SET score = ?
                FROM exam e
                WHERE a.id = ?::uuid AND a.exam_id = e.id AND e.teacher_id = ?
                """,
                score,
                attemptId,
                teacherId
        );
    }

    public SpeechSettings speechSettings() {
        String stt = setting("stt_language", "vi");
        String tts = setting("tts_language", "vi");
        return new SpeechSettings(stt, tts);
    }

    public void saveSpeech(String sttLanguage, String ttsLanguage) {
        upsert("stt_language", sttLanguage);
        upsert("tts_language", ttsLanguage);
    }

    public boolean teacherOwnsSubject(String teacherId, String subjectId) {
        Integer count = jdbc.queryForObject(
                """
                SELECT count(*) FROM subject_teacher
                WHERE teacher_id = ? AND subject_id = ?::uuid
                """,
                Integer.class,
                teacherId,
                subjectId
        );
        return count != null && count > 0;
    }

    public List<SubjectItem> subjectsForTeacher(String teacherId) {
        return jdbc.query(
                """
                SELECT s.id::text, s.code, s.name
                FROM subject s
                JOIN subject_teacher st ON st.subject_id = s.id
                WHERE st.teacher_id = ?
                ORDER BY s.code
                """,
                (rs, row) -> new SubjectItem(rs.getString(1), rs.getString(2), rs.getString(3), List.of(teacherId)),
                teacherId
        );
    }

    private String setting(String key, String fallback) {
        List<String> values = jdbc.query(
                "SELECT value FROM app_setting WHERE key = ?",
                (rs, row) -> rs.getString(1),
                key
        );
        return values.isEmpty() ? fallback : values.getFirst();
    }

    private void upsert(String key, String value) {
        jdbc.update(
                """
                INSERT INTO app_setting (key, value) VALUES (?, ?)
                ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
                """,
                key,
                value
        );
    }

    private static org.springframework.jdbc.core.RowMapper<QuestionItem> questionMapper() {
        return (rs, row) -> new QuestionItem(
                rs.getString(1),
                rs.getString(2),
                rs.getString(3),
                rs.getString(4),
                rs.getString(5),
                rs.getString(6),
                rs.getString(7),
                rs.getString(8),
                rs.getString(9),
                rs.getInt(10),
                rs.getString(11),
                rs.getString(12),
                rs.getString(13),
                rs.getString(14)
        );
    }

    private static org.springframework.jdbc.core.RowMapper<AttemptItem> attemptMapper() {
        return (rs, row) -> new AttemptItem(
                rs.getString(1),
                rs.getString(2),
                rs.getString(3),
                rs.getString(4),
                rs.getString(5),
                (Integer) rs.getObject(6),
                rs.getString(7)
        );
    }
}
