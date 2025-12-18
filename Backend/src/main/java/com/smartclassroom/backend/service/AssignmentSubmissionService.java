package com.smartclassroom.backend.service;

import com.smartclassroom.backend.dto.assignment.AssignmentSubmissionRequestDTO;
import com.smartclassroom.backend.dto.assignment.GradeSubmissionRequestDTO;
import com.smartclassroom.backend.exception.BadRequestException;
import com.smartclassroom.backend.exception.DuplicateResourceException;
import com.smartclassroom.backend.exception.ResourceNotFoundException;
import com.smartclassroom.backend.model.*;
import com.smartclassroom.backend.repository.AssignmentRepository;
import com.smartclassroom.backend.repository.AssignmentSubmissionRepository;
import com.smartclassroom.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AssignmentSubmissionService {

    private final AssignmentSubmissionRepository submissionRepository;
    private final AssignmentRepository assignmentRepository;
    private final UserRepository userRepository;

    public AssignmentSubmission submitAssignment(Long assignmentId, Long studentId, AssignmentSubmissionRequestDTO request) {
        Assignment assignment = assignmentRepository.findById(assignmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Assignment not found with id " + assignmentId));
        User student = userRepository.findById(studentId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id " + studentId));

        // Check if deadline has passed
        if (assignment.getDueDate() != null && LocalDateTime.now().isAfter(assignment.getDueDate())) {
            throw new BadRequestException("Cannot submit assignment after the deadline");
        }

        submissionRepository.findByAssignmentIdAndStudentId(assignmentId, studentId)
                .ifPresent(s -> { throw new DuplicateResourceException("Submission already exists for this student and assignment"); });

        AssignmentSubmission submission = AssignmentSubmission.builder()
                .assignment(assignment)
                .student(student)
                .contentUrl(request.getContentUrl())
                .build();
        return submissionRepository.save(submission);
    }

    public List<AssignmentSubmission> getSubmissionsForAssignment(Long assignmentId) {
        return submissionRepository.findByAssignmentId(assignmentId);
    }

    public AssignmentSubmission getSubmissionForStudent(Long assignmentId, Long studentId) {
        return submissionRepository.findByAssignmentIdAndStudentId(assignmentId, studentId)
                .orElseThrow(() -> new ResourceNotFoundException("Submission not found"));
    }

    public AssignmentSubmission gradeSubmission(Long submissionId, GradeSubmissionRequestDTO request) {
        AssignmentSubmission submission = submissionRepository.findById(submissionId)
                .orElseThrow(() -> new ResourceNotFoundException("Submission not found with id " + submissionId));

        submission.setMarks(request.getMarks());
        submission.setFeedback(request.getFeedback());
        return submissionRepository.save(submission);
    }
}
