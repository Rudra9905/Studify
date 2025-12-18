package com.smartclassroom.backend.dto.chat;

import com.smartclassroom.backend.dto.auth.UserResponseDTO;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class ChatMessageResponseDTO {
    private Long id;
    private Long classroomId;
    private UserResponseDTO sender;
    private String content;
    private LocalDateTime createdAt;
}
