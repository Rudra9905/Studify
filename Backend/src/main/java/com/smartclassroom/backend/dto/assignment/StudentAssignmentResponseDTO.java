package com.smartclassroom.backend.dto.assignment;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StudentAssignmentResponseDTO {

    private Long id;

    private Long classroomId;

    private String classroomName;

    private String title;

    private String description;

    private LocalDateTime dueDate;

    private Integer maxMarks;

    private LocalDateTime createdAt;

    private String attachmentUrl;

    private Boolean isSubmitted;

    private LocalDateTime submittedAt;

    private Integer marks;

    private String feedback;

    private Boolean isPastDeadline;
}
