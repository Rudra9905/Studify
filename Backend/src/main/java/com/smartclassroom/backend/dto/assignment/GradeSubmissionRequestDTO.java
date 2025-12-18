package com.smartclassroom.backend.dto.assignment;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class GradeSubmissionRequestDTO {

    @NotNull
    private Integer marks;

    private String feedback;
}
