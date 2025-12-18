package com.smartclassroom.backend.dto.meeting;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateMeetingRequestDTO {
    
    @NotNull(message = "Classroom ID is required")
    private Long classroomId;
    
    @NotNull(message = "User ID is required")
    private Long userId;
}
