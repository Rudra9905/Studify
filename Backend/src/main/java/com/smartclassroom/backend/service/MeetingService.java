package com.smartclassroom.backend.service;

import com.smartclassroom.backend.dto.meeting.CreateClassroomMeetingRequestDTO;
import com.smartclassroom.backend.dto.meeting.CreateNormalMeetingRequestDTO;
import com.smartclassroom.backend.dto.meeting.JoinMeetingRequestDTO;
import com.smartclassroom.backend.exception.BadRequestException;
import com.smartclassroom.backend.exception.ResourceNotFoundException;
import com.smartclassroom.backend.model.Announcement;
import com.smartclassroom.backend.model.Classroom;
import com.smartclassroom.backend.model.ClassroomMember;
import com.smartclassroom.backend.model.Meeting;
import com.smartclassroom.backend.model.User;
import com.smartclassroom.backend.repository.AnnouncementRepository;
import com.smartclassroom.backend.repository.ClassroomMemberRepository;
import com.smartclassroom.backend.repository.ClassroomRepository;
import com.smartclassroom.backend.repository.MeetingRepository;
import com.smartclassroom.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class MeetingService {

    private static final Logger log = LoggerFactory.getLogger(MeetingService.class);

    private final MeetingRepository meetingRepository;
    private final ClassroomRepository classroomRepository;
    private final UserRepository userRepository;
    private final ClassroomMemberRepository classroomMemberRepository;
    private final AnnouncementRepository announcementRepository;

    /**
     * Generate a simple signaling token (JWT can be added later for production)
     * Token format: Base64 encoded "meetingId:timestamp"
     */
    public String generateSignalingToken(String meetingId) {
        return java.util.Base64.getUrlEncoder().withoutPadding()
                .encodeToString((meetingId + ":" + System.currentTimeMillis()).getBytes());
    }

    @Transactional
    public Meeting createClassroomMeeting(CreateClassroomMeetingRequestDTO request) {
        log.info("Creating classroom meeting for classroom {} by user {}", request.getClassroomId(), request.getHostUserId());

        // Validate classroom exists
        Classroom classroom = classroomRepository.findById(request.getClassroomId())
                .orElseThrow(() -> new ResourceNotFoundException("Classroom not found with id: " + request.getClassroomId()));

        // Validate user exists and is teacher
        User host = userRepository.findById(request.getHostUserId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + request.getHostUserId()));

        // Check if user is the teacher of this classroom
        if (!classroom.getTeacher().getId().equals(host.getId())) {
            throw new BadRequestException("Only the classroom teacher can create a classroom meeting");
        }

        // Check if active meeting already exists for this classroom
        Optional<Meeting> existingMeeting = meetingRepository.findByClassroomIdAndActiveTrue(classroom.getId());
        if (existingMeeting.isPresent()) {
            log.info("Active meeting already exists for classroom {}", classroom.getId());
            return existingMeeting.get();
        }

        // Try to create new classroom meeting with unique meeting code
        Meeting meeting = null;
        int attempts = 0;
        final int maxAttempts = 10;
        
        while (meeting == null && attempts < maxAttempts) {
            try {
                meeting = Meeting.builder()
                        .title(classroom.getName() + " - Meeting")
                        .classroom(classroom)
                        .host(host)
                        .active(true)
                        .build();
                
                // Set the meeting code before saving
                meeting.setMeetingCode(Meeting.generateMeetingCode());
                
                meeting = meetingRepository.save(meeting);
            } catch (DataIntegrityViolationException e) {
                log.warn("Meeting code collision detected, retrying... Attempt {}/{}", attempts + 1, maxAttempts);
                meeting = null;
                attempts++;
            }
        }
        
        if (meeting == null) {
            throw new RuntimeException("Unable to generate unique meeting code after " + maxAttempts + " attempts");
        }

        // Create announcement for classroom members
        Announcement announcement = Announcement.builder()
                .classroom(classroom)
                .title("Live Meeting Started!")
                .content(String.format("A live meeting has started for your classroom. Code: %s", meeting.getMeetingCode()))
                .author(host)
                .build();
        
        announcementRepository.save(announcement);
        
        log.info("Classroom meeting created with id {} and meetingCode {} for classroom {}", 
                meeting.getId(), meeting.getMeetingCode(), classroom.getId());
        
        return meeting;
    }

    @Transactional
    public Meeting createNormalMeeting(CreateNormalMeetingRequestDTO request) {
        log.info("Creating normal meeting by user {}", request.getHostUserId());

        // Validate user exists
        User host = userRepository.findById(request.getHostUserId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + request.getHostUserId()));

        // Check if user already has an active meeting
        Optional<Meeting> existingMeeting = meetingRepository.findByHostIdAndActiveTrue(host.getId());
        if (existingMeeting.isPresent()) {
            log.info("User {} already has an active meeting", host.getId());
            return existingMeeting.get();
        }

        // Try to create new normal meeting with unique meeting code
        Meeting meeting = null;
        int attempts = 0;
        final int maxAttempts = 10;
        
        while (meeting == null && attempts < maxAttempts) {
            try {
                meeting = Meeting.builder()
                        .title(host.getName() + "'s Meeting")
                        .host(host)
                        .active(true)
                        .build();
                
                // Set the meeting code before saving
                meeting.setMeetingCode(Meeting.generateMeetingCode());
                
                meeting = meetingRepository.save(meeting);
            } catch (DataIntegrityViolationException e) {
                log.warn("Meeting code collision detected, retrying... Attempt {}/{}", attempts + 1, maxAttempts);
                meeting = null;
                attempts++;
            }
        }
        
        if (meeting == null) {
            throw new RuntimeException("Unable to generate unique meeting code after " + maxAttempts + " attempts");
        }
        
        log.info("Normal meeting created with id {} and meetingCode {}", 
                meeting.getId(), meeting.getMeetingCode());
        
        return meeting;
    }

    @Transactional(readOnly = true)
    public Meeting joinMeeting(JoinMeetingRequestDTO request) {
        log.info("User {} attempting to join meeting with code {}", request.getUserId(), request.getMeetingCode());

        // Validate user exists
        User user = userRepository.findById(request.getUserId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + request.getUserId()));

        // Check if meeting exists and is active
        Meeting meeting = meetingRepository.findByMeetingCodeAndActiveTrue(request.getMeetingCode())
                .orElseThrow(() -> new ResourceNotFoundException("No active meeting found with code: " + request.getMeetingCode()));

        // If it's a classroom meeting, validate user is member of the classroom
        if (meeting.isClassroomMeeting()) {
            boolean isTeacher = meeting.getClassroom().getTeacher().getId().equals(user.getId());
            boolean isMember = classroomMemberRepository.findByClassroomIdAndUserId(
                    meeting.getClassroom().getId(), user.getId()).isPresent();
            
            if (!isTeacher && !isMember) {
                throw new BadRequestException("You are not authorized to join this classroom meeting. Please contact the classroom teacher.");
            }
        }
        // For normal meetings, anyone with the code can join (they still need to be logged in)

        log.info("User {} authorized to join meeting {} (meetingCode: {}) - Type: {}", 
                user.getId(), meeting.getId(), meeting.getMeetingCode(), 
                meeting.isClassroomMeeting() ? "Classroom" : "Normal");
        return meeting;
    }

    @Transactional
    public void endMeeting(String meetingCode, Long userId) {
        log.info("User {} attempting to end meeting with code {}", userId, meetingCode);

        // Validate user exists
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userId));

        
        Meeting meeting = meetingRepository.findByMeetingCodeAndActiveTrue(meetingCode)
                .orElseThrow(() -> new ResourceNotFoundException("No active meeting found with code: " + meetingCode));

        
        if (!meeting.getHost().getId().equals(user.getId())) {
            throw new BadRequestException("Only the meeting host can end the meeting");
        }

        
        meeting.setActive(false);
        meeting.setEndedAt(LocalDateTime.now());
        meetingRepository.save(meeting);

        log.info("Meeting {} (meetingCode: {}) ended by host {}", 
                meeting.getId(), meetingCode, userId);
    }

    @Transactional(readOnly = true)
    public Optional<Meeting> getActiveMeetingByCode(String meetingCode) {
        return meetingRepository.findByMeetingCodeAndActiveTrue(meetingCode);
    }
    
    @Transactional(readOnly = true)
    public Optional<Meeting> getMeetingByCode(String meetingCode) {
        return meetingRepository.findByMeetingCode(meetingCode);
    }
}