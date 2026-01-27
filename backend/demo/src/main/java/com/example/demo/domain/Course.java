package com.example.demo.domain;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "courses")
@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
public class Course {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String code;
    private String name;
    private String dept;
    private String grade;
    private String credit;
    private String professor;

    @Column(columnDefinition = "TEXT")
    private String schedules;

    private boolean isBlended;
    private boolean isElearning;
}