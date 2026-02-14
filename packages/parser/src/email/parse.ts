import PostalMime from "postal-mime";

export interface ParsedEmailAddress {
  address: string;
  name: string;
}

export interface ParsedEmailAttachment {
  filename: string;
  mimeType: string;
  content: ArrayBuffer | string;
  contentId?: string;
  disposition?: string;
}

export interface ParsedEmail {
  subject: string;
  from: ParsedEmailAddress;
  date: string | null;
  html: string | null;
  text: string | null;
  headers: Record<string, string>;
  attachments: ParsedEmailAttachment[];
}

export async function parseEmail(
  raw: ReadableStream | ArrayBuffer
): Promise<ParsedEmail> {
  let buffer: ArrayBuffer;
  if (raw instanceof ArrayBuffer) {
    buffer = raw;
  } else {
    // Convert ReadableStream to ArrayBuffer
    const reader = raw.getReader();
    const chunks: Uint8Array[] = [];
    let done = false;
    while (!done) {
      const result = await reader.read();
      done = result.done;
      if (result.value) {
        chunks.push(result.value);
      }
    }
    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const combined = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      combined.set(chunk, offset);
      offset += chunk.length;
    }
    buffer = combined.buffer;
  }

  const parsed = await PostalMime.parse(buffer);

  // Flatten headers from {key, value}[] to Record<string, string>
  const headers: Record<string, string> = {};
  if (parsed.headers) {
    for (const h of parsed.headers) {
      headers[h.key.toLowerCase()] = h.value;
    }
  }

  // Map from address
  const from: ParsedEmailAddress = {
    address: parsed.from?.address ?? "",
    name: parsed.from?.name ?? "",
  };

  // Map attachments
  const attachments: ParsedEmailAttachment[] = (parsed.attachments || []).map(
    (att) => ({
      filename: att.filename || "",
      mimeType: att.mimeType,
      content: att.content,
      contentId: att.contentId || undefined,
      disposition: att.disposition || undefined,
    })
  );

  return {
    subject: parsed.subject || "",
    from,
    date: parsed.date || null,
    html: parsed.html || null,
    text: parsed.text || null,
    headers,
    attachments,
  };
}
