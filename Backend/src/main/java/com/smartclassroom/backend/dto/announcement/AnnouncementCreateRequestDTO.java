package com.smartclassroom.backend.dto.announcement;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class AnnouncementCreateRequestDTO {

    @NotBlank
    private String title;

    @NotBlank
    private String content;

    private String attachmentUrl;
}
