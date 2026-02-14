import type {
  Document,
  CreateDocumentInput,
} from "@focus-reader/shared";
import { nowISO } from "@focus-reader/shared";

export async function createDocument(
  db: D1Database,
  input: CreateDocumentInput
): Promise<Document> {
  const id = input.id ?? crypto.randomUUID();
  const now = nowISO();
  const stmt = db.prepare(`
    INSERT INTO document (
      id, type, url, title, author, author_url, site_name, excerpt,
      word_count, reading_time_minutes, cover_image_url,
      html_content, markdown_content, plain_text_content,
      location, is_read, is_starred, reading_progress,
      saved_at, published_at, updated_at, source_id, origin_type
    ) VALUES (
      ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8,
      ?9, ?10, ?11,
      ?12, ?13, ?14,
      ?15, 0, 0, 0.0,
      ?16, ?17, ?16, ?18, ?19
    )
  `);
  await stmt
    .bind(
      id,
      input.type,
      input.url ?? null,
      input.title,
      input.author ?? null,
      input.author_url ?? null,
      input.site_name ?? null,
      input.excerpt ?? null,
      input.word_count ?? 0,
      input.reading_time_minutes ?? 0,
      input.cover_image_url ?? null,
      input.html_content ?? null,
      input.markdown_content ?? null,
      input.plain_text_content ?? null,
      input.location ?? "inbox",
      now,
      input.published_at ?? null,
      input.source_id ?? null,
      input.origin_type
    )
    .run();

  return (await getDocument(db, id))!;
}

export async function getDocument(
  db: D1Database,
  id: string
): Promise<Document | null> {
  const result = await db
    .prepare("SELECT * FROM document WHERE id = ?1")
    .bind(id)
    .first<Document>();
  return result ?? null;
}

export async function updateDocument(
  db: D1Database,
  id: string,
  updates: Partial<Pick<Document, "updated_at" | "location" | "is_read" | "is_starred" | "reading_progress" | "last_read_at" | "deleted_at">>
): Promise<void> {
  const fields: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  for (const [key, value] of Object.entries(updates)) {
    fields.push(`${key} = ?${paramIndex}`);
    values.push(value);
    paramIndex++;
  }

  if (fields.length === 0) return;

  // Always update updated_at
  if (!updates.updated_at) {
    fields.push(`updated_at = ?${paramIndex}`);
    values.push(nowISO());
    paramIndex++;
  }

  values.push(id);

  await db
    .prepare(
      `UPDATE document SET ${fields.join(", ")} WHERE id = ?${paramIndex}`
    )
    .bind(...values)
    .run();
}

export async function getDocumentByUrl(
  db: D1Database,
  url: string
): Promise<Document | null> {
  const result = await db
    .prepare("SELECT * FROM document WHERE url = ?1")
    .bind(url)
    .first<Document>();
  return result ?? null;
}
