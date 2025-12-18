package com.smartclassroom.backend.dto.auth;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.smartclassroom.backend.model.UserRole;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;

@Data
public class RegisterRequestDTO {

    @NotBlank
    private String name;

    @NotBlank
    @Email
    private String email;

    @NotBlank
    private String password;

    @NotNull
    private UserRole role;

    private String phoneNumber;

    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate dateOfBirth;

    private String profileImageUrl;
}
