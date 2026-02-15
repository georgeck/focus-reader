import { describe, it, expect } from "vitest";
import { extractPdfMetadata } from "../pdf.js";

// Minimal valid PDF with 1 page and a title in the Info dictionary
const MINIMAL_PDF = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>
endobj
4 0 obj
<< /Title (Test Document Title) >>
endobj
xref
0 5
trailer
<< /Size 5 /Root 1 0 R /Info 4 0 R >>
startxref
0
%%EOF`;

const TWO_PAGE_PDF = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R 4 0 R] /Count 2 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>
endobj
4 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>
endobj
xref
0 5
trailer
<< /Size 5 /Root 1 0 R >>
startxref
0
%%EOF`;

function toArrayBuffer(str: string): ArrayBuffer {
  const encoder = new TextEncoder();
  return encoder.encode(str).buffer as ArrayBuffer;
}

describe("extractPdfMetadata", () => {
  it("extracts title from Info dictionary", () => {
    const result = extractPdfMetadata(toArrayBuffer(MINIMAL_PDF), "test.pdf");
    expect(result.title).toBe("Test Document Title");
  });

  it("counts pages correctly", () => {
    const result = extractPdfMetadata(toArrayBuffer(MINIMAL_PDF), "test.pdf");
    expect(result.pageCount).toBe(1);
  });

  it("counts multiple pages", () => {
    const result = extractPdfMetadata(toArrayBuffer(TWO_PAGE_PDF), "test.pdf");
    expect(result.pageCount).toBe(2);
  });

  it("does not count /Type /Pages as a page", () => {
    const result = extractPdfMetadata(toArrayBuffer(MINIMAL_PDF), "test.pdf");
    // MINIMAL_PDF has both /Type /Pages and /Type /Page — should only count 1
    expect(result.pageCount).toBe(1);
  });

  it("falls back to filename when no title present", () => {
    const result = extractPdfMetadata(
      toArrayBuffer(TWO_PAGE_PDF),
      "my-research-paper.pdf"
    );
    expect(result.title).toBe("my research paper");
  });

  it("converts underscores to spaces in filename fallback", () => {
    const result = extractPdfMetadata(
      toArrayBuffer(TWO_PAGE_PDF),
      "quarterly_report_2024.pdf"
    );
    expect(result.title).toBe("quarterly report 2024");
  });

  it("reports correct file size", () => {
    const buffer = toArrayBuffer(MINIMAL_PDF);
    const result = extractPdfMetadata(buffer, "test.pdf");
    expect(result.fileSizeBytes).toBe(buffer.byteLength);
  });
});
