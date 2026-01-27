package com.example.demo.domain;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Getter @Setter 
@NoArgsConstructor
public class UserCourse {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String studentId; 
    private Long courseId;   

    public UserCourse(String studentId, Long courseId) {
        this.studentId = studentId;
        this.courseId = courseId;
    }
}
