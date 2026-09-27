package com.aives.user;

public record PublicUser(
        String id,
        String email,
        String name,
        Role role
) {
}
