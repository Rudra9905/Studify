package com.smartclassroom.backend.repository;

import com.smartclassroom.backend.model.Meeting;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface MeetingRepository extends JpaRepository<Meeting, Long> {

    Optional<Meeting> findByClassroomIdAndActiveTrue(Long classroomId);
    
    Optional<Meeting> findByMeetingCodeAndActiveTrue(String meetingCode);
    
    Optional<Meeting> findByHostIdAndActiveTrue(Long hostId);
    
    Optional<Meeting> findByMeetingCode(String meetingCode);
}
