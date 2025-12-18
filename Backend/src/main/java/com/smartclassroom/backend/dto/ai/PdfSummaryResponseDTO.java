package com.smartclassroom.backend.dto.ai;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class PdfSummaryResponseDTO {
    private String summary;
    private String pdfUrl;
}