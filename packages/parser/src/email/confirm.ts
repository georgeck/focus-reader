import { CONFIRMATION_KEYWORDS } from "@focus-reader/shared";
import type { ParsedEmail } from "./parse.js";

const CONFIRMATION_SENDER_PATTERNS = [
  /^noreply@/i,
  /^no-reply@/i,
  /^confirm@/i,
  /^verify@/i,
  /^donotreply@/i,
  /^do-not-reply@/i,
  /^postmaster@/i,
];

const CONFIRMATION_CTA_PATTERNS = [
  /confirm\s+(your\s+)?(email|subscription|address)/i,
  /verify\s+(your\s+)?(email|subscription|address)/i,
  /click\s+(here\s+)?to\s+(confirm|verify|activate)/i,
  /activate\s+(your\s+)?(account|subscription)/i,
  /yes,?\s+subscribe\s+me/i,
];

export function isConfirmationEmail(parsed: ParsedEmail): boolean {
  const subject = parsed.subject.toLowerCase();

  // Check subject for confirmation keywords
  for (const keyword of CONFIRMATION_KEYWORDS) {
    if (subject.includes(keyword.toLowerCase())) {
      return true;
    }
  }

  // Check sender patterns
  const senderAddress = parsed.from.address.toLowerCase();
  for (const pattern of CONFIRMATION_SENDER_PATTERNS) {
    if (pattern.test(senderAddress)) {
      // Only flag as confirmation if the body also has CTA patterns
      const body = (parsed.html || parsed.text || "").toLowerCase();
      for (const ctaPattern of CONFIRMATION_CTA_PATTERNS) {
        if (ctaPattern.test(body)) {
          return true;
        }
      }
    }
  }

  return false;
}
