package com.smartclassroom.backend.dto.meeting;

import com.smartclassroom.backend.dto.auth.UserResponseDTO;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MeetingResponseDTO {
    
    private Long id;
    private String meetingId; // UUID for joining
    private String meetingCode; // 6-digit code for joining
    private String title;
    private Long classroomId;
    private String classroomName;
    private UserResponseDTO host;
    private Boolean active;
    private LocalDateTime createdAt;
    private LocalDateTime endedAt;
    private List<UserResponseDTO> participants;
    private String signalingToken; // JWT token for WebSocket authentication
    private Boolean isClassroomMeeting;
}
