package com.aives.teaching;

import com.aives.ai.ChatCompletionClient;
import com.aives.ai.ChatCompletionClient.AiUnavailableException;
import com.aives.ai.ChatCompletionClient.Completion;
import com.aives.teaching.DeskRecords.QuestionItem;
import com.aives.teaching.DeskRecords.RubricCriterionItem;
import com.aives.teaching.DeskRecords.RubricDetailItem;
import com.aives.teaching.DeskRecords.SubmitAttemptResult;
import com.aives.teaching.DeskRecords.VivaEvaluationItem;
import com.aives.teaching.DeskRecords.VivaTurnItem;
import com.aives.teaching.GradingResponseParser.InvalidGradingResponse;
import com.aives.user.PublicUser;
import com.aives.web.ApiException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class VivaEvaluationService {

    private static final Logger log = LoggerFactory.getLogger(VivaEvaluationService.class);

    private final ObjectMapper mapper;
    private final JdbcDeskRepository desk;
    private final ChatCompletionClient ai;

    public VivaEvaluationService(ObjectMapper mapper, JdbcDeskRepository desk, ChatCompletionClient ai) {
        this.mapper = mapper;
        this.desk = desk;
        this.ai = ai;
    }

    @Transactional
    public VivaEvaluationItem evaluateMainQuestion(
            PublicUser student,
            String examId,
            String questionId,
            String studentAnswer,
            Integer durationMs
    ) {
        String attemptId = openAttempt(examId, student.id());
        QuestionItem question = desk.questionsOnExam(examId).stream()
                .filter(item -> item.id().equals(questionId))
                .findFirst()
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Question not found on this exam"));

        UUID turnId = UUID.randomUUID();
        int turnNo = desk.nextTurnNo(attemptId);
        desk.insertTurn(turnId, attemptId, questionId, null, turnNo, "MAIN", null, question.prompt());

        VivaEvaluationItem evaluation = evaluate(question, studentAnswer, false, turnId.toString(), questionId);

        desk.insertAnswer(
                UUID.randomUUID(),
                turnId.toString(),
                studentAnswer,
                !evaluation.isSufficient() && evaluation.followUpQuestion() != null,
                evaluation.isSufficient() ? null : "MISSING_KEY_POINTS",
                durationMs,
                evaluation.score(),
                evaluation.isSufficient(),
                evaluation.feedback(),
                evaluation.evaluator()
        );

        return evaluation;
    }

    @Transactional
    public VivaEvaluationItem evaluateFollowUp(
            PublicUser student,
            String examId,
            String parentTurnId,
            String studentAnswer,
            Integer durationMs
    ) {
        String attemptId = openAttempt(examId, student.id());

        // Find parent turn to associate question
        List<VivaTurnItem> previousTurns = desk.turnsForAttempt(attemptId);
        VivaTurnItem parent = previousTurns.stream()
                .filter(t -> t.turnId().equals(parentTurnId))
                .findFirst()
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Previous question turn not found"));

        QuestionItem question = desk.question(parent.questionId());
        if (question == null) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Associated question not found");
        }

        UUID turnId = UUID.randomUUID();
        int turnNo = desk.nextTurnNo(attemptId);
        desk.insertTurn(turnId, attemptId, parent.questionId(), parentTurnId, turnNo, "FOLLOW_UP", 1, "Follow-up discussion");

        VivaEvaluationItem evaluation = evaluate(question, studentAnswer, true, turnId.toString(), parent.questionId());

        desk.insertAnswer(
                UUID.randomUUID(),
                turnId.toString(),
                studentAnswer,
                false,
                null,
                durationMs,
                evaluation.score(),
                evaluation.isSufficient(),
                evaluation.feedback(),
                evaluation.evaluator()
        );

        return evaluation;
    }

    public List<VivaTurnItem> getTurns(PublicUser student, String examId) {
        String attemptId = desk.findAttemptId(examId, student.id());
        if (attemptId == null) {
            return List.of();
        }
        return desk.turnsForAttempt(attemptId);
    }

    /**
     * Submits the attempt with a score computed from the answers stored on the server. Any score the
     * client might send is ignored.
     */
    @Transactional
    public SubmitAttemptResult submitExam(PublicUser student, String examId) {
        String attemptId = openAttempt(examId, student.id());
        List<String> questions = desk.questionsOnExam(examId).stream().map(QuestionItem::id).toList();
        Map<String, Double> best = desk.bestAnswerScores(attemptId);
        int finalScore = AttemptScoring.finalScore(questions, best);
        if (!desk.submitAttempt(attemptId, finalScore)) {
            throw new ApiException(HttpStatus.CONFLICT, "This exam has already been submitted");
        }
        int answered = (int) questions.stream().filter(best::containsKey).count();
        return new SubmitAttemptResult(finalScore, answered, questions.size());
    }

    /** Returns the student's attempt, creating it if needed, and rejects changes once it is submitted. */
    private String openAttempt(String examId, String studentId) {
        String attemptId = getOrCreateAttempt(examId, studentId);
        if ("SUBMITTED".equals(desk.attemptStatus(attemptId))) {
            throw new ApiException(HttpStatus.CONFLICT, "This exam has already been submitted");
        }
        return attemptId;
    }

    private String getOrCreateAttempt(String examId, String studentId) {
        String attemptId = desk.findAttemptId(examId, studentId);
        if (attemptId == null) {
            UUID newId = UUID.randomUUID();
            desk.enterExam(newId, examId, studentId);
            return newId.toString();
        }
        return attemptId;
    }

    private VivaEvaluationItem evaluate(
            QuestionItem question,
            String studentAnswer,
            boolean isFollowUp,
            String turnId,
            String questionId
    ) {
        String cleanAnswer = studentAnswer == null ? "" : studentAnswer.trim();
        String language = detectPromptLanguage(question.prompt());

        String fallbackReason;
        if (!ai.configured()) {
            fallbackReason = "AI grader is not configured";
        } else if (cleanAnswer.isBlank()) {
            fallbackReason = "No answer was captured";
        } else {
            List<RubricCriterionItem> criteria = rubricCriteria(question);
            try {
                Completion completion = ai.complete(Map.of(
                        "temperature", 0.1,
                        "response_format", Map.of("type", "json_object"),
                        "messages", GradingPrompt.messages(question, criteria, cleanAnswer, isFollowUp, language)
                ));
                Grade grade = GradingResponseParser.parse(completion.content(), criteria, mapper);
                return item(grade, isFollowUp, turnId, questionId, "AI", null);
            } catch (AiUnavailableException exception) {
                fallbackReason = "AI grader unavailable: " + exception.getMessage();
            } catch (InvalidGradingResponse exception) {
                fallbackReason = "AI grader returned an invalid result: " + exception.getMessage();
            }
            log.warn("Falling back to rule-based grading for question {} (turn {}): {}", questionId, turnId, fallbackReason);
        }

        Grade grade = RuleBasedGrader.grade(question, cleanAnswer, isFollowUp, "English".equals(language));
        return item(grade, isFollowUp, turnId, questionId, "RULE_BASED", fallbackReason);
    }

    private List<RubricCriterionItem> rubricCriteria(QuestionItem question) {
        if (question.rubricId() == null) {
            return List.of();
        }
        RubricDetailItem rubric = desk.rubricDetail(question.rubricId());
        return rubric == null ? List.of() : rubric.criteria();
    }

    private static VivaEvaluationItem item(
            Grade grade,
            boolean isFollowUp,
            String turnId,
            String questionId,
            String evaluator,
            String fallbackReason
    ) {
        // A follow-up is the last turn for a question, so it never asks another one.
        String followUp = isFollowUp || grade.sufficient() ? null : grade.followUpQuestion();
        return new VivaEvaluationItem(
                turnId,
                questionId,
                grade.score(),
                grade.sufficient(),
                grade.feedback(),
                followUp,
                evaluator,
                fallbackReason,
                grade.criteria()
        );
    }

    private static String detectPromptLanguage(String prompt) {
        if (prompt == null || prompt.isBlank()) {
            return "Vietnamese";
        }
        // Vietnamese diacritics → Vietnamese; otherwise treat Latin-only as English
        if (prompt.matches("(?s).*[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ].*")) {
            return "Vietnamese";
        }
        long letters = prompt.chars().filter(Character::isLetter).count();
        long ascii = prompt.chars().filter(c -> (c >= 'A' && c <= 'Z') || (c >= 'a' && c <= 'z')).count();
        if (letters > 0 && (double) ascii / letters >= 0.85) {
            return "English";
        }
        return "Vietnamese";
    }
}
