package com.aives.embedding;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

class EmbeddingServiceTest {

    private final EmbeddingService embeddings = new EmbeddingService();

    @Test
    void storesA384DimensionalUnitVector() {
        float[] vector = embeddings.embed("A viva checks reasoning.");

        assertEquals(EmbeddingService.DIMENSIONS, vector.length);
        double norm = 0;
        for (float value : vector) {
            norm += value * value;
        }
        assertTrue(Math.abs(Math.sqrt(norm) - 1) < 0.02);
    }

    @Test
    void relatedTextsAreCloserThanUnrelatedTexts() {
        float[] question = embeddings.embed("What makes a strong oral exam answer?");
        float[] related = embeddings.embed(
                "A strong viva answer states the claim, gives a concrete example, and names the limitation.");
        float[] unrelated = embeddings.embed("PostgreSQL stores rows in tables and runs on port 5433.");

        assertTrue(cosine(question, related) > cosine(question, unrelated));
    }

    private static double cosine(float[] left, float[] right) {
        double dot = 0;
        double leftNorm = 0;
        double rightNorm = 0;
        for (int index = 0; index < left.length; index++) {
            dot += left[index] * right[index];
            leftNorm += left[index] * left[index];
            rightNorm += right[index] * right[index];
        }
        return dot / (Math.sqrt(leftNorm) * Math.sqrt(rightNorm));
    }
}
