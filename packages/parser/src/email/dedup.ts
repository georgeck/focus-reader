import { dateBucket } from "@focus-reader/shared";

export function extractMessageId(
  headers: Record<string, string>
): string | null {
  const rawId = headers["message-id"];
  if (!rawId) return null;
  // Strip angle brackets: "<abc@example.com>" -> "abc@example.com"
  return rawId.replace(/^<|>$/g, "").trim() || null;
}

export async function computeFingerprint(
  recipient: string,
  fromAddress: string,
  subject: string,
  date: Date,
  bodyText: string
): Promise<string> {
  const bucket = dateBucket(date);
  const input = [recipient, fromAddress, subject, bucket, bodyText].join("\0");
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
