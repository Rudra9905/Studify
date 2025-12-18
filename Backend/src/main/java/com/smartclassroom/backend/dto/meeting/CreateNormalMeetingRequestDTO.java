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
public class CreateNormalMeetingRequestDTO {
    
    @NotNull(message = "Host user ID is required")
    private Long hostUserId;
}