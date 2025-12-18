package com.smartclassroom.backend.dto.announcement;

import com.smartclassroom.backend.dto.auth.UserResponseDTO;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class AnnouncementResponseDTO {
    private Long id;
    private Long classroomId;
    private UserResponseDTO author;
    private String title;
    private String content;
    private String attachmentUrl;
    private LocalDateTime createdAt;
}
