package com.smartclassroom.backend.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "assignment_submissions", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"assignment_id", "student_id"})
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AssignmentSubmission {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "assignment_id")
    private Assignment assignment;

    @ManyToOne(optional = false)
    @JoinColumn(name = "student_id")
    private User student;

    @Column(name = "content_url", columnDefinition = "TEXT")
    private String contentUrl;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime submittedAt;

    private Integer marks;

    @Column(columnDefinition = "TEXT")
    private String feedback;
}
