package com.smartclassroom.backend.service.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.extern.slf4j.Slf4j; // Removed @RequiredArgsConstructor
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.Scanner;

@Slf4j
@Service
public class AIService {

    @Value("${gemini.api.key:}")
    private String geminiApiKey;

    // FIX: Initialize manually instead of using @RequiredArgsConstructor
    private final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * Generates a summary of a PDF document using Google Gemini 1.5 Flash
     */
    public String summarizePdf(MultipartFile file) throws IOException {
        if (geminiApiKey == null || geminiApiKey.isEmpty()) {
            throw new IllegalStateException("Gemini API key is not configured.");
        }

        // 1. Extract text from PDF
        String pdfContent = extractTextFromPdf(file);

        // 2. Generate summary
        return generateSummaryWithGemini(pdfContent);
    }

    private String extractTextFromPdf(MultipartFile file) throws IOException {
        log.info("Extracting text from PDF file: {}", file.getOriginalFilename());

        try (InputStream inputStream = file.getInputStream();
             PDDocument document = PDDocument.load(inputStream)) {

            PDFTextStripper stripper = new PDFTextStripper();
            String text = stripper.getText(document);
            log.info("Successfully extracted {} characters from PDF", text.length());
            return text;
        }
    }

    private String generateSummaryWithGemini(String content) {
        log.info("Generating summary with Gemini 1.5 Flash");

        try {
            // API Setup: v1beta + gemini-1.5-flash
            // Fallback to Pro 1.5 if Flash is unavailable for your key
            String apiUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + geminiApiKey;

            // Construct JSON Payload
            ObjectNode rootNode = objectMapper.createObjectNode();
            ArrayNode contentsArray = rootNode.putArray("contents");
            ObjectNode contentNode = contentsArray.addObject();
            ArrayNode partsArray = contentNode.putArray("parts");
            ObjectNode textPart = partsArray.addObject();

            String prompt = "Please provide a concise summary of the following educational content:\n\n" + content + "\n\nSummary:";
            textPart.put("text", prompt);

            String jsonPayload = objectMapper.writeValueAsString(rootNode);

            // Connect
            URL url = new URL(apiUrl);
            HttpURLConnection connection = (HttpURLConnection) url.openConnection();
            connection.setRequestMethod("POST");
            connection.setRequestProperty("Content-Type", "application/json");
            connection.setDoOutput(true);

            // Send
            try (OutputStream os = connection.getOutputStream()) {
                os.write(jsonPayload.getBytes(StandardCharsets.UTF_8));
            }

            // Read Response
            int responseCode = connection.getResponseCode();
            if (responseCode == 200) {
                try (Scanner scanner = new Scanner(connection.getInputStream(), StandardCharsets.UTF_8)) {
                    scanner.useDelimiter("\\A");
                    String responseBody = scanner.hasNext() ? scanner.next() : "";
                    return parseGeminiResponse(responseBody);
                }
            } else {
                try (Scanner scanner = new Scanner(connection.getErrorStream(), StandardCharsets.UTF_8)) {
                    scanner.useDelimiter("\\A");
                    String errorBody = scanner.hasNext() ? scanner.next() : "";
                    log.error("Error from Gemini API: {} - {}", responseCode, errorBody);
                    return "Failed to generate summary. API Error: " + errorBody;
                }
            }
        } catch (Exception e) {
            log.error("Error generating summary with Gemini API", e);
            return "Failed to generate summary due to an error: " + e.getMessage();
        }
    }

    private String parseGeminiResponse(String jsonResponse) {
        try {
            JsonNode root = objectMapper.readTree(jsonResponse);

            // Navigate: candidates[0] -> content -> parts[0] -> text
            if (root.has("candidates") && root.get("candidates").isArray() && root.get("candidates").size() > 0) {
                JsonNode candidate = root.get("candidates").get(0);
                if (candidate.has("content")) {
                    JsonNode parts = candidate.get("content").get("parts");
                    if (parts != null && parts.isArray() && parts.size() > 0) {
                        return parts.get(0).get("text").asText();
                    }
                }
            }
            return "No summary found in response.";

        } catch (Exception e) {
            log.error("Error parsing Gemini response", e);
            return "Could not parse response from Gemini API.";
        }
    }
}