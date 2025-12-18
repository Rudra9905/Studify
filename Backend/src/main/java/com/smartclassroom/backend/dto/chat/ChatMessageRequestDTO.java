package com.smartclassroom.backend.dto.chat;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ChatMessageRequestDTO {

    // classroomId is set from path variable in controller, no need to validate here
    private Long classroomId;

    @NotBlank
    private String content;
}
