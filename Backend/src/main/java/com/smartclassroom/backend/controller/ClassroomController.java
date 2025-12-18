package com.smartclassroom.backend.controller;

import com.smartclassroom.backend.dto.auth.UserResponseDTO;
import com.smartclassroom.backend.dto.classroom.*;
import com.smartclassroom.backend.model.Classroom;
import com.smartclassroom.backend.model.ClassroomMember;
import com.smartclassroom.backend.model.User;
import com.smartclassroom.backend.service.ClassroomService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/classrooms")
@RequiredArgsConstructor
public class ClassroomController {

    private final ClassroomService classroomService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ClassroomResponseDTO createClassroom(@RequestParam("teacherId") Long teacherId,
                                                @Valid @RequestBody ClassroomCreateRequestDTO request) {
        Classroom classroom = classroomService.createClassroom(teacherId, request);
        return toClassroomResponse(classroom);
    }

    @GetMapping
    public List<ClassroomResponseDTO> listClassrooms(@RequestParam(value = "teacherId", required = false) Long teacherId,
                                                     @RequestParam(value = "studentId", required = false) Long studentId) {
        return classroomService.getClassrooms(teacherId, studentId).stream()
                .map(this::toClassroomResponse)
                .collect(Collectors.toList());
    }

    @GetMapping("/{id}")
    public ClassroomResponseDTO getClassroom(@PathVariable Long id) {
        Classroom classroom = classroomService.getClassroomById(id);
        return toClassroomResponse(classroom);
    }

    @PostMapping("/join")
    @ResponseStatus(HttpStatus.CREATED)
    public ClassroomResponseDTO joinClassroom(@RequestParam("userId") Long userId,
                                              @Valid @RequestBody JoinClassroomRequestDTO request) {
        ClassroomMember member = classroomService.joinClassroom(userId, request);
        return toClassroomResponse(member.getClassroom());
    }

    @GetMapping("/{id}/members")
    public List<ClassroomMemberResponseDTO> getMembers(@PathVariable("id") Long classroomId) {
        List<ClassroomMember> members = classroomService.getMembers(classroomId);
        return members.stream()
                .map(this::toMemberResponse)
                .collect(Collectors.toList());
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteClassroom(@PathVariable Long id, @RequestParam("teacherId") Long teacherId) {
        classroomService.deleteClassroom(id, teacherId);
    }

    @DeleteMapping("/{id}/leave")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void leaveClassroom(@PathVariable Long id, @RequestParam("userId") Long userId) {
        classroomService.leaveClassroom(id, userId);
    }

    private ClassroomResponseDTO toClassroomResponse(Classroom classroom) {
        User teacher = classroom.getTeacher();
        UserResponseDTO teacherDto = UserResponseDTO.builder()
                .id(teacher.getId())
                .name(teacher.getName())
                .email(teacher.getEmail())
                .role(teacher.getRole())
                .build();
        return ClassroomResponseDTO.builder()
                .id(classroom.getId())
                .name(classroom.getName())
                .description(classroom.getDescription())
                .code(classroom.getCode())
                .teacher(teacherDto)
                .build();
    }

    private ClassroomMemberResponseDTO toMemberResponse(ClassroomMember member) {
        User user = member.getUser();
        UserResponseDTO userDto = UserResponseDTO.builder()
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .role(user.getRole())
                .phoneNumber(user.getPhoneNumber())
                .dateOfBirth(user.getDateOfBirth())
                .profileImageUrl(user.getProfileImageUrl())
                .build();
        return ClassroomMemberResponseDTO.builder()
                .id(member.getId())
                .classroomId(member.getClassroom().getId())
                .user(userDto)
                .roleInClass(member.getRoleInClass())
                .joinedAt(member.getJoinedAt())
                .build();
    }
}
