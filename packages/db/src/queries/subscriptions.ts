import type {
  Subscription,
  CreateSubscriptionInput,
} from "@focus-reader/shared";
import { nowISO } from "@focus-reader/shared";

export async function createSubscription(
  db: D1Database,
  input: CreateSubscriptionInput
): Promise<Subscription> {
  const id = input.id ?? crypto.randomUUID();
  const now = nowISO();
  const stmt = db.prepare(`
    INSERT INTO subscription (
      id, pseudo_email, display_name, sender_address, sender_name,
      is_active, auto_tag_rules, created_at, updated_at
    ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?8)
  `);
  await stmt
    .bind(
      id,
      input.pseudo_email,
      input.display_name,
      input.sender_address ?? null,
      input.sender_name ?? null,
      input.is_active ?? 1,
      input.auto_tag_rules ?? null,
      now
    )
    .run();

  return (await db
    .prepare("SELECT * FROM subscription WHERE id = ?1")
    .bind(id)
    .first<Subscription>())!;
}

export async function getSubscriptionByEmail(
  db: D1Database,
  pseudoEmail: string
): Promise<Subscription | null> {
  const result = await db
    .prepare("SELECT * FROM subscription WHERE pseudo_email = ?1")
    .bind(pseudoEmail)
    .first<Subscription>();
  return result ?? null;
}
