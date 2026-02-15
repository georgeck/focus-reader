import type {
  CreateHighlightInput,
  UpdateHighlightInput,
  HighlightWithTags,
  HighlightWithDocument,
} from "@focus-reader/shared";
import {
  createHighlight as dbCreateHighlight,
  getHighlightWithTags,
  listHighlightsForDocument,
  listAllHighlights,
  updateHighlight,
  deleteHighlight,
  addTagToHighlight,
  removeTagFromHighlight,
} from "@focus-reader/db";

export async function getHighlightsForDocument(
  db: D1Database,
  documentId: string
): Promise<HighlightWithTags[]> {
  return listHighlightsForDocument(db, documentId);
}

export async function getAllHighlights(
  db: D1Database,
  options?: { tagId?: string; color?: string; limit?: number; cursor?: string }
): Promise<{ items: HighlightWithDocument[]; total: number; nextCursor?: string }> {
  return listAllHighlights(db, options);
}

export async function createHighlight(
  db: D1Database,
  input: CreateHighlightInput
): Promise<HighlightWithTags> {
  const highlight = await dbCreateHighlight(db, input);
  return { ...highlight, tags: [] };
}

export async function patchHighlight(
  db: D1Database,
  id: string,
  updates: UpdateHighlightInput
): Promise<void> {
  await updateHighlight(db, id, updates);
}

export async function removeHighlight(
  db: D1Database,
  id: string
): Promise<void> {
  await deleteHighlight(db, id);
}

export async function tagHighlight(
  db: D1Database,
  highlightId: string,
  tagId: string
): Promise<void> {
  await addTagToHighlight(db, highlightId, tagId);
}

export async function untagHighlight(
  db: D1Database,
  highlightId: string,
  tagId: string
): Promise<void> {
  await removeTagFromHighlight(db, highlightId, tagId);
}
