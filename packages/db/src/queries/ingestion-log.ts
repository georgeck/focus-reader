import type {
  IngestionLog,
  CreateIngestionLogInput,
} from "@focus-reader/shared";
import { nowISO } from "@focus-reader/shared";

export async function logIngestionEvent(
  db: D1Database,
  input: CreateIngestionLogInput
): Promise<IngestionLog> {
  const id = crypto.randomUUID();
  const now = nowISO();
  const stmt = db.prepare(`
    INSERT INTO ingestion_log (
      id, event_id, document_id, channel_type, received_at,
      status, error_code, error_detail, attempts
    ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
  `);
  await stmt
    .bind(
      id,
      input.event_id,
      input.document_id ?? null,
      input.channel_type,
      now,
      input.status,
      input.error_code ?? null,
      input.error_detail ?? null,
      input.attempts ?? 1
    )
    .run();

  return (await db
    .prepare("SELECT * FROM ingestion_log WHERE id = ?1")
    .bind(id)
    .first<IngestionLog>())!;
}
