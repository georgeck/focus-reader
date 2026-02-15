import type {
  SavedView,
  CreateSavedViewInput,
  UpdateSavedViewInput,
} from "@focus-reader/shared";
import { nowISO } from "@focus-reader/shared";

export async function createSavedView(
  db: D1Database,
  input: CreateSavedViewInput
): Promise<SavedView> {
  const id = crypto.randomUUID();
  const now = nowISO();

  await db
    .prepare(
      `INSERT INTO saved_view (
        id, name, query_ast_json, sort_json, is_system, pinned_order,
        created_at, updated_at
      ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?7)`
    )
    .bind(
      id,
      input.name,
      input.query_ast_json,
      input.sort_json ?? null,
      input.is_system ?? 0,
      input.pinned_order ?? null,
      now
    )
    .run();

  return (await db
    .prepare("SELECT * FROM saved_view WHERE id = ?1")
    .bind(id)
    .first<SavedView>())!;
}

export async function listSavedViews(
  db: D1Database
): Promise<SavedView[]> {
  const result = await db
    .prepare(
      "SELECT * FROM saved_view WHERE deleted_at IS NULL ORDER BY pinned_order ASC NULLS LAST, created_at ASC"
    )
    .all<SavedView>();
  return result.results;
}

export async function getSavedView(
  db: D1Database,
  id: string
): Promise<SavedView | null> {
  const result = await db
    .prepare("SELECT * FROM saved_view WHERE id = ?1 AND deleted_at IS NULL")
    .bind(id)
    .first<SavedView>();
  return result ?? null;
}

export async function updateSavedView(
  db: D1Database,
  id: string,
  updates: UpdateSavedViewInput
): Promise<void> {
  const fields: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  for (const [key, value] of Object.entries(updates)) {
    if (value !== undefined) {
      fields.push(`${key} = ?${paramIndex}`);
      values.push(value);
      paramIndex++;
    }
  }

  if (fields.length === 0) return;

  fields.push(`updated_at = ?${paramIndex}`);
  values.push(nowISO());
  paramIndex++;

  values.push(id);

  await db
    .prepare(
      `UPDATE saved_view SET ${fields.join(", ")} WHERE id = ?${paramIndex}`
    )
    .bind(...values)
    .run();
}

export async function deleteSavedView(
  db: D1Database,
  id: string
): Promise<void> {
  const now = nowISO();
  await db
    .prepare("UPDATE saved_view SET deleted_at = ?1, updated_at = ?1 WHERE id = ?2")
    .bind(now, id)
    .run();
}
