package com.aives.config;

import java.time.Duration;
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
            ai = new Ai("", "", "");
        }
    }

    public record Ai(String baseUrl, String apiKey, String model) {
        public boolean configured() {
            return present(baseUrl) && present(apiKey) && present(model);
        }

        private static boolean present(String value) {
            return value != null && !value.isBlank();
        }
    }
}
