package com.aives.rag;

import com.aives.web.ApiException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.ArrayList;
import java.util.List;
import org.springframework.http.HttpStatus;

public final class GeneratedQuestionParser {

    private GeneratedQuestionParser() {
    }

    public record Draft(String prompt, String source) {
    }

    public static List<Draft> parse(String content, int expectedCount, ObjectMapper mapper) {
        String json = unwrap(content);
        JsonNode root;
        try {
            root = mapper.readTree(json);
        } catch (Exception exception) {
            throw new ApiException(HttpStatus.BAD_GATEWAY, "The AI response was not valid JSON");
        }
        JsonNode questions = root.path("questions");
        if (!questions.isArray() || questions.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_GATEWAY, "The AI response did not include questions");
        }
        if (questions.size() > expectedCount) {
            throw new ApiException(HttpStatus.BAD_GATEWAY, "The AI response returned too many questions");
        }
        List<Draft> drafts = new ArrayList<>();
        for (JsonNode node : questions) {
            String prompt = node.path("prompt").asText("").trim();
            String source = node.path("source").asText("").trim();
            if (prompt.length() < 12 || source.isBlank()) {
                throw new ApiException(HttpStatus.BAD_GATEWAY, "A generated question was missing its prompt or source");
            }
            drafts.add(new Draft(prompt, source));
        }
        return drafts;
    }

    static String unwrap(String content) {
        String trimmed = content == null ? "" : content.trim();
        if (trimmed.startsWith("```")) {
            int start = trimmed.indexOf('\n');
            int end = trimmed.lastIndexOf("```");
            if (start > 0 && end > start) {
                return trimmed.substring(start + 1, end).trim();
            }
        }
        return trimmed;
    }
}
