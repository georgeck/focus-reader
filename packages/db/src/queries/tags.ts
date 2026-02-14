import type { Tag, CreateTagInput } from "@focus-reader/shared";
import { nowISO } from "@focus-reader/shared";

export async function createTag(
  db: D1Database,
  input: CreateTagInput
): Promise<Tag> {
  const id = crypto.randomUUID();
  const now = nowISO();
  const stmt = db.prepare(`
    INSERT INTO tag (id, name, color, description, created_at)
    VALUES (?1, ?2, ?3, ?4, ?5)
  `);
  await stmt
    .bind(id, input.name, input.color ?? null, input.description ?? null, now)
    .run();

  return (await db
    .prepare("SELECT * FROM tag WHERE id = ?1")
    .bind(id)
    .first<Tag>())!;
}

export async function getTagsForSubscription(
  db: D1Database,
  subscriptionId: string
): Promise<Tag[]> {
  const result = await db
    .prepare(
      `SELECT t.* FROM tag t
       INNER JOIN subscription_tags st ON st.tag_id = t.id
       WHERE st.subscription_id = ?1`
    )
    .bind(subscriptionId)
    .all<Tag>();
  return result.results;
}

export async function addTagToDocument(
  db: D1Database,
  documentId: string,
  tagId: string
): Promise<void> {
  await db
    .prepare(
      "INSERT OR IGNORE INTO document_tags (document_id, tag_id) VALUES (?1, ?2)"
    )
    .bind(documentId, tagId)
    .run();
}
