package com.smartclassroom.backend.dto.assignment;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class AssignmentResponseDTO {
    private Long id;
    private Long classroomId;
    private String title;
    private String description;
    private LocalDateTime dueDate;
    private Integer maxMarks;
    private String attachmentUrl;
    private LocalDateTime createdAt;
    // Indicates whether this assignment is manually closed for submissions
    private Boolean closed;
}
