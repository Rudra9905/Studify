package com.smartclassroom.backend.dto.auth;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.smartclassroom.backend.model.UserRole;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;

@Data
@Builder
public class UserResponseDTO {
    private Long id;
    private String name;
    private String email;
    private UserRole role;

    private String phoneNumber;

    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate dateOfBirth;

    private String profileImageUrl;
}
