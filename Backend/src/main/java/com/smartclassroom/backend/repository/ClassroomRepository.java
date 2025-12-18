package com.smartclassroom.backend.repository;

import com.smartclassroom.backend.model.Classroom;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ClassroomRepository extends JpaRepository<Classroom, Long> {
    Optional<Classroom> findByCode(String code);

    List<Classroom> findByTeacherId(Long teacherId);
}
