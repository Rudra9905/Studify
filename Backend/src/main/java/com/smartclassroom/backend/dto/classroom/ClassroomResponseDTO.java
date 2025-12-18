package com.smartclassroom.backend.dto.classroom;

import com.smartclassroom.backend.dto.auth.UserResponseDTO;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ClassroomResponseDTO {
    private Long id;
    private String name;
    private String description;
    private String code;
    private UserResponseDTO teacher;
}
