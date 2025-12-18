package com.smartclassroom.backend.controller;

import com.smartclassroom.backend.dto.assignment.AssignmentCreateRequestDTO;
import com.smartclassroom.backend.dto.assignment.AssignmentResponseDTO;
import com.smartclassroom.backend.dto.assignment.AssignmentStatisticsDTO;
import com.smartclassroom.backend.dto.assignment.AssignmentUpdateRequestDTO;
import com.smartclassroom.backend.dto.auth.UserResponseDTO;
import com.smartclassroom.backend.model.Assignment;
import com.smartclassroom.backend.model.User;
import com.smartclassroom.backend.service.AssignmentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/classrooms/{classroomId}/assignments")
@RequiredArgsConstructor
public class AssignmentController {

    private final AssignmentService assignmentService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public AssignmentResponseDTO create(@PathVariable Long classroomId,
                                        @RequestParam("teacherId") Long teacherId,
                                        @Valid @RequestBody AssignmentCreateRequestDTO request) {
        // classroomId from path overrides body classroomId
        request.setClassroomId(classroomId);
        Assignment assignment = assignmentService.createAssignment(classroomId, teacherId, request);
        return toResponse(assignment);
    }

    @GetMapping
    public List<AssignmentResponseDTO> list(@PathVariable Long classroomId) {
        return assignmentService.getAssignmentsForClassroom(classroomId).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @GetMapping("/{assignmentId}")
    public AssignmentResponseDTO get(@PathVariable Long classroomId, @PathVariable Long assignmentId) {
        Assignment assignment = assignmentService.getAssignmentById(assignmentId);
        return toResponse(assignment);
    }

    @PutMapping("/{assignmentId}")
    public AssignmentResponseDTO update(@PathVariable Long classroomId,
                                        @PathVariable Long assignmentId,
                                        @Valid @RequestBody AssignmentUpdateRequestDTO request) {
        Assignment assignment = assignmentService.updateAssignment(assignmentId, request);
        return toResponse(assignment);
    }

    @GetMapping("/{assignmentId}/statistics")
    public AssignmentStatisticsDTO getStatistics(@PathVariable Long classroomId, @PathVariable Long assignmentId) {
        return assignmentService.getAssignmentStatistics(assignmentId);
    }

    @GetMapping("/{assignmentId}/non-submitted-students")
    public List<UserResponseDTO> getNonSubmittedStudents(@PathVariable Long classroomId, @PathVariable Long assignmentId) {
        return assignmentService.getNonSubmittedStudents(assignmentId).stream()
                .map(this::toUserResponse)
                .collect(Collectors.toList());
    }

    @DeleteMapping("/{assignmentId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteAssignment(@PathVariable Long classroomId, @PathVariable Long assignmentId) {
        assignmentService.deleteAssignment(assignmentId);
    }

    private AssignmentResponseDTO toResponse(Assignment assignment) {
        return AssignmentResponseDTO.builder()
                .id(assignment.getId())
                .classroomId(assignment.getClassroom().getId())
                .title(assignment.getTitle())
                .description(assignment.getDescription())
                .dueDate(assignment.getDueDate())
                .maxMarks(assignment.getMaxMarks())
                .attachmentUrl(assignment.getAttachmentUrl())
                .createdAt(assignment.getCreatedAt())
                .closed(assignment.getClosed())
                .build();
    }

    private UserResponseDTO toUserResponse(User user) {
        return UserResponseDTO.builder()
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .role(user.getRole())
                .build();
    }
}
