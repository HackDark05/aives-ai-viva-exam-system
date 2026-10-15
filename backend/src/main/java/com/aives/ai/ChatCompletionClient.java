package com.aives.ai;

import com.aives.config.AppProperties;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Duration;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

/**
 * Calls an OpenAI-compatible {@code /chat/completions} endpoint. Rate limits (429), server errors and
 * network failures are retried with backoff, then the next configured fallback model is tried. When every
 * model fails an {@link AiUnavailableException} explains why, so callers can degrade visibly.
 */
@Component
public class ChatCompletionClient {

    private static final Logger log = LoggerFactory.getLogger(ChatCompletionClient.class);
    private static final Duration MAX_BACKOFF = Duration.ofSeconds(10);

    private final AppProperties properties;
    private final ObjectMapper mapper;
    private final RestClient http;
    private final Sleeper sleeper;

    @Autowired
    public ChatCompletionClient(AppProperties properties, ObjectMapper mapper) {
        this(properties, mapper, RestClient.builder().requestFactory(timeouts(properties.ai().timeout())).build(),
                Thread::sleep);
    }

    ChatCompletionClient(AppProperties properties, ObjectMapper mapper, RestClient http, Sleeper sleeper) {
        this.properties = properties;
        this.mapper = mapper;
        this.http = http;
        this.sleeper = sleeper;
    }

    public boolean configured() {
        return properties.ai().configured();
    }

    /**
     * @param body request fields other than {@code model}, e.g. messages and temperature
     */
    public Completion complete(Map<String, Object> body) {
        if (!configured()) {
            throw new AiUnavailableException("AI API is not configured");
        }
        AppProperties.Ai ai = properties.ai();
        String url = ai.baseUrl().replaceAll("/+$", "") + "/chat/completions";
        String lastFailure = "no model configured";
        for (String model : ai.models()) {
            Map<String, Object> request = new HashMap<>(body);
            request.put("model", model);
            for (int attempt = 0; attempt <= ai.maxRetries(); attempt++) {
                try {
                    String response = http.post()
                            .uri(url)
                            .header("Authorization", "Bearer " + ai.apiKey())
                            .header("Content-Type", "application/json")
                            .header("HTTP-Referer", properties.frontendUrl())
                            .header("X-Title", "AIVES")
                            .body(request)
                            .retrieve()
                            .body(String.class);
                    return new Completion(content(response), model);
                } catch (RestClientResponseException exception) {
                    int status = exception.getStatusCode().value();
                    lastFailure = model + " returned HTTP " + status;
                    if (!retryable(status)) {
                        log.warn("AI request failed ({}); trying next model", lastFailure);
                        break;
                    }
                    Duration wait = backoff(attempt, exception.getResponseHeaders() == null
                            ? null : exception.getResponseHeaders().getFirst("Retry-After"));
                    log.warn("AI request failed ({}), attempt {}/{}", lastFailure, attempt + 1, ai.maxRetries() + 1);
                    if (attempt < ai.maxRetries()) {
                        pause(wait);
                    }
                } catch (RestClientException exception) {
                    lastFailure = model + " could not be reached: " + exception.getMessage();
                    log.warn("AI request failed ({}), attempt {}/{}", lastFailure, attempt + 1, ai.maxRetries() + 1);
                    if (attempt < ai.maxRetries()) {
                        pause(backoff(attempt, null));
                    }
                } catch (EmptyCompletionException exception) {
                    lastFailure = model + " returned an empty or unreadable message";
                    log.warn("AI request failed ({}); trying next model", lastFailure);
                    break;
                }
            }
        }
        throw new AiUnavailableException(lastFailure);
    }

    private String content(String response) {
        try {
            JsonNode content = mapper.readTree(response).path("choices").path(0).path("message").path("content");
            if (content.isMissingNode() || content.asText().isBlank()) {
                throw new EmptyCompletionException();
            }
            return content.asText();
        } catch (EmptyCompletionException exception) {
            throw exception;
        } catch (Exception exception) {
            throw new EmptyCompletionException();
        }
    }

    private static boolean retryable(int status) {
        return status == 408 || status == 429 || status >= 500;
    }

    static Duration backoff(int attempt, String retryAfter) {
        if (retryAfter != null) {
            try {
                Duration requested = Duration.ofSeconds(Long.parseLong(retryAfter.trim()));
                return requested.compareTo(MAX_BACKOFF) > 0 ? MAX_BACKOFF : requested;
            } catch (NumberFormatException ignored) {
                // HTTP-date form: fall back to exponential backoff
            }
        }
        long millis = 500L * (1L << Math.min(attempt, 4));
        return Duration.ofMillis(Math.min(millis, MAX_BACKOFF.toMillis()));
    }

    private void pause(Duration wait) {
        try {
            sleeper.sleep(wait.toMillis());
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new AiUnavailableException("interrupted while waiting to retry");
        }
    }

    private static SimpleClientHttpRequestFactory timeouts(Duration timeout) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(timeout);
        factory.setReadTimeout(timeout);
        return factory;
    }

    public record Completion(String content, String model) {
    }

    @FunctionalInterface
    interface Sleeper {
        void sleep(long millis) throws InterruptedException;
    }

    private static final class EmptyCompletionException extends RuntimeException {
    }

    /** Every configured model failed; the message says why the last one did. */
    public static final class AiUnavailableException extends RuntimeException {
        public AiUnavailableException(String message) {
            super(message);
        }
    }

    /** Messages helper so callers do not repeat the map shape. */
    public static Map<String, Object> message(String role, String content) {
        return Map.of("role", role, "content", content);
    }

    public static Map<String, Object> request(List<Map<String, Object>> messages, double temperature) {
        return Map.of("messages", messages, "temperature", temperature);
    }
}
