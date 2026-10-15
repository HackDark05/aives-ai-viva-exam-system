package com.aives.config;

import java.time.Duration;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app")
public record AppProperties(
        String jwtSecret,
        Duration jwtTtl,
        String frontendUrl,
        String googleClientId,
        String documentsDir,
        Ai ai
) {
    public AppProperties {
        if (documentsDir == null || documentsDir.isBlank()) {
            documentsDir = "data/documents";
        }
        if (ai == null) {
            ai = new Ai("", "", "", "", null, null);
        }
    }

    /**
     * @param fallbackModels comma-separated models tried in order when the primary model is rate limited
     *                       or unavailable (free models often are)
     * @param timeout        per-request timeout for the AI API
     * @param maxRetries     retries per model on HTTP 429 / 5xx / network errors
     */
    public record Ai(
            String baseUrl,
            String apiKey,
            String model,
            String fallbackModels,
            Duration timeout,
            Integer maxRetries
    ) {
        public Ai {
            if (timeout == null || timeout.isZero() || timeout.isNegative()) {
                timeout = Duration.ofSeconds(30);
            }
            if (maxRetries == null || maxRetries < 0) {
                maxRetries = 2;
            }
        }

        public boolean configured() {
            return present(baseUrl) && present(apiKey) && present(model);
        }

        /** The primary model followed by the distinct fallback models. */
        public List<String> models() {
            List<String> models = new ArrayList<>();
            if (present(model)) {
                models.add(model.trim());
            }
            if (present(fallbackModels)) {
                Arrays.stream(fallbackModels.split(","))
                        .map(String::trim)
                        .filter(name -> !name.isBlank() && !models.contains(name))
                        .forEach(models::add);
            }
            return models;
        }

        private static boolean present(String value) {
            return value != null && !value.isBlank();
        }
    }
}
