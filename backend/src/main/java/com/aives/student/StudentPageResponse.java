package com.aives.student;

import java.util.List;

public record StudentPageResponse(
        List<StudentResponse> items,
        int page,
        int size,
        long totalItems,
        int totalPages
) {
}
