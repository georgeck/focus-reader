import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseEmail } from "../email/parse.js";
import { extractMessageId, computeFingerprint } from "../email/dedup.js";
import { validateEmail } from "../email/validate.js";
import { isConfirmationEmail } from "../email/confirm.js";
import { extractAttachmentMeta, extractCidAttachments } from "../attachments.js";

function loadFixture(name: string): ArrayBuffer {
  const path = resolve(__dirname, "../../fixtures", name);
  const buffer = readFileSync(path);
  return buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength
  );
}

describe("parseEmail", () => {
  it("parses a simple newsletter", async () => {
    const raw = loadFixture("simple-newsletter.eml");
    const parsed = await parseEmail(raw);

    expect(parsed.subject).toBe("Daily Digest - Feb 13");
    expect(parsed.from.address).toBe("newsletter@morningbrew.com");
    expect(parsed.from.name).toBe("Morning Brew");
    expect(parsed.html).toContain("Good morning!");
    expect(parsed.text).toContain("Good morning!");
    expect(parsed.headers["message-id"]).toContain("msg001@morningbrew.com");
  });

  it("parses a confirmation email", async () => {
    const raw = loadFixture("confirmation.eml");
    const parsed = await parseEmail(raw);

    expect(parsed.subject).toBe("Please confirm your subscription");
    expect(parsed.from.address).toBe("noreply@newsletter.example.com");
  });
});

describe("extractMessageId", () => {
  it("strips angle brackets from Message-ID", () => {
    const headers = { "message-id": "<abc123@example.com>" };
    expect(extractMessageId(headers)).toBe("abc123@example.com");
  });

  it("handles Message-ID without angle brackets", () => {
    const headers = { "message-id": "abc123@example.com" };
    expect(extractMessageId(headers)).toBe("abc123@example.com");
  });

  it("returns null when Message-ID is missing", () => {
    const headers = {};
    expect(extractMessageId(headers)).toBeNull();
  });
});

describe("computeFingerprint", () => {
  it("produces consistent hash for same inputs", async () => {
    const date = new Date("2026-02-13T17:00:00Z");
    const fp1 = await computeFingerprint(
      "test@read.example.com",
      "sender@example.com",
      "Hello",
      date,
      "body text"
    );
    const fp2 = await computeFingerprint(
      "test@read.example.com",
      "sender@example.com",
      "Hello",
      date,
      "body text"
    );
    expect(fp1).toBe(fp2);
    expect(fp1).toHaveLength(64); // SHA-256 hex
  });

  it("produces different hash for different inputs", async () => {
    const date = new Date("2026-02-13T17:00:00Z");
    const fp1 = await computeFingerprint(
      "test@read.example.com",
      "sender@example.com",
      "Hello",
      date,
      "body text"
    );
    const fp2 = await computeFingerprint(
      "test@read.example.com",
      "sender@example.com",
      "Different Subject",
      date,
      "body text"
    );
    expect(fp1).not.toBe(fp2);
  });

  it("uses hour-level date bucket", async () => {
    // Same hour -> same fingerprint
    const d1 = new Date("2026-02-13T17:00:00Z");
    const d2 = new Date("2026-02-13T17:30:00Z");
    const fp1 = await computeFingerprint("r", "f", "s", d1, "b");
    const fp2 = await computeFingerprint("r", "f", "s", d2, "b");
    expect(fp1).toBe(fp2);

    // Different hour -> different fingerprint
    const d3 = new Date("2026-02-13T18:00:00Z");
    const fp3 = await computeFingerprint("r", "f", "s", d3, "b");
    expect(fp1).not.toBe(fp3);
  });
});

describe("validateEmail", () => {
  it("rejects empty body", () => {
    const parsed = {
      subject: "Test",
      from: { address: "sender@example.com", name: "Sender" },
      date: null,
      html: null,
      text: "   ",
      headers: {},
      attachments: [],
    };
    const result = validateEmail(parsed, []);
    expect(result.isRejected).toBe(true);
    expect(result.rejectionReason).toBe("empty_body");
  });

  it("rejects denied domain", () => {
    const parsed = {
      subject: "Newsletter",
      from: { address: "sender@spam.com", name: "Spammer" },
      date: null,
      html: "<p>Content</p>",
      text: "Content",
      headers: {},
      attachments: [],
    };
    const result = validateEmail(parsed, ["spam.com"]);
    expect(result.isRejected).toBe(true);
    expect(result.rejectionReason).toBe("denylist");
  });

  it("passes valid email", () => {
    const parsed = {
      subject: "Newsletter",
      from: { address: "sender@legit.com", name: "Sender" },
      date: null,
      html: "<p>Content</p>",
      text: "Content",
      headers: {},
      attachments: [],
    };
    const result = validateEmail(parsed, ["spam.com"]);
    expect(result.isRejected).toBe(false);
    expect(result.rejectionReason).toBeNull();
  });
});

describe("isConfirmationEmail", () => {
  it("detects confirmation by subject keyword", () => {
    const parsed = {
      subject: "Please confirm your subscription",
      from: { address: "newsletter@example.com", name: "Newsletter" },
      date: null,
      html: "<p>Some content</p>",
      text: "Some content",
      headers: {},
      attachments: [],
    };
    expect(isConfirmationEmail(parsed)).toBe(true);
  });

  it("detects confirmation by sender pattern + CTA", () => {
    const parsed = {
      subject: "Welcome to our newsletter",
      from: { address: "noreply@example.com", name: "Example" },
      date: null,
      html: '<p>Click here to confirm your email</p><a href="http://example.com/confirm">Confirm</a>',
      text: "Click here to confirm your email",
      headers: {},
      attachments: [],
    };
    expect(isConfirmationEmail(parsed)).toBe(true);
  });

  it("does not flag regular newsletters", () => {
    const parsed = {
      subject: "Weekly Tech News",
      from: { address: "newsletter@techweekly.com", name: "Tech Weekly" },
      date: null,
      html: "<h1>This week in tech</h1><p>Lots happened.</p>",
      text: "This week in tech. Lots happened.",
      headers: {},
      attachments: [],
    };
    expect(isConfirmationEmail(parsed)).toBe(false);
  });
});

describe("attachment extraction", () => {
  it("extracts attachment metadata", () => {
    const mimeAttachments = [
      {
        filename: "photo.jpg",
        mimeType: "image/jpeg",
        content: new ArrayBuffer(2048),
        contentId: "<img001>",
        disposition: "inline",
      },
      {
        filename: "doc.pdf",
        mimeType: "application/pdf",
        content: new ArrayBuffer(1024),
        disposition: "attachment",
      },
    ];

    const meta = extractAttachmentMeta(mimeAttachments);
    expect(meta).toHaveLength(2);
    expect(meta[0].filename).toBe("photo.jpg");
    expect(meta[0].contentId).toBe("img001");
    expect(meta[0].sizeBytes).toBe(2048);
    expect(meta[1].contentId).toBeNull();
  });

  it("extracts CID attachments", () => {
    const mimeAttachments = [
      {
        filename: "photo.jpg",
        mimeType: "image/jpeg",
        content: new ArrayBuffer(2048),
        contentId: "<img001>",
        disposition: "inline",
      },
      {
        filename: "doc.pdf",
        mimeType: "application/pdf",
        content: new ArrayBuffer(1024),
        disposition: "attachment",
      },
    ];

    const cidAttachments = extractCidAttachments(mimeAttachments);
    expect(cidAttachments).toHaveLength(1);
    expect(cidAttachments[0].contentId).toBe("img001");
    expect(cidAttachments[0].sizeBytes).toBe(2048);
  });

  it("strips angle brackets from contentId", () => {
    const mimeAttachments = [
      {
        filename: "photo.jpg",
        mimeType: "image/jpeg",
        content: new ArrayBuffer(1024),
        contentId: "<image@example>",
        disposition: "inline",
      },
    ];

    const cidAttachments = extractCidAttachments(mimeAttachments);
    expect(cidAttachments[0].contentId).toBe("image@example");
  });
});
