package com.aives.config;

import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app")
public record AppProperties(
        String jwtSecret,
        Duration jwtTtl,
        String frontendUrl,
        String demoPassword,
        String googleClientId
) {
}
