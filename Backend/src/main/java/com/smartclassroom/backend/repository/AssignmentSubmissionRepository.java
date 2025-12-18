package com.smartclassroom.backend.repository;

import com.smartclassroom.backend.model.AssignmentSubmission;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface AssignmentSubmissionRepository extends JpaRepository<AssignmentSubmission, Long> {

    Optional<AssignmentSubmission> findByAssignmentIdAndStudentId(Long assignmentId, Long studentId);

    List<AssignmentSubmission> findByAssignmentId(Long assignmentId);

    Long countByAssignmentId(Long assignmentId);

    @Query("SELECT COUNT(s) FROM AssignmentSubmission s WHERE s.assignment.id = :assignmentId AND s.marks IS NOT NULL")
    Long countGradedByAssignmentId(@Param("assignmentId") Long assignmentId);
}
