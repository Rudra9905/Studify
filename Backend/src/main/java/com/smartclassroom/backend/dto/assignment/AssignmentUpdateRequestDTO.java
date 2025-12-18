package com.smartclassroom.backend.dto.assignment;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class AssignmentUpdateRequestDTO {

    private String title;

    private String description;

    // Optional flag to explicitly close or reopen an assignment
    private Boolean closed;

    private LocalDateTime dueDate;

    private Integer maxMarks;

    private String attachmentUrl;
}
