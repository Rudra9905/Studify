package com.smartclassroom.backend.repository;

import com.smartclassroom.backend.model.Assignment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface AssignmentRepository extends JpaRepository<Assignment, Long> {
    List<Assignment> findByClassroomId(Long classroomId);

    @Query("SELECT a FROM Assignment a WHERE a.classroom.id IN :classroomIds ORDER BY a.dueDate ASC")
    List<Assignment> findByClassroomIdIn(@Param("classroomIds") List<Long> classroomIds);
}
