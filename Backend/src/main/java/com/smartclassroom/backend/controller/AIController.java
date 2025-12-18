package com.smartclassroom.backend.controller;

import com.smartclassroom.backend.service.ai.AIService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
public class AIController {

    private static final Logger log = LoggerFactory.getLogger(AIController.class);
    
    private final AIService aiService;

    @PostMapping("/pdf-summary")
    @ResponseStatus(HttpStatus.OK)
    public PdfSummaryResponse summarizePdf(@RequestParam("file") MultipartFile file) throws IOException {
        log.info("Received request to summarize PDF file: {}", file.getOriginalFilename());
        
        String summary = aiService.summarizePdf(file);
        
        PdfSummaryResponse response = new PdfSummaryResponse();
        response.setSummary(summary);
        response.setFileName(file.getOriginalFilename());
        
        return response;
    }
    
    // Inner class for response
    public static class PdfSummaryResponse {
        private String summary;
        private String fileName;
        
        public String getSummary() {
            return summary;
        }
        
        public void setSummary(String summary) {
            this.summary = summary;
        }
        
        public String getFileName() {
            return fileName;
        }
        
        public void setFileName(String fileName) {
            this.fileName = fileName;
        }
    }
}