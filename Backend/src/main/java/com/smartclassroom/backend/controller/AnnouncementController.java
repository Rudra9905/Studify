package com.smartclassroom.backend.controller;

import com.smartclassroom.backend.dto.announcement.AnnouncementCreateRequestDTO;
import com.smartclassroom.backend.dto.announcement.AnnouncementResponseDTO;
import com.smartclassroom.backend.dto.auth.UserResponseDTO;
import com.smartclassroom.backend.model.Announcement;
import com.smartclassroom.backend.model.User;
import com.smartclassroom.backend.service.AnnouncementService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/classrooms/{classroomId}/announcements")
@RequiredArgsConstructor
public class AnnouncementController {

    private final AnnouncementService announcementService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public AnnouncementResponseDTO create(@PathVariable Long classroomId,
                                          @RequestParam("authorId") Long authorId,
                                          @Valid @RequestBody AnnouncementCreateRequestDTO request) {
        Announcement announcement = announcementService.createAnnouncement(classroomId, authorId,
                request.getTitle(), request.getContent(), request.getAttachmentUrl());
        return toResponse(announcement);
    }

    @GetMapping
    public List<AnnouncementResponseDTO> list(@PathVariable Long classroomId) {
        return announcementService.getAnnouncements(classroomId).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @GetMapping("/{announcementId}")
    public AnnouncementResponseDTO get(@PathVariable Long classroomId, @PathVariable Long announcementId) {
        Announcement announcement = announcementService.getAnnouncement(announcementId);
        return toResponse(announcement);
    }

    @DeleteMapping("/{announcementId}/attachment")
    public AnnouncementResponseDTO clearAttachment(@PathVariable Long classroomId,
                                                   @PathVariable Long announcementId) {
        Announcement announcement = announcementService.clearAttachment(announcementId);
        return toResponse(announcement);
    }

    @DeleteMapping("/{announcementId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteAnnouncement(@PathVariable Long classroomId,
                                   @PathVariable Long announcementId) {
        announcementService.deleteAnnouncement(announcementId);
    }

    private AnnouncementResponseDTO toResponse(Announcement announcement) {
        User author = announcement.getAuthor();
        UserResponseDTO authorDto = UserResponseDTO.builder()
                .id(author.getId())
                .name(author.getName())
                .email(author.getEmail())
                .role(author.getRole())
                .phoneNumber(author.getPhoneNumber())
                .dateOfBirth(author.getDateOfBirth())
                .profileImageUrl(author.getProfileImageUrl())
                .build();
        return AnnouncementResponseDTO.builder()
                .id(announcement.getId())
                .classroomId(announcement.getClassroom().getId())
                .author(authorDto)
                .title(announcement.getTitle())
                .content(announcement.getContent())
                .attachmentUrl(announcement.getAttachmentUrl())
                .createdAt(announcement.getCreatedAt())
                .build();
    }
}
