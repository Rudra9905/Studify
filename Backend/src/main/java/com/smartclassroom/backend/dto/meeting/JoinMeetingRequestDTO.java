package com.smartclassroom.backend.dto.meeting;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class JoinMeetingRequestDTO {
    
    @NotBlank(message = "Meeting code is required")
    private String meetingCode;
    
    @NotNull(message = "User ID is required")
    private Long userId;
}
