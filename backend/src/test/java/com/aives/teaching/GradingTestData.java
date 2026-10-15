package com.aives.teaching;

import com.aives.teaching.DeskRecords.QuestionItem;

final class GradingTestData {

    private GradingTestData() {
    }

    static QuestionItem question(String prompt, String expectedAnswer, String keyPoints) {
        return new QuestionItem(
                "q1", "s1", "Databases", "Keys", prompt, "UNDERSTAND", "r1", "Default", "", 10,
                "APPROVED", "MANUAL", "Teacher", null, expectedAnswer, keyPoints
        );
    }
}
