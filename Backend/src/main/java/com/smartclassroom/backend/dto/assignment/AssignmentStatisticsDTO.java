package com.smartclassroom.backend.dto.assignment;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AssignmentStatisticsDTO {

    private Long assignmentId;

    private Integer totalStudents;

    private Integer submittedCount;

    private Integer notSubmittedCount;

    private Integer gradedCount;
}
