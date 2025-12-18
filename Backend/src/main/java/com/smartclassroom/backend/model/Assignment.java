package com.smartclassroom.backend.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Builder.Default;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "assignments")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Assignment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "classroom_id")
    private Classroom classroom;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    private LocalDateTime dueDate;

    private Integer maxMarks;

    @Column(name = "attachment_url", columnDefinition = "TEXT")
    private String attachmentUrl;

    /**
     * Indicates whether the assignment is closed for submissions.
     * <p>
     * This maps to the non-nullable {@code closed} column in the {@code assignments} table.
     * The database column does not define a default value, so we must always provide one
     * from the application side to avoid {@link org.springframework.dao.DataIntegrityViolationException}
     * errors like "Field 'closed' doesn't have a default value".
     */
    @Default
    @Column(name = "closed", nullable = false)
    private Boolean closed = false;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @ManyToOne(optional = false)
    @JoinColumn(name = "created_by")
    private User createdBy;
}
