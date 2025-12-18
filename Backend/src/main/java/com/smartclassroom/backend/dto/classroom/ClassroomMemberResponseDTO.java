package com.smartclassroom.backend.dto.classroom;

import com.smartclassroom.backend.dto.auth.UserResponseDTO;
import com.smartclassroom.backend.model.ClassroomRole;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class ClassroomMemberResponseDTO {
    private Long id;
    private Long classroomId;
    private UserResponseDTO user;
    private ClassroomRole roleInClass;
    private LocalDateTime joinedAt;
}
