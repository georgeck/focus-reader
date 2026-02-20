/**
 * Admin / worker-level queries that operate on raw D1Database.
 * These are NOT user-scoped — they return data across all users
 * and are used by system-level workers (RSS polling, etc).
 */
import type { Feed, User } from "@focus-reader/shared";

export async function getAllFeedsDueForPoll(
  db: D1Database
): Promise<Feed[]> {
  const rows = await db
    .prepare(
      `SELECT * FROM feed
       WHERE is_active = 1
         AND deleted_at IS NULL
         AND (last_fetched_at IS NULL OR datetime(last_fetched_at) < datetime('now', '-' || fetch_interval_minutes || ' minutes'))`
    )
    .all<Feed>();
  return rows.results;
}

export async function getUserByEmail(
  db: D1Database,
  email: string
): Promise<User | null> {
  const result = await db
    .prepare("SELECT * FROM user WHERE email = ?1")
    .bind(email)
    .first<User>();
  return result ?? null;
}

export async function getUserBySlug(
  db: D1Database,
  slug: string
): Promise<User | null> {
  const result = await db
    .prepare("SELECT * FROM user WHERE slug = ?1")
    .bind(slug)
    .first<User>();
  return result ?? null;
}

export async function getUserById(
  db: D1Database,
  id: string
): Promise<User | null> {
  const result = await db
    .prepare("SELECT * FROM user WHERE id = ?1")
    .bind(id)
    .first<User>();
  return result ?? null;
}

export async function getOrCreateSingleUser(
  db: D1Database,
  email: string
): Promise<User> {
  // In single-user mode (no CF Access), find or create the sole user.
  // This should ONLY be called from the auto-auth fallback (no CF Access configured).
  const existing = await db
    .prepare("SELECT * FROM user LIMIT 1")
    .first<User>();
  if (existing) {
    return existing;
  }
  return createUserByEmail(db, email, true, true);
}

export function normalizeSlugBase(email: string): string {
  const localPart = email.split("@")[0] ?? "user";
  let slug = localPart
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  if (!slug) slug = "user";
  if (slug.length < 3) slug = `user-${slug}`;
  if (slug.length > 30) slug = slug.slice(0, 30);
  slug = slug.replace(/-+$/g, "");
  if (slug.length < 3) slug = "user";
  return slug;
}

export async function generateUniqueSlug(db: D1Database, email: string): Promise<string> {
  const base = normalizeSlugBase(email);

  for (let i = 0; i < 1000; i++) {
    const suffix = i === 0 ? "" : `-${i + 1}`;
    const maxBaseLength = 30 - suffix.length;
    const trimmedBase = base.slice(0, Math.max(1, maxBaseLength)).replace(/-+$/g, "");
    const candidateBase = trimmedBase.length >= 3 ? trimmedBase : "user";
    const candidate = `${candidateBase}${suffix}`;
    const existing = await getUserBySlug(db, candidate);
    if (!existing) return candidate;
  }

  // Should be unreachable in practice, but guarantees a unique fallback.
  return `user-${crypto.randomUUID().slice(0, 8)}`;
}

export async function createUserByEmail(
  db: D1Database,
  email: string,
  isAdmin = false,
  emailVerified = true
): Promise<User> {
  // Check if user already exists for this email
  const existing = await db
    .prepare("SELECT * FROM user WHERE email = ?1")
    .bind(email)
    .first<User>();
  if (existing) {
    if (emailVerified && existing.email_verified !== 1) {
      await db
        .prepare(
          `UPDATE user
           SET email_verified = 1, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
           WHERE id = ?1`
        )
        .bind(existing.id)
        .run();
      return {
        ...existing,
        email_verified: 1,
      };
    }
    return existing;
  }

  const id = crypto.randomUUID();
  const slug = await generateUniqueSlug(db, email);
  await db
    .prepare(
      `INSERT INTO user (id, email, email_verified, slug, is_admin, is_active)
       VALUES (?1, ?2, ?3, ?4, ?5, 1)`
    )
    .bind(id, email, emailVerified ? 1 : 0, slug, isAdmin ? 1 : 0)
    .run();
  return (await db
    .prepare("SELECT * FROM user WHERE id = ?1")
    .bind(id)
    .first<User>())!;
}

export async function getApiKeyByHashAdmin(
  db: D1Database,
  keyHash: string
): Promise<{ user_id: string; id: string } | null> {
  const result = await db
    .prepare("SELECT id, user_id FROM api_key WHERE key_hash = ?1 AND revoked_at IS NULL")
    .bind(keyHash)
    .first<{ id: string; user_id: string }>();
  if (!result) return null;
  await db
    .prepare("UPDATE api_key SET last_used_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?1")
    .bind(result.id)
    .run();
  return result;
}
