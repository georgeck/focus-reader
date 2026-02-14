import type {
  TagWithCount,
  Tag,
  CreateTagInput,
  UpdateTagInput,
} from "@focus-reader/shared";
import {
  listTags,
  createTag,
  updateTag,
  deleteTag,
  addTagToDocument,
  removeTagFromDocument,
  addTagToSubscription,
  removeTagFromSubscription,
} from "@focus-reader/db";

export async function getTags(db: D1Database): Promise<TagWithCount[]> {
  return listTags(db);
}

export async function createNewTag(
  db: D1Database,
  input: CreateTagInput
): Promise<Tag> {
  return createTag(db, input);
}

export async function patchTag(
  db: D1Database,
  id: string,
  updates: UpdateTagInput
): Promise<void> {
  await updateTag(db, id, updates);
}

export async function removeTag(
  db: D1Database,
  id: string
): Promise<void> {
  await deleteTag(db, id);
}

export async function tagDocument(
  db: D1Database,
  documentId: string,
  tagId: string
): Promise<void> {
  await addTagToDocument(db, documentId, tagId);
}

export async function untagDocument(
  db: D1Database,
  documentId: string,
  tagId: string
): Promise<void> {
  await removeTagFromDocument(db, documentId, tagId);
}

export async function tagSubscription(
  db: D1Database,
  subscriptionId: string,
  tagId: string
): Promise<void> {
  await addTagToSubscription(db, subscriptionId, tagId);
}

export async function untagSubscription(
  db: D1Database,
  subscriptionId: string,
  tagId: string
): Promise<void> {
  await removeTagFromSubscription(db, subscriptionId, tagId);
}
