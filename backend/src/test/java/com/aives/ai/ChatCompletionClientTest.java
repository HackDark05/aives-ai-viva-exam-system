package com.aives.ai;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.jsonPath;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import com.aives.ai.ChatCompletionClient.AiUnavailableException;
import com.aives.config.AppProperties;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.ExpectedCount;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

class ChatCompletionClientTest {

    private static final String URL = "https://ai.example/v1/chat/completions";
    private static final String OK = "{\"choices\":[{\"message\":{\"content\":\"graded\"}}]}";

    private final List<Long> sleeps = new ArrayList<>();

    private ChatCompletionClient client(RestClient.Builder builder, int retries) {
        AppProperties properties = new AppProperties("secret", Duration.ofDays(1), "http://localhost:3001", "", "",
                new AppProperties.Ai("https://ai.example/v1/", "key", "free-a", "free-b, free-a", Duration.ofSeconds(5),
                        retries));
        return new ChatCompletionClient(properties, new ObjectMapper(), builder.build(), sleeps::add);
    }

    @Test
    void retriesRateLimitThenSucceeds() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        server.expect(requestTo(URL)).andRespond(withStatus(HttpStatus.TOO_MANY_REQUESTS));
        server.expect(requestTo(URL)).andExpect(jsonPath("$.model").value("free-a"))
                .andRespond(withSuccess(OK, MediaType.APPLICATION_JSON));

        var completion = client(builder, 2).complete(Map.of("messages", List.of()));

        assertEquals("graded", completion.content());
        assertEquals("free-a", completion.model());
        assertEquals(1, sleeps.size());
        server.verify();
    }

    @Test
    void movesToFallbackModelWhenPrimaryKeepsFailing() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        server.expect(ExpectedCount.times(2), requestTo(URL)).andRespond(withStatus(HttpStatus.SERVICE_UNAVAILABLE));
        server.expect(requestTo(URL)).andExpect(jsonPath("$.model").value("free-b"))
                .andRespond(withSuccess(OK, MediaType.APPLICATION_JSON));

        var completion = client(builder, 1).complete(Map.of("messages", List.of()));

        assertEquals("free-b", completion.model());
        server.verify();
    }

    @Test
    void doesNotRetryClientErrorsAndReportsWhyEverythingFailed() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        server.expect(ExpectedCount.times(2), requestTo(URL)).andRespond(withStatus(HttpStatus.UNAUTHORIZED));

        AiUnavailableException exception = assertThrows(AiUnavailableException.class,
                () -> client(builder, 3).complete(Map.of("messages", List.of())));

        assertEquals("free-b returned HTTP 401", exception.getMessage());
        assertEquals(0, sleeps.size());
        server.verify();
    }

    @Test
    void honoursRetryAfterButCapsIt() {
        assertEquals(Duration.ofSeconds(3), ChatCompletionClient.backoff(0, "3"));
        assertEquals(Duration.ofSeconds(10), ChatCompletionClient.backoff(0, "120"));
        assertEquals(Duration.ofMillis(1000), ChatCompletionClient.backoff(1, null));
    }
}
