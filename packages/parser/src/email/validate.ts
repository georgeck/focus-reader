import type { ParsedEmail } from "./parse.js";

export interface ValidationResult {
  isRejected: boolean;
  rejectionReason: string | null;
}

export function validateEmail(
  parsed: ParsedEmail,
  deniedDomains: string[]
): ValidationResult {
  // Rule 1: Empty body
  const htmlContent = parsed.html?.trim() || "";
  const textContent = parsed.text?.trim() || "";

  if (!htmlContent && !textContent) {
    return { isRejected: true, rejectionReason: "empty_body" };
  }

  // Rule 2: Sender domain in denylist
  const senderDomain = parsed.from.address.split("@")[1]?.toLowerCase();
  if (senderDomain) {
    const isDenied = deniedDomains.some(
      (d) => d.toLowerCase() === senderDomain
    );
    if (isDenied) {
      return { isRejected: true, rejectionReason: "denylist" };
    }
  }

  return { isRejected: false, rejectionReason: null };
}
