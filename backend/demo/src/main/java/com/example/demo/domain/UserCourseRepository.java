package com.example.demo.domain;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface UserCourseRepository extends JpaRepository<UserCourse, Long> {
    List<UserCourse> findByStudentId(String studentId);
    Optional<UserCourse> findByStudentIdAndCourseId(String studentId, Long courseId);
}
