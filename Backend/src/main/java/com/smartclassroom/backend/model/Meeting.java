package com.smartclassroom.backend.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;
import java.security.SecureRandom;

@Entity
@Table(name = "meetings")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Meeting {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false, updatable = false)
    private String meetingId; // UUID for internal identification

    @Column(unique = true, nullable = false)
    private String meetingCode; // 6-digit code for joining (e.g., "ABC123")

    @ManyToOne
    @JoinColumn(name = "classroom_id")
    private Classroom classroom; // Nullable - if null, it's a Normal Meeting

    @ManyToOne(optional = false)
    @JoinColumn(name = "host_user_id")
    private User host; // The user who created/hosts the meeting

    @Column
    private String title;

    @Column(nullable = false)
    private Boolean active;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @Column
    private LocalDateTime endedAt;

    private static final SecureRandom random = new SecureRandom();
    private static final String CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Avoid confusing chars

    @PrePersist
    protected void onCreate() {
        if (meetingId == null) {
            meetingId = UUID.randomUUID().toString();
        }
        if (meetingCode == null) {
            meetingCode = generateUniqueMeetingCode();
        }
    }

    private String generateUniqueMeetingCode() {
        StringBuilder code = new StringBuilder(6);
        for (int i = 0; i < 6; i++) {
            code.append(CHARS.charAt(random.nextInt(CHARS.length())));
        }
        return code.toString();
    }
    
    // This method should be called in a loop with collision detection in the service layer
    public static String generateMeetingCode() {
        StringBuilder code = new StringBuilder(6);
        SecureRandom rand = new SecureRandom();
        for (int i = 0; i < 6; i++) {
            code.append(CHARS.charAt(rand.nextInt(CHARS.length())));
        }
        return code.toString();
    }

    public boolean isClassroomMeeting() {
        return classroom != null;
    }
}