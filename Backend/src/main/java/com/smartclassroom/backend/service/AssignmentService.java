package com.smartclassroom.backend.service;

import com.smartclassroom.backend.dto.assignment.AssignmentCreateRequestDTO;
import com.smartclassroom.backend.dto.assignment.AssignmentStatisticsDTO;
import com.smartclassroom.backend.dto.assignment.AssignmentUpdateRequestDTO;
import com.smartclassroom.backend.dto.assignment.StudentAssignmentResponseDTO;
import com.smartclassroom.backend.exception.BadRequestException;
import com.smartclassroom.backend.exception.ResourceNotFoundException;
import com.smartclassroom.backend.model.*;
import com.smartclassroom.backend.repository.AssignmentRepository;
import com.smartclassroom.backend.repository.AssignmentSubmissionRepository;
import com.smartclassroom.backend.repository.ClassroomMemberRepository;
import com.smartclassroom.backend.repository.ClassroomRepository;
import com.smartclassroom.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AssignmentService {

    private final AssignmentRepository assignmentRepository;
    private final ClassroomRepository classroomRepository;
    private final UserRepository userRepository;
    private final AssignmentSubmissionRepository submissionRepository;
    private final ClassroomMemberRepository classroomMemberRepository;

    public Assignment createAssignment(Long classroomId, Long teacherId, AssignmentCreateRequestDTO request) {
        Classroom classroom = classroomRepository.findById(classroomId)
                .orElseThrow(() -> new ResourceNotFoundException("Classroom not found with id " + classroomId));
        User teacher = userRepository.findById(teacherId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id " + teacherId));

        if (teacher.getRole() != UserRole.TEACHER) {
            throw new BadRequestException("Only teachers can create assignments");
        }

        if (request.getDueDate() != null && !request.getDueDate().isAfter(LocalDateTime.now())) {
            throw new BadRequestException("Due date must be in the future");
        }

        Assignment assignment = Assignment.builder()
                .closed(false)
                .classroom(classroom)
                .title(request.getTitle())
                .description(request.getDescription())
                .dueDate(request.getDueDate())
                .maxMarks(request.getMaxMarks())
                .attachmentUrl(request.getAttachmentUrl())
                .createdBy(teacher)
                .build();
        return assignmentRepository.save(assignment);
    }

    public List<Assignment> getAssignmentsForClassroom(Long classroomId) {
        return assignmentRepository.findByClassroomId(classroomId);
    }

    public Assignment getAssignmentById(Long assignmentId) {
        return assignmentRepository.findById(assignmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Assignment not found with id " + assignmentId));
    }

    public Assignment updateAssignment(Long assignmentId, AssignmentUpdateRequestDTO request) {
        Assignment assignment = getAssignmentById(assignmentId);

        if (request.getTitle() != null) {
            assignment.setTitle(request.getTitle());
        }
        if (request.getDescription() != null) {
            assignment.setDescription(request.getDescription());
        }
        if (request.getClosed() != null) {
            assignment.setClosed(request.getClosed());
        }
        if (request.getDueDate() != null) {
            if (!request.getDueDate().isAfter(LocalDateTime.now())) {
                throw new BadRequestException("Due date must be in the future");
            }
            assignment.setDueDate(request.getDueDate());
        }
        if (request.getMaxMarks() != null) {
            assignment.setMaxMarks(request.getMaxMarks());
        }
        if (request.getAttachmentUrl() != null) {
            String url = request.getAttachmentUrl();
            if (url.isBlank()) {
                assignment.setAttachmentUrl(null);
            } else {
                assignment.setAttachmentUrl(url);
            }
        }

        return assignmentRepository.save(assignment);
    }

    public AssignmentStatisticsDTO getAssignmentStatistics(Long assignmentId) {
        Assignment assignment = getAssignmentById(assignmentId);

        Long totalStudents = classroomMemberRepository.countByClassroomIdAndRole(
                assignment.getClassroom().getId(), ClassroomRole.STUDENT);
        Long submittedCount = submissionRepository.countByAssignmentId(assignmentId);
        Long gradedCount = submissionRepository.countGradedByAssignmentId(assignmentId);

        int totalStudentsInt = totalStudents.intValue();
        int submittedCountInt = submittedCount.intValue();

        return AssignmentStatisticsDTO.builder()
                .assignmentId(assignmentId)
                .totalStudents(totalStudentsInt)
                .submittedCount(submittedCountInt)
                .notSubmittedCount(totalStudentsInt - submittedCountInt)
                .gradedCount(gradedCount.intValue())
                .build();
    }

    public List<User> getNonSubmittedStudents(Long assignmentId) {
        Assignment assignment = getAssignmentById(assignmentId);
        List<User> allStudents = classroomMemberRepository.findUsersByClassroomIdAndRole(
                assignment.getClassroom().getId(), ClassroomRole.STUDENT);
        List<AssignmentSubmission> submissions = submissionRepository.findByAssignmentId(assignmentId);
        List<Long> submittedStudentIds = submissions.stream()
                .map(s -> s.getStudent().getId())
                .collect(Collectors.toList());

        return allStudents.stream()
                .filter(student -> !submittedStudentIds.contains(student.getId()))
                .collect(Collectors.toList());
    }

    public List<StudentAssignmentResponseDTO> getStudentAssignments(Long studentId) {
        User student = userRepository.findById(studentId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id " + studentId));

        List<ClassroomMember> memberships = classroomMemberRepository.findByUserId(studentId);
        List<Long> classroomIds = memberships.stream()
                .map(m -> m.getClassroom().getId())
                .collect(Collectors.toList());

        if (classroomIds.isEmpty()) {
            return List.of();
        }

        List<Assignment> assignments = assignmentRepository.findByClassroomIdIn(classroomIds);
        LocalDateTime now = LocalDateTime.now();

        return assignments.stream()
                .map(assignment -> {
                    AssignmentSubmission submission = submissionRepository
                            .findByAssignmentIdAndStudentId(assignment.getId(), studentId)
                            .orElse(null);

                    boolean isPastDeadline = assignment.getDueDate() != null && now.isAfter(assignment.getDueDate());

                    return StudentAssignmentResponseDTO.builder()
                            .id(assignment.getId())
                            .classroomId(assignment.getClassroom().getId())
                            .classroomName(assignment.getClassroom().getName())
                            .title(assignment.getTitle())
                            .description(assignment.getDescription())
                            .dueDate(assignment.getDueDate())
                            .maxMarks(assignment.getMaxMarks())
                            .createdAt(assignment.getCreatedAt())
                            .attachmentUrl(assignment.getAttachmentUrl())
                            .isSubmitted(submission != null)
                            .submittedAt(submission != null ? submission.getSubmittedAt() : null)
                            .marks(submission != null ? submission.getMarks() : null)
                            .feedback(submission != null ? submission.getFeedback() : null)
                            .isPastDeadline(isPastDeadline)
                            .build();
                })
                .collect(Collectors.toList());
    }

    public List<StudentAssignmentResponseDTO> getTeacherAssignments(Long teacherId) {
        User teacher = userRepository.findById(teacherId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id " + teacherId));

        if (teacher.getRole() != UserRole.TEACHER) {
            throw new BadRequestException("User is not a teacher");
        }

        List<Classroom> classrooms = classroomRepository.findByTeacherId(teacherId);
        List<Long> classroomIds = classrooms.stream()
                .map(Classroom::getId)
                .collect(Collectors.toList());

        if (classroomIds.isEmpty()) {
            return List.of();
        }

        List<Assignment> assignments = assignmentRepository.findByClassroomIdIn(classroomIds);
        LocalDateTime now = LocalDateTime.now();

        return assignments.stream()
                .map(assignment -> {
                    boolean isPastDeadline = assignment.getDueDate() != null && now.isAfter(assignment.getDueDate());
                    Long submissionCount = submissionRepository.countByAssignmentId(assignment.getId());

                    return StudentAssignmentResponseDTO.builder()
                            .id(assignment.getId())
                            .classroomId(assignment.getClassroom().getId())
                            .classroomName(assignment.getClassroom().getName())
                            .title(assignment.getTitle())
                            .description(assignment.getDescription())
                            .dueDate(assignment.getDueDate())
                            .maxMarks(assignment.getMaxMarks())
                            .createdAt(assignment.getCreatedAt())
                            .attachmentUrl(assignment.getAttachmentUrl())
                            .isSubmitted(submissionCount > 0)
                            .submittedAt(null)
                            .marks(null)
                            .feedback(null)
                            .isPastDeadline(isPastDeadline)
                            .build();
                })
                .collect(Collectors.toList());
    }

    public void deleteAssignment(Long assignmentId) {
        Assignment assignment = getAssignmentById(assignmentId);

        // First delete submissions referencing this assignment to avoid
        // foreign key constraint violations, then delete the assignment.
        submissionRepository.deleteAll(submissionRepository.findByAssignmentId(assignmentId));
        assignmentRepository.delete(assignment);
    }
}
