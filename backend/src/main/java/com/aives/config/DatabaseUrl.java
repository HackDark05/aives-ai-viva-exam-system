package com.aives.config;

import java.net.URI;

public final class DatabaseUrl {

    private DatabaseUrl() {
    }

    public static void applyToSystemProperties() {
        String databaseUrl = System.getProperty("DATABASE_URL");
        if (databaseUrl == null || databaseUrl.isBlank()) {
            databaseUrl = System.getenv("DATABASE_URL");
        }
        if (databaseUrl == null || databaseUrl.isBlank()) {
            return;
        }
        if (System.getProperty("spring.datasource.url") != null || System.getenv("SPRING_DATASOURCE_URL") != null) {
            return;
        }

        String readable = databaseUrl.startsWith("postgresql://")
                ? "http://" + databaseUrl.substring("postgresql://".length())
                : databaseUrl;
        URI uri = URI.create(readable);
        String userInfo = uri.getUserInfo();
        if (userInfo == null || uri.getHost() == null || uri.getPath() == null || uri.getPath().isBlank()) {
            throw new IllegalStateException("DATABASE_URL must look like postgresql://user:password@host:port/database");
        }

        int colon = userInfo.indexOf(':');
        String username = colon < 0 ? userInfo : userInfo.substring(0, colon);
        String password = colon < 0 ? "" : userInfo.substring(colon + 1);
        int port = uri.getPort() > 0 ? uri.getPort() : 5432;
        String jdbcUrl = "jdbc:postgresql://" + uri.getHost() + ":" + port + uri.getPath();

        System.setProperty("spring.datasource.url", jdbcUrl);
        System.setProperty("spring.datasource.username", username);
        System.setProperty("spring.datasource.password", password);
    }
}
