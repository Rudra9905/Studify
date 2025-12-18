package com.smartclassroom.backend.controller;

import com.smartclassroom.backend.dto.auth.UserResponseDTO;
import com.smartclassroom.backend.dto.chat.ChatMessageRequestDTO;
import com.smartclassroom.backend.dto.chat.ChatMessageResponseDTO;
import com.smartclassroom.backend.model.ChatMessage;
import com.smartclassroom.backend.model.User;
import com.smartclassroom.backend.service.ChatService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/classrooms/{classroomId}/chat")
@RequiredArgsConstructor
public class ChatController {

    private final ChatService chatService;

    @PostMapping("/messages")
    @ResponseStatus(HttpStatus.CREATED)
    public ChatMessageResponseDTO postMessage(@PathVariable Long classroomId,
                                              @RequestParam("senderId") Long senderId,
                                              @Valid @RequestBody ChatMessageRequestDTO request) {
        request.setClassroomId(classroomId);
        ChatMessage message = chatService.postMessage(classroomId, senderId, request);
        return toResponse(message);
    }

    @GetMapping("/messages")
    public List<ChatMessageResponseDTO> getMessages(@PathVariable Long classroomId,
                                                     @RequestParam("userId") Long userId) {
        return chatService.getRecentMessages(classroomId, userId).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @DeleteMapping("/messages")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void clearMessages(@PathVariable Long classroomId,
                              @RequestParam("requesterId") Long requesterId) {
        chatService.clearMessages(classroomId, requesterId);
    }

    private ChatMessageResponseDTO toResponse(ChatMessage message) {
        User sender = message.getSender();
        UserResponseDTO senderDto = UserResponseDTO.builder()
                .id(sender.getId())
                .name(sender.getName())
                .email(sender.getEmail())
                .role(sender.getRole())
                .phoneNumber(sender.getPhoneNumber())
                .dateOfBirth(sender.getDateOfBirth())
                .profileImageUrl(sender.getProfileImageUrl())
                .build();
        return ChatMessageResponseDTO.builder()
                .id(message.getId())
                .classroomId(message.getClassroom().getId())
                .sender(senderDto)
                .content(message.getContent())
                .createdAt(message.getCreatedAt())
                .build();
    }
}
