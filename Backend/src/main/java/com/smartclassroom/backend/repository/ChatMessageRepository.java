package com.smartclassroom.backend.repository;

import com.smartclassroom.backend.model.ChatMessage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {

    // Fetch up to 50 messages for a classroom in ascending time order.
    // We query via the classroom relation's id field.
    List<ChatMessage> findTop50ByClassroom_IdOrderByCreatedAtAsc(Long classroomId);

    // Fetch all messages for a classroom so they can be deleted safely.
    List<ChatMessage> findByClassroom_Id(Long classroomId);
}
