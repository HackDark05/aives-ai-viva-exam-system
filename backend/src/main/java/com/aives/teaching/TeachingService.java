package com.aives.teaching;

import com.aives.knowledge.KnowledgeMatch;
import com.aives.knowledge.KnowledgeService;
import com.aives.teaching.DeskRecords.QuestionItem;
import com.aives.teaching.DeskRecords.RubricItem;
import com.aives.teaching.DeskRecords.SubjectItem;
import com.aives.user.PublicUser;
import com.aives.web.ApiException;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

@Service
public class TeachingService {

    private static final Set<String> BLOOM = Set.of("REMEMBER", "UNDERSTAND", "APPLY", "ANALYZE");
    private static final Set<String> FORMATS = Set.of("MULTIPLE_CHOICE", "ORAL");

    private final JdbcDeskRepository desk;
    private final KnowledgeService knowledge;

    public TeachingService(JdbcDeskRepository desk, KnowledgeService knowledge) {
        this.desk = desk;
        this.knowledge = knowledge;
    }

    public List<SubjectItem> mySubjects(PublicUser teacher) {
        return desk.subjectsForTeacher(teacher.id());
    }

    public List<RubricItem> rubrics() {
        return desk.rubrics();
    }

    public List<QuestionItem> questions(String status) {
        return desk.questions(status);
    }

    public QuestionItem create(PublicUser teacher, String subjectId, String topic, String prompt, String bloom, String rubricId) {
        requireSubject(teacher.id(), subjectId);
        return save(teacher.id(), subjectId, topic, prompt, bloom, rubricId, "APPROVED", "MANUAL");
    }

    public List<QuestionItem> importLines(
            PublicUser teacher,
            String subjectId,
            String topic,
            String bloom,
            String rubricId,
            String text
    ) {
        requireSubject(teacher.id(), subjectId);
        requireBloom(bloom);
        List<QuestionItem> created = new java.util.ArrayList<>();
        for (String line : text.split("\\R")) {
            String prompt = line.trim();
            if (prompt.isEmpty()) {
                continue;
            }
            created.add(save(teacher.id(), subjectId, topic, prompt, bloom, rubricId, "APPROVED", "IMPORT"));
        }
        if (created.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Paste at least one question");
        }
        return created;
    }

    public List<QuestionItem> generate(PublicUser teacher, String subjectId, String topic, String bloom, String rubricId) {
        requireSubject(teacher.id(), subjectId);
        requireBloom(bloom);
        List<KnowledgeMatch> matches = knowledge.search(topic, 4);
        if (matches.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "No course material matches that topic. Add a passage first.");
        }
        List<QuestionItem> created = new java.util.ArrayList<>();
        for (KnowledgeMatch match : matches) {
            String prompt = "From \"" + match.title() + "\": " + firstSentence(match.content());
            created.add(save(teacher.id(), subjectId, topic, prompt, bloom, rubricId, "PENDING_REVIEW", "AI"));
        }
        return created;
    }

    public QuestionItem review(String id, String prompt, String bloom, String status) {
        QuestionItem current = desk.question(id);
        if (current == null) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Question not found");
        }
        requireBloom(bloom);
        if (!Set.of("PENDING_REVIEW", "APPROVED", "REJECTED").contains(status)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Unknown question status");
        }
        desk.updateQuestion(id, prompt.trim(), bloom, status);
        return desk.question(id);
    }

    public void startExam(PublicUser teacher, String title, String format, String subjectId, List<String> questionIds) {
        requireSubject(teacher.id(), subjectId);
        if (!FORMATS.contains(format)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Format must be multiple choice or oral");
        }
        UUID examId = UUID.randomUUID();
        desk.insertExam(examId, title.trim(), format, teacher.id(), subjectId);
        for (String questionId : questionIds) {
            QuestionItem question = desk.question(questionId);
            if (question == null || !"APPROVED".equals(question.status())) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Only approved questions can start a test");
            }
            desk.linkQuestion(examId.toString(), questionId);
        }
    }

    public List<DeskRecords.AttemptItem> scores(PublicUser teacher) {
        return desk.attemptsForTeacher(teacher.id());
    }

    public void score(PublicUser teacher, String attemptId, int score) {
        if (score < 0 || score > 100) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Score must be between 0 and 100");
        }
        desk.setScore(attemptId, teacher.id(), score);
    }

    private QuestionItem save(
            String authorId,
            String subjectId,
            String topic,
            String prompt,
            String bloom,
            String rubricId,
            String status,
            String source
    ) {
        if (prompt == null || prompt.isBlank() || topic == null || topic.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Topic and prompt are required");
        }
        requireBloom(bloom);
        UUID id = UUID.randomUUID();
        desk.insertQuestion(id, subjectId, topic.trim(), prompt.trim(), bloom, rubricId, status, source, authorId);
        return desk.question(id.toString());
    }

    private void requireSubject(String teacherId, String subjectId) {
        if (!desk.teacherOwnsSubject(teacherId, subjectId)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "You are not assigned to that subject");
        }
    }

    private static void requireBloom(String bloom) {
        if (!BLOOM.contains(bloom)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Bloom level must be remember, understand, apply, or analyze");
        }
    }

    private static String firstSentence(String content) {
        String trimmed = content.trim();
        int stop = trimmed.indexOf('.');
        if (stop < 0 || stop > 220) {
            return trimmed.length() > 220 ? trimmed.substring(0, 220) : trimmed;
        }
        return trimmed.substring(0, stop + 1);
    }
}
