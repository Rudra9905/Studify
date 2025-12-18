package com.smartclassroom.backend.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "classrooms", uniqueConstraints = {
        @UniqueConstraint(columnNames = "code")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Classroom {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    private String description;

    @Column(nullable = false, unique = true, length = 16)
    private String code;

    @ManyToOne(optional = false)
    @JoinColumn(name = "teacher_id")
    private User teacher;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;
}
