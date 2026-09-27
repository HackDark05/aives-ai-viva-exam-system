package com.aives.health;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;

class HealthControllerTest {

    @Test
    void reportsTheApi() {
        assertEquals("ok", new HealthController().health().get("status"));
        assertEquals("aives-api", new HealthController().health().get("service"));
    }
}
