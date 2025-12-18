package com.smartclassroom.backend.dto.assignment;

import com.smartclassroom.backend.dto.auth.UserResponseDTO;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class AssignmentSubmissionResponseDTO {
    private Long id;
    private Long assignmentId;
    private UserResponseDTO student;
    private String contentUrl;
    private LocalDateTime submittedAt;
    private Integer marks;
    private String feedback;
}
