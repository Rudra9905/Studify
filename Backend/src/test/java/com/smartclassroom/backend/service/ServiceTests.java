package com.smartclassroom.backend.service;

import com.smartclassroom.backend.dto.assignment.AssignmentCreateRequestDTO;
import com.smartclassroom.backend.dto.auth.RegisterRequestDTO;
import com.smartclassroom.backend.exception.DuplicateResourceException;
import com.smartclassroom.backend.model.*;
import com.smartclassroom.backend.repository.AssignmentRepository;
import com.smartclassroom.backend.repository.ClassroomRepository;
import com.smartclassroom.backend.repository.UserRepository;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Mockito;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

@ExtendWith(MockitoExtension.class)
public class ServiceTests {

    @Mock
    private UserRepository userRepository;

    @Mock
    private ClassroomRepository classroomRepository;

    @Mock
    private AssignmentRepository assignmentRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private UserService userService;

    @InjectMocks
    private AssignmentService assignmentService;

    @Test
    void registerUser_success() {
        RegisterRequestDTO req = new RegisterRequestDTO();
        req.setName("Alice");
        req.setEmail("alice@example.com");
        req.setPassword("pwd");
        req.setRole(UserRole.TEACHER);

        Mockito.when(userRepository.findByEmail("alice@example.com")).thenReturn(Optional.empty());
        Mockito.when(passwordEncoder.encode("pwd")).thenReturn("encodedPwd");
        Mockito.when(userRepository.save(Mockito.any(User.class))).thenAnswer(inv -> {
            User u = inv.getArgument(0);
            u.setId(1L);
            return u;
        });

        User user = userService.registerUser(req);
        Assertions.assertNotNull(user.getId());
        Assertions.assertEquals("alice@example.com", user.getEmail());
    }

    @Test
    void registerUser_duplicateEmail_throws() {
        RegisterRequestDTO req = new RegisterRequestDTO();
        req.setName("Alice");
        req.setEmail("alice@example.com");
        req.setPassword("pwd");
        req.setRole(UserRole.STUDENT);

        Mockito.when(userRepository.findByEmail("alice@example.com"))
                .thenReturn(Optional.of(new User()));

        Assertions.assertThrows(DuplicateResourceException.class, () -> userService.registerUser(req));
    }

    @Test
    void createAssignment_success() {
        Classroom classroom = Classroom.builder().id(10L).name("Math").build();
        User teacher = User.builder().id(2L).name("Teacher").role(UserRole.TEACHER).build();

        Mockito.when(classroomRepository.findById(10L)).thenReturn(Optional.of(classroom));
        Mockito.when(userRepository.findById(2L)).thenReturn(Optional.of(teacher));
        Mockito.when(assignmentRepository.save(Mockito.any(Assignment.class))).thenAnswer(inv -> {
            Assignment a = inv.getArgument(0);
            a.setId(5L);
            return a;
        });

        AssignmentCreateRequestDTO req = new AssignmentCreateRequestDTO();
        req.setClassroomId(10L);
        req.setTitle("HW 1");

        Assignment assignment = assignmentService.createAssignment(10L, 2L, req);
        Assertions.assertNotNull(assignment.getId());
        Assertions.assertEquals("HW 1", assignment.getTitle());
    }
}