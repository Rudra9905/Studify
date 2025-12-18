package com.smartclassroom.backend.dto.assignment;

import lombok.Data;

@Data
public class AssignmentSubmissionRequestDTO {

    // assignmentId is set by the controller from path variable, so no validation needed
    private Long assignmentId;

    // contentUrl is optional - can be provided via URL or file upload
    private String contentUrl;
}
