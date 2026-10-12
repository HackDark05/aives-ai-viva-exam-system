package com.aives.student;

public final class StudentMapper {

    private StudentMapper() {
    }

    public static StudentResponse toResponse(Student student) {
        return new StudentResponse(
                student.id(),
                student.name(),
                student.email(),
                student.studentCode(),
                student.phone(),
                student.active(),
                student.createdAt()
        );
    }

    public static StudentPageResponse toResponse(StudentPage page) {
        return new StudentPageResponse(
                page.items().stream().map(StudentMapper::toResponse).toList(),
                page.page(),
                page.size(),
                page.totalItems(),
                page.totalPages()
        );
    }
}
