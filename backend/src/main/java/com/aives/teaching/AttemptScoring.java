package com.aives.teaching;

import java.util.List;
import java.util.Map;

/**
 * Computes an attempt's final score (0-100) from the per-question answer scores stored on the server.
 *
 * <p>Each question is weighted by its rubric's maximum points. A question the student never answered
 * counts as 0. When a question's best score comes from a follow-up turn, that better score is kept,
 * since the follow-up exists to let the student fill in the missing points.
 */
public final class AttemptScoring {

    private AttemptScoring() {
    }

    public record WeightedQuestion(String questionId, int maxScore) {
    }

    /**
     * @param questions      the questions on the exam, with their rubric maximum
     * @param bestPercentages best answer score per question id, on a 0-100 scale
     */
    public static int finalScore(List<WeightedQuestion> questions, Map<String, Double> bestPercentages) {
        if (questions.isEmpty()) {
            return 0;
        }
        // Rubrics without criteria have a maximum of 0; mixing those with real weights would silently
        // drop the question, so fall back to equal weights for the whole exam instead.
        boolean useRubricWeights = questions.stream().allMatch(question -> question.maxScore() > 0);
        double earned = 0;
        double possible = 0;
        for (WeightedQuestion question : questions) {
            double weight = useRubricWeights ? question.maxScore() : 1;
            double percent = clamp(bestPercentages.getOrDefault(question.questionId(), 0.0));
            earned += weight * percent / 100.0;
            possible += weight;
        }
        return (int) Math.round(100.0 * earned / possible);
    }

    private static double clamp(Double value) {
        if (value == null || value.isNaN()) {
            return 0;
        }
        return Math.max(0, Math.min(100, value));
    }
}
