package com.example.demo.domain;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface CourseRepository extends JpaRepository<Course, Long> {
    // 학과별로 검색하는 기능 추가
    List<Course> findByDept(String dept);
}