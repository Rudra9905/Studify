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
public class CreateClassroomMeetingRequestDTO {
    
    @NotNull(message = "Classroom ID is required")
    private Long classroomId;
    
    @NotNull(message = "Host user ID is required")
    private Long hostUserId;
}