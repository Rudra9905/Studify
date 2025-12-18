package com.smartclassroom.backend.dto.classroom;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ClassroomCreateRequestDTO {

    @NotBlank
    private String name;

    private String description;
}
