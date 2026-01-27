package com.example.demo.controller;

import com.example.demo.domain.Course;
import com.example.demo.domain.CourseRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/courses")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:3000") // React와 통신을 위해 허용
public class CourseController {

    private final CourseRepository courseRepository;

    // 모든 강의 가져오기
    @GetMapping
    public List<Course> getAllCourses() {
        return courseRepository.findAll();
    }

    // 학과별로 강의 검색하기 (예: /api/courses/search?dept=컴퓨터과학전공)
    @GetMapping("/search")
    public List<Course> getCoursesByDept(@RequestParam String dept) {
        return courseRepository.findByDept(dept);
    }
}