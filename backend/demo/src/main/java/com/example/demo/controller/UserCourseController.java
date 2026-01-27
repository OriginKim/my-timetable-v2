package com.example.demo.controller;

import com.example.demo.domain.UserCourse;
import com.example.demo.domain.UserCourseRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/user-courses")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:3000")
public class UserCourseController {
    private final UserCourseRepository repository;

    @GetMapping("/{studentId}")
    public List<UserCourse> getMyCourses(@PathVariable String studentId) {
        return repository.findByStudentId(studentId);
    }

    @PostMapping
    public UserCourse saveCourse(@RequestBody UserCourse userCourse) {
        return repository.save(userCourse);
    }

    @DeleteMapping("/{studentId}/{courseId}")
    public void deleteCourse(@PathVariable String studentId, @PathVariable Long courseId) {
        repository.findByStudentIdAndCourseId(studentId, courseId)
                .ifPresent(repository::delete);
    }
}
