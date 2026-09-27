package com.aives.auth;

import static org.junit.jupiter.api.Assertions.assertEquals;

import com.aives.config.AppProperties;
import com.aives.user.Role;
import com.aives.user.UserAccount;
import java.time.Duration;
import org.junit.jupiter.api.Test;

class JwtServiceTest {

    @Test
    void roundTripsTheUserId() {
        JwtService jwt = new JwtService(new AppProperties(
                "aives-dev-jwt-secret-change-me",
                Duration.ofDays(7),
                "http://localhost:3001",
                "demo1234"
        ));
        UserAccount user = new UserAccount("user-1", "jordan.h@example.net", "Jordan Hale", "hash", Role.ADMIN);

        assertEquals("user-1", jwt.subject(jwt.sign(user)));
    }
}
