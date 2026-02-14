import type {
  SubscriptionWithStats,
  UpdateSubscriptionInput,
  CreateSubscriptionInput,
  Subscription,
} from "@focus-reader/shared";
import {
  listSubscriptions,
  updateSubscription,
  softDeleteSubscription,
  createSubscription as dbCreateSubscription,
} from "@focus-reader/db";

export async function getSubscriptions(
  db: D1Database
): Promise<SubscriptionWithStats[]> {
  return listSubscriptions(db);
}

export async function addSubscription(
  db: D1Database,
  input: CreateSubscriptionInput
): Promise<Subscription> {
  return dbCreateSubscription(db, input);
}

export async function patchSubscription(
  db: D1Database,
  id: string,
  updates: UpdateSubscriptionInput
): Promise<void> {
  await updateSubscription(db, id, updates);
}

export async function removeSubscription(
  db: D1Database,
  id: string,
  hard = false
): Promise<void> {
  if (hard) {
    await hardDeleteSubscription(db, id);
  } else {
    await softDeleteSubscription(db, id);
  }
}

async function hardDeleteSubscription(
  db: D1Database,
  id: string
): Promise<void> {
  // Delete related records first (D1 doesn't enforce FK cascades)
  await db.prepare("DELETE FROM document_tags WHERE document_id IN (SELECT id FROM document WHERE source_id = ?1)").bind(id).run();
  await db.prepare("DELETE FROM document_email_meta WHERE document_id IN (SELECT id FROM document WHERE source_id = ?1)").bind(id).run();
  await db.prepare("DELETE FROM attachment WHERE document_id IN (SELECT id FROM document WHERE source_id = ?1)").bind(id).run();
  await db.prepare("DELETE FROM document WHERE source_id = ?1").bind(id).run();
  await db.prepare("DELETE FROM subscription_tags WHERE subscription_id = ?1").bind(id).run();
  await db.prepare("DELETE FROM subscription WHERE id = ?1").bind(id).run();
}
