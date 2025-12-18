package com.smartclassroom.backend.dto.auth;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Data;

import java.time.LocalDate;

@Data
public class UserUpdateRequestDTO {
    private String name;

    private String phoneNumber;

    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate dateOfBirth;

    private String profileImageUrl;
}

