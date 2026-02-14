import type {
  Attachment,
  CreateAttachmentInput,
} from "@focus-reader/shared";
import { nowISO } from "@focus-reader/shared";

export async function createAttachment(
  db: D1Database,
  input: CreateAttachmentInput
): Promise<Attachment> {
  const id = input.id ?? crypto.randomUUID();
  const now = nowISO();
  const stmt = db.prepare(`
    INSERT INTO attachment (
      id, document_id, filename, content_type, size_bytes,
      content_id, storage_key, created_at
    ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
  `);
  await stmt
    .bind(
      id,
      input.document_id,
      input.filename ?? null,
      input.content_type,
      input.size_bytes,
      input.content_id ?? null,
      input.storage_key ?? null,
      now
    )
    .run();

  return (await db
    .prepare("SELECT * FROM attachment WHERE id = ?1")
    .bind(id)
    .first<Attachment>())!;
}
