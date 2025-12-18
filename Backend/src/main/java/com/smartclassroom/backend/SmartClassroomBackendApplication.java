package com.smartclassroom.backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.PropertySource;

@SpringBootApplication
@PropertySource("classpath:.env")
public class SmartClassroomBackendApplication {
       public static void main(String[] args) {
        SpringApplication.run(SmartClassroomBackendApplication.class, args);
    }
}