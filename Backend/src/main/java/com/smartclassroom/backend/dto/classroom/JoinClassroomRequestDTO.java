package com.smartclassroom.backend.dto.classroom;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class JoinClassroomRequestDTO {

    @NotBlank
    private String code;
}
