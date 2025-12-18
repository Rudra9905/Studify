package com.smartclassroom.backend.config;

import com.smartclassroom.backend.model.User;
import com.smartclassroom.backend.model.UserRole;
import com.smartclassroom.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) throws Exception {
        // Check if users already exist
        if (userRepository.count() == 0) {
            // Create a default teacher user
            User teacher = User.builder()
                    .name("John Teacher")
                    .email("teacher@example.com")
                    .password(passwordEncoder.encode("teacher123"))
                    .role(UserRole.TEACHER)
                    .build();
            
            // Create a default student user
            User student = User.builder()
                    .name("Jane Student")
                    .email("student@example.com")
                    .password(passwordEncoder.encode("student123"))
                    .role(UserRole.STUDENT)
                    .build();
            
            userRepository.save(teacher);
            userRepository.save(student);
            
            System.out.println("=== INITIAL USERS CREATED ===");
            System.out.println("Teacher login: teacher@example.com / teacher123");
            System.out.println("Student login: student@example.com / student123");
            System.out.println("==============================");
        }
    }
}