package com.smartclassroom.backend.controller;

import com.smartclassroom.backend.dto.auth.UserResponseDTO;
import com.smartclassroom.backend.dto.meeting.CreateClassroomMeetingRequestDTO;
import com.smartclassroom.backend.dto.meeting.CreateNormalMeetingRequestDTO;
import com.smartclassroom.backend.dto.meeting.JoinMeetingRequestDTO;
import com.smartclassroom.backend.dto.meeting.MeetingResponseDTO;
import com.smartclassroom.backend.model.Meeting;
import com.smartclassroom.backend.model.User;
import com.smartclassroom.backend.service.MeetingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/meetings")
@RequiredArgsConstructor
public class MeetingController {

    private final MeetingService meetingService;

    @PostMapping("/createClassroomMeeting")
    @ResponseStatus(HttpStatus.CREATED)
    public MeetingResponseDTO createClassroomMeeting(@Valid @RequestBody CreateClassroomMeetingRequestDTO request) {
        Meeting meeting = meetingService.createClassroomMeeting(request);
        return toMeetingResponse(meeting);
    }

    @PostMapping("/createNormalMeeting")
    @ResponseStatus(HttpStatus.CREATED)
    public MeetingResponseDTO createNormalMeeting(@Valid @RequestBody CreateNormalMeetingRequestDTO request) {
        Meeting meeting = meetingService.createNormalMeeting(request);
        return toMeetingResponse(meeting);
    }

    @PostMapping("/join")
    public MeetingResponseDTO joinMeeting(@Valid @RequestBody JoinMeetingRequestDTO request) {
        Meeting meeting = meetingService.joinMeeting(request);
        return toMeetingResponse(meeting);
    }

    @PostMapping("/end")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void endMeeting(@RequestParam("meetingCode") String meetingCode,
                          @RequestParam("userId") Long userId) {
        meetingService.endMeeting(meetingCode, userId);
    }
    
    @GetMapping("/status/{meetingCode}")
    public MeetingResponseDTO getMeetingStatus(@PathVariable String meetingCode) {
        Meeting meeting = meetingService.getMeetingByCode(meetingCode)
                .orElseThrow(() -> new com.smartclassroom.backend.exception.ResourceNotFoundException("Meeting not found with code: " + meetingCode));
        return toMeetingResponse(meeting);
    }

    private MeetingResponseDTO toMeetingResponse(Meeting meeting) {
        User host = meeting.getHost();
        UserResponseDTO hostDto = UserResponseDTO.builder()
                .id(host.getId())
                .name(host.getName())
                .email(host.getEmail())
                .role(host.getRole())
                .profileImageUrl(host.getProfileImageUrl())
                .build();

        // Generate signaling token for WebSocket authentication
        String signalingToken = meetingService.generateSignalingToken(meeting.getMeetingId());

        return MeetingResponseDTO.builder()
                .id(meeting.getId())
                .meetingId(meeting.getMeetingId())
                .meetingCode(meeting.getMeetingCode())
                .title(meeting.getTitle())
                .classroomId(meeting.getClassroom() != null ? meeting.getClassroom().getId() : null)
                .classroomName(meeting.getClassroom() != null ? meeting.getClassroom().getName() : null)
                .host(hostDto)
                .active(meeting.getActive())
                .createdAt(meeting.getCreatedAt())
                .endedAt(meeting.getEndedAt())
                .signalingToken(signalingToken)
                .isClassroomMeeting(meeting.isClassroomMeeting())
                .build();
    }


}
