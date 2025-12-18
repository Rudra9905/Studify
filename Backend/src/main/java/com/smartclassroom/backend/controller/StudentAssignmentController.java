package com.smartclassroom.backend.controller;

import com.smartclassroom.backend.dto.assignment.StudentAssignmentResponseDTO;
import com.smartclassroom.backend.service.AssignmentService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/assignments")
@RequiredArgsConstructor
public class StudentAssignmentController {

    private final AssignmentService assignmentService;

    @GetMapping("/my")
    public List<StudentAssignmentResponseDTO> getMyAssignments(
            @RequestParam(value = "userId", required = false) Long userId,
            @RequestParam(value = "studentId", required = false) Long legacyStudentId,
            @RequestParam(value = "role", required = false) String role
    ) {
        Long effectiveUserId = userId != null ? userId : legacyStudentId;
        if (effectiveUserId == null) {
            throw new IllegalArgumentException("userId is required");
        }
        
        // If role is TEACHER, return teacher assignments, otherwise student assignments
        if ("TEACHER".equals(role)) {
            return assignmentService.getTeacherAssignments(effectiveUserId);
        } else {
            return assignmentService.getStudentAssignments(effectiveUserId);
        }
    }

    @GetMapping("/{assignmentId}")
    public com.smartclassroom.backend.dto.assignment.AssignmentResponseDTO getAssignment(@PathVariable Long assignmentId) {
        com.smartclassroom.backend.model.Assignment assignment = assignmentService.getAssignmentById(assignmentId);
        return com.smartclassroom.backend.dto.assignment.AssignmentResponseDTO.builder()
                .id(assignment.getId())
                .classroomId(assignment.getClassroom().getId())
                .title(assignment.getTitle())
                .description(assignment.getDescription())
                .dueDate(assignment.getDueDate())
                .maxMarks(assignment.getMaxMarks())
                .attachmentUrl(assignment.getAttachmentUrl())
                .createdAt(assignment.getCreatedAt())
                .build();
    }
}
