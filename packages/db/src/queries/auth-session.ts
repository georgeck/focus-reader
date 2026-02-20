import { nowISO } from "@focus-reader/shared";

export interface SessionRecord {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: string;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  updated_at: string;
}

interface VerificationRecord {
  id: string;
  identifier: string;
  value_hash: string;
  expires_at: string;
  used_at: string | null;
}

export async function createSession(
  db: D1Database,
  input: {
    id?: string;
    userId: string;
    tokenHash: string;
    expiresAt: string;
    ipAddress?: string | null;
    userAgent?: string | null;
  }
): Promise<void> {
  const id = input.id ?? crypto.randomUUID();
  const now = nowISO();

  await db
    .prepare(
      `INSERT INTO session (id, user_id, token_hash, expires_at, ip_address, user_agent, created_at, updated_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?7)`
    )
    .bind(
      id,
      input.userId,
      input.tokenHash,
      input.expiresAt,
      input.ipAddress ?? null,
      input.userAgent ?? null,
      now
    )
    .run();
}

export async function getSessionByTokenHash(
  db: D1Database,
  tokenHash: string
): Promise<SessionRecord | null> {
  const row = await db
    .prepare("SELECT * FROM session WHERE token_hash = ?1")
    .bind(tokenHash)
    .first<SessionRecord>();
  return row ?? null;
}

export async function deleteSessionByTokenHash(
  db: D1Database,
  tokenHash: string
): Promise<void> {
  await db
    .prepare("DELETE FROM session WHERE token_hash = ?1")
    .bind(tokenHash)
    .run();
}

export async function deleteExpiredSessions(db: D1Database): Promise<void> {
  await db
    .prepare("DELETE FROM session WHERE datetime(expires_at) <= datetime('now')")
    .run();
}

export async function createVerificationToken(
  db: D1Database,
  input: {
    id?: string;
    identifier: string;
    valueHash: string;
    expiresAt: string;
  }
): Promise<void> {
  const id = input.id ?? crypto.randomUUID();
  const now = nowISO();

  await db
    .prepare(
      `INSERT INTO verification (id, identifier, value_hash, expires_at, used_at, created_at, updated_at)
       VALUES (?1, ?2, ?3, ?4, NULL, ?5, ?5)`
    )
    .bind(id, input.identifier, input.valueHash, input.expiresAt, now)
    .run();
}

export async function consumeVerificationToken(
  db: D1Database,
  identifier: string
): Promise<{ value: string } | null> {
  const row = await db
    .prepare(
      `SELECT id, identifier, value_hash, expires_at, used_at
       FROM verification
       WHERE identifier = ?1`
    )
    .bind(identifier)
    .first<VerificationRecord>();

  if (!row) return null;
  if (row.used_at) return null;
  if (new Date(row.expires_at).getTime() <= Date.now()) return null;

  const now = nowISO();
  const result = await db
    .prepare(
      `UPDATE verification
       SET used_at = ?1, updated_at = ?1
       WHERE id = ?2 AND used_at IS NULL`
    )
    .bind(now, row.id)
    .run();

  const changes = (result as unknown as { meta?: { changes?: number } }).meta?.changes ?? 0;
  if (changes !== 1) return null;

  return { value: row.value_hash };
}

export async function deleteExpiredVerificationTokens(db: D1Database): Promise<void> {
  await db
    .prepare(
      "DELETE FROM verification WHERE datetime(expires_at) <= datetime('now') OR used_at IS NOT NULL"
    )
    .run();
}
