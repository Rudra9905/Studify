package com.smartclassroom.backend.dto.auth;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class AuthResponseDTO {
    private UserResponseDTO user;
    private String token;
}
