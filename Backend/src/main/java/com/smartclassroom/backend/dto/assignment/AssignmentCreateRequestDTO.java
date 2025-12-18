package com.smartclassroom.backend.dto.assignment;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class AssignmentCreateRequestDTO {

    @NotNull
    private Long classroomId;

    @NotBlank
    private String title;

    private String description;

    private LocalDateTime dueDate;

    private Integer maxMarks;

    private String attachmentUrl;
}
