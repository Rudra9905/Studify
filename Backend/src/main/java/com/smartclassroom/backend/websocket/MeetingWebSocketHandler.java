package com.smartclassroom.backend.websocket;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.smartclassroom.backend.model.Meeting;
import com.smartclassroom.backend.service.MeetingService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

@Component
@RequiredArgsConstructor
public class MeetingWebSocketHandler extends TextWebSocketHandler {

    private static final Logger log = LoggerFactory.getLogger(MeetingWebSocketHandler.class);

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final MeetingService meetingService;

    /**
     * Parse meeting ID from signaling token
     * Token format: Base64 encoded "meetingId:timestamp"
     */
    private String parseMeetingIdFromToken(String token) {
        try {
            String decoded = new String(java.util.Base64.getUrlDecoder().decode(token));
            String[] parts = decoded.split(":");
            if (parts.length >= 1) {
                return parts[0];
            }
        } catch (Exception e) {
            log.warn("Failed to parse signaling token: {}", e.getMessage());
        }
        return null;
    }

    // meetingCode -> (sessionId -> participant)
    private final Map<String, Map<String, Participant>> rooms = new ConcurrentHashMap<>();
    // sessionId -> (meetingCode, userId)
    private final Map<String, SessionInfo> sessions = new ConcurrentHashMap<>();

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
        super.afterConnectionClosed(session, status);
        removeSession(session.getId());
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        JsonNode node = objectMapper.readTree(message.getPayload());
        String type = node.path("type").asText(null);
        if (type == null) {
            log.warn("Received message without type: {}", message.getPayload());
            return;
        }

        switch (type) {
            case "join" -> handleJoin(session, node);
            case "offer", "answer", "ice-candidate" -> handleRelay(node);
            case "raise-hand" -> handleRaiseHand(node);
            case "chat-message" -> handleChatMessage(node);
            case "mic-state" -> handleMicState(node);
            case "cam-state" -> handleCamState(node);
            case "end-meeting" -> handleEndMeeting(node);
            case "leave" -> removeSession(session.getId());
            default -> log.warn("Unknown meeting message type: {}", type);
        }
    }

    private void handleJoin(WebSocketSession session, JsonNode node) throws IOException {
        String meetingCode = node.path("meetingCode").asText(null);
        String userIdStr = node.path("fromUserId").asText();
        long userId = Long.parseLong(userIdStr); // Parse string to long
        String signalingToken = node.path("payload").path("token").asText(null);

        // Validate that an active meeting exists for this code
        Optional<Meeting> meetingOpt = meetingService.getActiveMeetingByCode(meetingCode);
        if (meetingOpt.isEmpty()) {
            log.warn("User {} attempted to join non-existent meeting with code {}", userId, meetingCode);
            ObjectNode errorMsg = objectMapper.createObjectNode();
            errorMsg.put("type", "error");
            errorMsg.put("message", "No active meeting exists with this code. Please check the code or ask the host to start a meeting.");
            session.sendMessage(new TextMessage(objectMapper.writeValueAsString(errorMsg)));
            session.close(CloseStatus.POLICY_VIOLATION);
            return;
        }

        // Validate signaling token
        if (signalingToken == null || signalingToken.isEmpty()) {
            log.warn("User {} attempted to join meeting {} without signaling token", userId, meetingCode);
            ObjectNode errorMsg = objectMapper.createObjectNode();
            errorMsg.put("type", "error");
            errorMsg.put("message", "Authentication required. Please join the meeting through the official interface.");
            session.sendMessage(new TextMessage(objectMapper.writeValueAsString(errorMsg)));
            session.close(CloseStatus.POLICY_VIOLATION);
            return;
        }

        // Additional validation: Check if the user actually joined the meeting through the API
        // This ensures the signaling token was generated by our system
        Meeting meeting = meetingOpt.get();
        if (!meeting.getId().toString().equals(parseMeetingIdFromToken(signalingToken))) {
            log.warn("User {} attempted to join meeting {} with invalid signaling token", userId, meetingCode);
            ObjectNode errorMsg = objectMapper.createObjectNode();
            errorMsg.put("type", "error");
            errorMsg.put("message", "Invalid authentication token. Please rejoin the meeting.");
            session.sendMessage(new TextMessage(objectMapper.writeValueAsString(errorMsg)));
            session.close(CloseStatus.POLICY_VIOLATION);
            return;
        }

        Map<String, Participant> room = rooms.computeIfAbsent(meetingCode, id -> new ConcurrentHashMap<>());

        // Collect existing participants (before adding this one)
        List<Long> existingUserIds = new ArrayList<>();
        for (Participant p : room.values()) {
            existingUserIds.add(p.userId());
        }

        // Register this participant
        room.put(session.getId(), new Participant(userId, session));
        sessions.put(session.getId(), new SessionInfo(meetingCode, userId));

        // Send existing participant list to the new joiner
        ObjectNode response = objectMapper.createObjectNode();
        response.put("type", "existing-participants");
        response.put("meetingCode", meetingCode);
        ArrayNode arr = response.putArray("participants");
        for (Long existingId : existingUserIds) {
            arr.add(String.valueOf(existingId)); // Convert to string
        }
        session.sendMessage(new TextMessage(objectMapper.writeValueAsString(response)));

        // Notify existing participants about the new joiner
        if (!existingUserIds.isEmpty()) {
            ObjectNode joinNotification = objectMapper.createObjectNode();
            joinNotification.put("type", "participant-joined");
            joinNotification.put("meetingCode", meetingCode);
            joinNotification.put("userId", String.valueOf(userId)); // Convert to string
            String joinPayload = objectMapper.writeValueAsString(joinNotification);
            for (Participant existingParticipant : room.values()) {
                if (existingParticipant.userId() != userId) {
                    WebSocketSession s = existingParticipant.session();
                    if (s.isOpen()) {
                        s.sendMessage(new TextMessage(joinPayload));
                    }
                }
            }
        }

        log.info("User {} joined meeting with code {} ({} existing peers)", userId, meetingCode, existingUserIds.size());
    }

    private void handleRelay(JsonNode node) throws IOException {
        String meetingCode = node.path("meetingCode").asText();
        String toUserId = node.path("toUserId").asText();

        Map<String, Participant> room = rooms.get(meetingCode);
        if (room == null) {
            return;
        }

        // Find target participant by userId (convert to string for comparison)
        for (Participant participant : room.values()) {
            if (String.valueOf(participant.userId()).equals(toUserId)) {
                WebSocketSession targetSession = participant.session();
                if (targetSession.isOpen()) {
                    targetSession.sendMessage(new TextMessage(objectMapper.writeValueAsString(node)));
                }
                break;
            }
        }
    }

    private void handleRaiseHand(JsonNode node) throws IOException {
        String meetingCode = node.path("meetingCode").asText();
        Map<String, Participant> room = rooms.get(meetingCode);
        if (room == null) {
            return;
        }
        String payload = objectMapper.writeValueAsString(node);
        for (Participant participant : room.values()) {
            WebSocketSession s = participant.session();
            if (s.isOpen()) {
                s.sendMessage(new TextMessage(payload));
            }
        }
    }

    private void handleChatMessage(JsonNode node) throws IOException {
        String meetingCode = node.path("meetingCode").asText();
        Map<String, Participant> room = rooms.get(meetingCode);
        if (room == null) {
            return;
        }
        // Broadcast chat message to all participants in the room
        String payload = objectMapper.writeValueAsString(node);
        for (Participant participant : room.values()) {
            WebSocketSession s = participant.session();
            if (s.isOpen()) {
                s.sendMessage(new TextMessage(payload));
            }
        }
    }

    private void handleMicState(JsonNode node) throws IOException {
        String meetingCode = node.path("meetingCode").asText();
        String fromUserIdStr = node.path("fromUserId").asText();
        long fromUserId = Long.parseLong(fromUserIdStr); // Parse string to long
        boolean isOn = node.path("isOn").asBoolean();
        
        Map<String, Participant> room = rooms.get(meetingCode);
        if (room == null) {
            return;
        }
        
        log.debug("User {} mic state changed to {} in meeting {}", fromUserId, isOn, meetingCode);
        
        // Broadcast mic state to all participants in the room
        ObjectNode micStateMsg = objectMapper.createObjectNode();
        micStateMsg.put("type", "mic-state");
        micStateMsg.put("meetingCode", meetingCode);
        micStateMsg.put("userId", fromUserId);
        micStateMsg.put("isOn", isOn);
        
        String payload = objectMapper.writeValueAsString(micStateMsg);
        for (Participant participant : room.values()) {
            WebSocketSession s = participant.session();
            if (s.isOpen()) {
                s.sendMessage(new TextMessage(payload));
            }
        }
    }

    private void handleCamState(JsonNode node) throws IOException {
        String meetingCode = node.path("meetingCode").asText();
        String fromUserIdStr = node.path("fromUserId").asText();
        long fromUserId = Long.parseLong(fromUserIdStr); // Parse string to long
        boolean isOn = node.path("isOn").asBoolean();
        
        Map<String, Participant> room = rooms.get(meetingCode);
        if (room == null) {
            return;
        }
        
        log.debug("User {} cam state changed to {} in meeting {}", fromUserId, isOn, meetingCode);
        
        // Broadcast cam state to all participants in the room
        ObjectNode camStateMsg = objectMapper.createObjectNode();
        camStateMsg.put("type", "cam-state");
        camStateMsg.put("meetingCode", meetingCode);
        camStateMsg.put("userId", fromUserId);
        camStateMsg.put("isOn", isOn);
        
        String payload = objectMapper.writeValueAsString(camStateMsg);
        for (Participant participant : room.values()) {
            WebSocketSession s = participant.session();
            if (s.isOpen()) {
                s.sendMessage(new TextMessage(payload));
            }
        }
    }

    private void handleEndMeeting(JsonNode node) throws IOException {
        String meetingCode = node.path("meetingCode").asText();
        String fromUserIdStr = node.path("fromUserId").asText();
        long fromUserId = Long.parseLong(fromUserIdStr); // Parse string to long
        
        Map<String, Participant> room = rooms.get(meetingCode);
        if (room == null) {
            return;
        }

        log.info("Host {} ending meeting {} - broadcasting to all {} participants", 
                fromUserId, meetingCode, room.size());

        // Broadcast meeting-ended to ALL participants (including the host)
        ObjectNode endMsg = objectMapper.createObjectNode();
        endMsg.put("type", "end-meeting");
        endMsg.put("meetingCode", meetingCode);
        endMsg.put("fromUserId", fromUserId);
        String payload = objectMapper.writeValueAsString(endMsg);
        
        for (Participant participant : room.values()) {
            WebSocketSession s = participant.session();
            if (s.isOpen()) {
                try {
                    s.sendMessage(new TextMessage(payload));
                } catch (Exception e) {
                    log.warn("Failed to send end-meeting to user {}: {}", participant.userId(), e.getMessage());
                }
            }
        }

        // Clean up the room after broadcasting
        rooms.remove(meetingCode);
        
        // Remove all sessions for this meeting
        sessions.entrySet().removeIf(entry -> entry.getValue().meetingCode().equals(meetingCode));
        
        log.info("Meeting {} terminated. All {} participants disconnected.", meetingCode, room.size());
    }

    private void removeSession(String sessionId) throws IOException {
        SessionInfo info = sessions.remove(sessionId);
        if (info == null) {
            return;
        }

        Map<String, Participant> room = rooms.get(info.meetingCode());
        if (room != null) {
            room.remove(sessionId);
            if (room.isEmpty()) {
                rooms.remove(info.meetingCode());
            } else {
                // Notify remaining participants that this user left
                ObjectNode msg = objectMapper.createObjectNode();
                msg.put("type", "participant-left");
                msg.put("meetingCode", info.meetingCode());
                msg.put("userId", String.valueOf(info.userId())); // Convert to string
                String payload = objectMapper.writeValueAsString(msg);
                for (Participant participant : room.values()) {
                    WebSocketSession s = participant.session();
                    if (s.isOpen()) {
                        s.sendMessage(new TextMessage(payload));
                    }
                }
            }
        }

        log.info("User {} left meeting {}", info.userId(), info.meetingCode());
    }

    private record Participant(long userId, WebSocketSession session) {}

    private record SessionInfo(String meetingCode, long userId) {}
}
