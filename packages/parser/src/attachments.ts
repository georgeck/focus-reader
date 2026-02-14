import type { ParsedEmailAttachment } from "./email/parse.js";

export interface AttachmentMeta {
  filename: string;
  contentType: string;
  sizeBytes: number;
  contentId: string | null;
}

export interface CidAttachment {
  contentId: string;
  contentType: string;
  content: ArrayBuffer | string;
  sizeBytes: number;
}

function getContentSize(content: ArrayBuffer | string): number {
  if (typeof content === "string") {
    return new TextEncoder().encode(content).byteLength;
  }
  return content.byteLength;
}

export function extractAttachmentMeta(
  mimeAttachments: ParsedEmailAttachment[]
): AttachmentMeta[] {
  return mimeAttachments.map((att) => ({
    filename: att.filename || "unnamed",
    contentType: att.mimeType,
    sizeBytes: getContentSize(att.content),
    contentId: att.contentId ? stripAngleBrackets(att.contentId) : null,
  }));
}

export function extractCidAttachments(
  mimeAttachments: ParsedEmailAttachment[]
): CidAttachment[] {
  return mimeAttachments
    .filter((att) => att.contentId && att.disposition === "inline")
    .map((att) => ({
      contentId: stripAngleBrackets(att.contentId!),
      contentType: att.mimeType,
      content: att.content,
      sizeBytes: getContentSize(att.content),
    }));
}

function stripAngleBrackets(s: string): string {
  return s.replace(/^<|>$/g, "");
}
