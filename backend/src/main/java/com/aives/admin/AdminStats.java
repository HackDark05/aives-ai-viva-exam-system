package com.aives.admin;

public record AdminStats(
        long students,
        long teachers,
        long administrators,
        long multipleChoiceInProgress,
        long oralInProgress,
        long multipleChoiceScheduled,
        long oralScheduled,
        long multipleChoiceCompleted,
        long oralCompleted
) {
}
