export interface PdfMetadata {
  title: string | null;
  pageCount: number;
  fileSizeBytes: number;
}

/**
 * Extract basic metadata from a PDF buffer by scanning the raw bytes.
 * Counts /Type /Page objects for page count, extracts title from the Info dict.
 */
export function extractPdfMetadata(
  buffer: ArrayBuffer,
  filename: string
): PdfMetadata {
  const bytes = new Uint8Array(buffer);
  const text = new TextDecoder("latin1").decode(bytes);
  const fileSizeBytes = buffer.byteLength;

  // Count pages by matching /Type /Page (but not /Type /Pages)
  const pageMatches = text.match(/\/Type\s*\/Page(?!s)\b/g);
  const pageCount = pageMatches ? pageMatches.length : 0;

  // Try to extract title from Info dictionary
  const title = extractTitle(text) ?? filenameToTitle(filename);

  return { title, pageCount, fileSizeBytes };
}

function extractTitle(text: string): string | null {
  // Look for /Title in the Info dictionary
  // Handles both literal strings /Title (Some Title) and hex strings /Title <FEFF...>
  const match = text.match(/\/Title\s*\(([^)]*)\)/);
  if (match && match[1].trim()) {
    return decodePdfString(match[1].trim());
  }
  return null;
}

function decodePdfString(s: string): string {
  // Handle common PDF escape sequences
  return s
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\\\(/g, "(")
    .replace(/\\\)/g, ")")
    .replace(/\\\\/g, "\\");
}

function filenameToTitle(filename: string): string {
  return filename
    .replace(/\.pdf$/i, "")
    .replace(/[-_]/g, " ")
    .trim();
}
