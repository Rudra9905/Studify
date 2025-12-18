package com.smartclassroom.backend.repository;

import com.smartclassroom.backend.model.ClassroomMember;
import com.smartclassroom.backend.model.ClassroomRole;
import com.smartclassroom.backend.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ClassroomMemberRepository extends JpaRepository<ClassroomMember, Long> {

    Optional<ClassroomMember> findByClassroomIdAndUserId(Long classroomId, Long userId);

    List<ClassroomMember> findByClassroomId(Long classroomId);

    List<ClassroomMember> findByUserId(Long userId);

    @Query("SELECT COUNT(cm) FROM ClassroomMember cm WHERE cm.classroom.id = :classroomId AND cm.roleInClass = :role")
    Long countByClassroomIdAndRole(@Param("classroomId") Long classroomId, @Param("role") ClassroomRole role);

    @Query("SELECT cm.user FROM ClassroomMember cm WHERE cm.classroom.id = :classroomId AND cm.roleInClass = :role")
    List<User> findUsersByClassroomIdAndRole(@Param("classroomId") Long classroomId, @Param("role") ClassroomRole role);
}
