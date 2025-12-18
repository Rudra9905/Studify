package com.smartclassroom.backend.service;

import com.smartclassroom.backend.exception.ResourceNotFoundException;
import com.smartclassroom.backend.model.Announcement;
import com.smartclassroom.backend.model.Classroom;
import com.smartclassroom.backend.model.User;
import com.smartclassroom.backend.repository.AnnouncementRepository;
import com.smartclassroom.backend.repository.ClassroomRepository;
import com.smartclassroom.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AnnouncementService {

    private final AnnouncementRepository announcementRepository;
    private final ClassroomRepository classroomRepository;
    private final UserRepository userRepository;

    public Announcement createAnnouncement(Long classroomId, Long authorId, String title, String content, String attachmentUrl) {
        Classroom classroom = classroomRepository.findById(classroomId)
                .orElseThrow(() -> new ResourceNotFoundException("Classroom not found with id " + classroomId));
        User author = userRepository.findById(authorId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id " + authorId));

        Announcement announcement = Announcement.builder()
                .classroom(classroom)
                .author(author)
                .title(title)
                .content(content)
                .attachmentUrl(attachmentUrl)
                .build();
        return announcementRepository.save(announcement);
    }

    public List<Announcement> getAnnouncements(Long classroomId) {
        return announcementRepository.findByClassroomIdOrderByCreatedAtDesc(classroomId);
    }

    public Announcement clearAttachment(Long announcementId) {
        Announcement announcement = announcementRepository.findById(announcementId)
                .orElseThrow(() -> new ResourceNotFoundException("Announcement not found with id " + announcementId));
        announcement.setAttachmentUrl(null);
        return announcementRepository.save(announcement);
    }

    public Announcement getAnnouncement(Long announcementId) {
        return announcementRepository.findById(announcementId)
                .orElseThrow(() -> new ResourceNotFoundException("Announcement not found with id " + announcementId));
    }

    public void deleteAnnouncement(Long announcementId) {
        Announcement announcement = getAnnouncement(announcementId);
        announcementRepository.delete(announcement);
    }
}
