package com.aives.teaching;

import com.aives.config.AppProperties;
import com.aives.teaching.AttemptScoring.WeightedQuestion;
import com.aives.teaching.DeskRecords.QuestionItem;
import com.aives.teaching.DeskRecords.SubmitAttemptResult;
import com.aives.teaching.DeskRecords.VivaEvaluationItem;
import com.aives.teaching.DeskRecords.VivaTurnItem;
import com.aives.user.PublicUser;
import com.aives.web.ApiException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

@Service
public class VivaEvaluationService {

    private final AppProperties properties;
    private final ObjectMapper mapper;
    private final JdbcDeskRepository desk;
    private final RestClient http;

    public VivaEvaluationService(AppProperties properties, ObjectMapper mapper, JdbcDeskRepository desk) {
        this.properties = properties;
        this.mapper = mapper;
        this.desk = desk;
        this.http = RestClient.create();
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
                evaluation.feedback()
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
                evaluation.feedback()
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
        List<WeightedQuestion> questions = desk.questionsOnExam(examId).stream()
                .map(question -> new WeightedQuestion(question.id(), question.maxScore()))
                .toList();
        Map<String, Double> best = desk.bestAnswerScores(attemptId);
        int finalScore = AttemptScoring.finalScore(questions, best);
        if (!desk.submitAttempt(attemptId, finalScore)) {
            throw new ApiException(HttpStatus.CONFLICT, "This exam has already been submitted");
        }
        int answered = (int) questions.stream().filter(question -> best.containsKey(question.questionId())).count();
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

        if (properties.ai().configured()) {
            try {
                return callAiEvaluator(question, cleanAnswer, isFollowUp, turnId, questionId);
            } catch (Exception exception) {
                // If remote LLM fails, cleanly fallback to rule-based evaluation
            }
        }

        return fallbackRuleEvaluator(question, cleanAnswer, isFollowUp, turnId, questionId);
    }

    private VivaEvaluationItem callAiEvaluator(
            QuestionItem question,
            String studentAnswer,
            boolean isFollowUp,
            String turnId,
            String questionId
    ) {
        String responseLang = detectPromptLanguage(question.prompt());
        String prompt = """
                You are a professional viva examiner.
                Evaluate the student's spoken answer (STT transcript) against the question and model answer.

                Question: %s
                Topic: %s
                Bloom level: %s
                Model answer: %s
                Key points: %s
                Rubric criteria: %s

                Student answer:
                "%s"

                Rules:
                1. Judge whether the student covered the key points.
                2. If important points are missing AND this is NOT already a follow-up (isFollowUp = %b): ask ONE short follow-up question.
                3. If the answer is sufficient or this is already a follow-up: followUpQuestion = null.
                4. feedback: 1-2 short sentences.
                5. score: integer 0-100.
                6. Write feedback and followUpQuestion in %s (same language as the exam question).

                Return JSON only:
                {"score": 85, "isSufficient": true, "feedback": "...", "followUpQuestion": null}
                """.formatted(
                question.prompt(),
                question.topic(),
                question.bloom(),
                question.expectedAnswer() == null ? "" : question.expectedAnswer(),
                question.keyPoints() == null ? "" : question.keyPoints(),
                question.criteria() == null ? "" : question.criteria(),
                studentAnswer,
                isFollowUp,
                responseLang
        );

        String base = properties.ai().baseUrl().replaceAll("/+$", "");
        Map<String, Object> body = Map.of(
                "model", properties.ai().model(),
                "temperature", 0.2,
                "messages", List.of(
                        Map.of("role", "system", "content", "You are a viva examiner. Return valid JSON only."),
                        Map.of("role", "user", "content", prompt)
                )
        );

        String response = http.post()
                .uri(base + "/chat/completions")
                .header("Authorization", "Bearer " + properties.ai().apiKey())
                .header("Content-Type", "application/json")
                .header("HTTP-Referer", properties.frontendUrl())
                .header("X-Title", "AIVES")
                .body(body)
                .retrieve()
                .body(String.class);

        return parseAiResponse(response, turnId, questionId);
    }

    private VivaEvaluationItem parseAiResponse(String rawJson, String turnId, String questionId) {
        try {
            JsonNode root = mapper.readTree(rawJson);
            String content = root.path("choices").path(0).path("message").path("content").asText();
            String cleaned = content.replaceAll("```json", "").replaceAll("```", "").trim();
            JsonNode data = mapper.readTree(cleaned);

            int score = Math.max(0, Math.min(100, data.path("score").asInt(75)));
            boolean isSufficient = data.path("isSufficient").asBoolean(true);
            String feedback = data.path("feedback").asText("Đã ghi nhận câu trả lời của bạn.");
            String followUp = data.hasNonNull("followUpQuestion") && !data.path("followUpQuestion").asText().isBlank()
                    ? data.path("followUpQuestion").asText().trim()
                    : null;

            return new VivaEvaluationItem(turnId, questionId, score, isSufficient, feedback, followUp);
        } catch (Exception e) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Không thể xử lý phản hồi từ AI");
        }
    }

    private VivaEvaluationItem fallbackRuleEvaluator(
            QuestionItem question,
            String studentAnswer,
            boolean isFollowUp,
            String turnId,
            String questionId
    ) {
        boolean english = "English".equals(detectPromptLanguage(question.prompt()));

        if (studentAnswer.isBlank()) {
            return new VivaEvaluationItem(
                    turnId,
                    questionId,
                    0,
                    false,
                    english
                            ? "No spoken answer was captured. Please enable the microphone and try again."
                            : "Chưa ghi nhận được âm thanh trả lời. Vui lòng bật micro và nói lại.",
                    english
                            ? "Could you please present your answer again?"
                            : "Em có thể trình bày lại câu trả lời được không?"
            );
        }

        String lowerAnswer = studentAnswer.toLowerCase(Locale.ROOT);
        String keyPointsStr = question.keyPoints() == null ? "" : question.keyPoints();
        String[] points = Arrays.stream(keyPointsStr.split("[;,\n]"))
                .map(String::trim)
                .filter(s -> !s.isBlank())
                .toArray(String[]::new);

        int matched = 0;
        String missingPoint = null;
        for (String p : points) {
            if (lowerAnswer.contains(p.toLowerCase(Locale.ROOT))) {
                matched++;
            } else if (missingPoint == null) {
                missingPoint = p;
            }
        }

        double ratio = points.length == 0 ? 0.8 : (double) matched / points.length;
        int score = (int) Math.round(50 + 45 * Math.min(1.0, ratio + (studentAnswer.length() > 50 ? 0.2 : 0)));
        score = Math.max(40, Math.min(95, score));

        boolean isSufficient = ratio >= 0.5 || isFollowUp;
        String feedback;
        String followUp = null;

        if (isSufficient) {
            feedback = english
                    ? "Your answer covered the main points about " + question.topic() + "."
                    : "Câu trả lời của bạn đã bao quát tốt các ý trọng tâm về " + question.topic() + ".";
        } else {
            feedback = english
                    ? "You covered some points, but a key idea still needs clarification."
                    : "Bạn đã nêu được một số ý, tuy nhiên cần làm rõ hơn về điểm trọng tâm.";
            if (missingPoint != null) {
                followUp = english
                        ? "Could you explain more about: " + missingPoint + "?"
                        : "Em có thể nói rõ hơn về khía cạnh: " + missingPoint + " được không?";
            } else {
                followUp = english
                        ? "Could you add a concrete example or a deeper analysis?"
                        : "Em có thể bổ sung thêm ví dụ thực tế hoặc phân tích sâu hơn được không?";
            }
        }

        return new VivaEvaluationItem(turnId, questionId, score, isSufficient, feedback, followUp);
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
