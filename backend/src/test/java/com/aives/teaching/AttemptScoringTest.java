package com.aives.teaching;

import static org.junit.jupiter.api.Assertions.assertEquals;

import com.aives.teaching.AttemptScoring.WeightedQuestion;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class AttemptScoringTest {

    @Test
    void noAnswersScoresZero() {
        List<WeightedQuestion> questions = List.of(new WeightedQuestion("q1", 10), new WeightedQuestion("q2", 10));
        assertEquals(0, AttemptScoring.finalScore(questions, Map.of()));
    }

    @Test
    void unansweredQuestionsCountAsZero() {
        List<WeightedQuestion> questions = List.of(new WeightedQuestion("q1", 10), new WeightedQuestion("q2", 10));
        assertEquals(45, AttemptScoring.finalScore(questions, Map.of("q1", 90.0)));
    }

    @Test
    void weightsByRubricMaximum() {
        List<WeightedQuestion> questions = List.of(new WeightedQuestion("q1", 30), new WeightedQuestion("q2", 10));
        // (30 * 0.8 + 10 * 0.4) / 40 = 0.7
        assertEquals(70, AttemptScoring.finalScore(questions, Map.of("q1", 80.0, "q2", 40.0)));
    }

    @Test
    void fallsBackToEqualWeightsWhenARubricHasNoMaximum() {
        List<WeightedQuestion> questions = List.of(new WeightedQuestion("q1", 30), new WeightedQuestion("q2", 0));
        assertEquals(60, AttemptScoring.finalScore(questions, Map.of("q1", 80.0, "q2", 40.0)));
    }

    @Test
    void clampsOutOfRangeScores() {
        List<WeightedQuestion> questions = List.of(new WeightedQuestion("q1", 10));
        assertEquals(100, AttemptScoring.finalScore(questions, Map.of("q1", 250.0)));
        assertEquals(0, AttemptScoring.finalScore(questions, Map.of("q1", -5.0)));
    }

    @Test
    void emptyExamScoresZero() {
        assertEquals(0, AttemptScoring.finalScore(List.of(), Map.of("q1", 100.0)));
    }
}
