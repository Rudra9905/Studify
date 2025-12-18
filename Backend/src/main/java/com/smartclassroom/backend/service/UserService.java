package com.smartclassroom.backend.service;

import com.smartclassroom.backend.dto.auth.LoginRequestDTO;
import com.smartclassroom.backend.dto.auth.RegisterRequestDTO;
import com.smartclassroom.backend.dto.auth.UserUpdateRequestDTO;
import com.smartclassroom.backend.exception.BadRequestException;
import com.smartclassroom.backend.exception.DuplicateResourceException;
import com.smartclassroom.backend.exception.ResourceNotFoundException;
import com.smartclassroom.backend.model.User;
import com.smartclassroom.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public User registerUser(RegisterRequestDTO request) {
        userRepository.findByEmail(request.getEmail())
                .ifPresent(u -> { throw new DuplicateResourceException("Email already registered"); });

        User user = User.builder()
                .name(request.getName())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .phoneNumber(request.getPhoneNumber())
                .dateOfBirth(request.getDateOfBirth())
                .profileImageUrl(request.getProfileImageUrl())
                .role(request.getRole())
                .build();

        return userRepository.save(user);
    }

    public User authenticateUser(LoginRequestDTO request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new BadRequestException("Invalid email or password"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new BadRequestException("Invalid email or password");
        }
        return user;
    }

    public User getUserById(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id " + id));
    }

    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    public User updateUser(Long id, UserUpdateRequestDTO request) {
        User user = getUserById(id);

        if (request.getName() != null && !request.getName().trim().isEmpty()) {
            user.setName(request.getName().trim());
        } else if (request.getName() != null) {
            throw new BadRequestException("Name cannot be empty");
        }
        
        if (request.getPhoneNumber() != null) {
            String phone = request.getPhoneNumber().trim();
            user.setPhoneNumber(phone.isEmpty() ? null : phone);
        }
        
        if (request.getDateOfBirth() != null) {
            user.setDateOfBirth(request.getDateOfBirth());
        }
        
        if (request.getProfileImageUrl() != null) {
            String url = request.getProfileImageUrl().trim();
            user.setProfileImageUrl(url.isEmpty() ? null : url);
        }

        return userRepository.save(user);
    }
}