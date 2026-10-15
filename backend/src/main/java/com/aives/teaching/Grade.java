package com.aives.teaching;

import com.aives.teaching.DeskRecords.CriterionScore;
import java.util.List;

/** One graded answer, on a 0-100 scale, before it is attached to a turn. */
record Grade(int score, boolean sufficient, String feedback, String followUpQuestion, List<CriterionScore> criteria) {
}
