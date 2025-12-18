package com.smartclassroom.backend.config;

import com.smartclassroom.backend.websocket.MeetingWebSocketHandler;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {

    private final MeetingWebSocketHandler meetingWebSocketHandler;
    private final List<String> allowedOrigins;

    public WebSocketConfig(MeetingWebSocketHandler meetingWebSocketHandler,
                           @Value("${app.cors.allowed-origins:*}") String corsOrigins) {
        this.meetingWebSocketHandler = meetingWebSocketHandler;
        this.allowedOrigins = resolveOrigins(corsOrigins);
    }

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(meetingWebSocketHandler, "/ws/meet")
                .setAllowedOriginPatterns(allowedOrigins.toArray(String[]::new));
    }

    private List<String> resolveOrigins(String corsOrigins) {
        List<String> origins = Arrays.stream(corsOrigins.split(","))
                .map(String::trim)
                .filter(origin -> !origin.isEmpty())
                .collect(Collectors.toUnmodifiableList());
        return origins.isEmpty() ? List.of("*") : origins;
    }
}
