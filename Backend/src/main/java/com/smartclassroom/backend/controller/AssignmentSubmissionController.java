package com.smartclassroom.backend.controller;

import com.smartclassroom.backend.dto.assignment.AssignmentSubmissionRequestDTO;
import com.smartclassroom.backend.dto.assignment.AssignmentSubmissionResponseDTO;
import com.smartclassroom.backend.dto.assignment.GradeSubmissionRequestDTO;
import com.smartclassroom.backend.dto.auth.UserResponseDTO;
import com.smartclassroom.backend.model.AssignmentSubmission;
import com.smartclassroom.backend.model.User;
import com.smartclassroom.backend.service.AssignmentSubmissionService;
import com.smartclassroom.backend.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/assignments/{assignmentId}/submissions")
@RequiredArgsConstructor
public class AssignmentSubmissionController {

    private final AssignmentSubmissionService submissionService;
    private final UserService userService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public AssignmentSubmissionResponseDTO submit(@PathVariable Long assignmentId,
                                                  @RequestParam("studentId") Long studentId,
                                                  @Valid @RequestBody AssignmentSubmissionRequestDTO request) {
        request.setAssignmentId(assignmentId);
        AssignmentSubmission submission = submissionService.submitAssignment(assignmentId, studentId, request);
        return toResponse(submission);
    }

    @GetMapping
    public List<AssignmentSubmissionResponseDTO> list(@PathVariable Long assignmentId) {
        return submissionService.getSubmissionsForAssignment(assignmentId).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @GetMapping("/my")
    public AssignmentSubmissionResponseDTO getMySubmission(@PathVariable Long assignmentId,
                                                           @RequestParam("studentId") Long studentId) {
        AssignmentSubmission submission = submissionService.getSubmissionForStudent(assignmentId, studentId);
        return toResponse(submission);
    }

    @PutMapping("/{submissionId}/grade")
    public AssignmentSubmissionResponseDTO grade(@PathVariable Long assignmentId,
                                                 @PathVariable Long submissionId,
                                                 @Valid @RequestBody GradeSubmissionRequestDTO request) {
        AssignmentSubmission submission = submissionService.gradeSubmission(submissionId, request);
        return toResponse(submission);
    }

    private AssignmentSubmissionResponseDTO toResponse(AssignmentSubmission submission) {
        User student = submission.getStudent();
        UserResponseDTO studentDto = UserResponseDTO.builder()
                .id(student.getId())
                .name(student.getName())
                .email(student.getEmail())
                .role(student.getRole())
                .build();
        return AssignmentSubmissionResponseDTO.builder()
                .id(submission.getId())
                .assignmentId(submission.getAssignment().getId())
                .student(studentDto)
                .contentUrl(submission.getContentUrl())
                .submittedAt(submission.getSubmittedAt())
                .marks(submission.getMarks())
                .feedback(submission.getFeedback())
                .build();
    }
}
