package com.aives.knowledge;

import java.util.UUID;

public record KnowledgeMatch(
        UUID id,
        String title,
        String content,
        double score
) {
}
