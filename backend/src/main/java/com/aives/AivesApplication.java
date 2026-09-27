package com.aives;

import com.aives.config.AppProperties;
import com.aives.config.DatabaseUrl;
import com.aives.config.DotenvLoader;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

@SpringBootApplication
@EnableConfigurationProperties(AppProperties.class)
public class AivesApplication {

    public static void main(String[] args) {
        DotenvLoader.load();
        DatabaseUrl.applyToSystemProperties();
        SpringApplication.run(AivesApplication.class, args);
    }
}
