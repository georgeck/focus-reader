import { NextRequest } from "next/server";
import { tagSubscription, untagSubscription } from "@focus-reader/api";
import { getDb } from "@/lib/bindings";
import { json, jsonError } from "@/lib/api-helpers";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const db = await getDb();
    const { id } = await params;
    const body = (await request.json()) as Record<string, unknown>;
    const { tagId } = body as { tagId?: string };

    if (!tagId) {
      return jsonError("tagId is required", "MISSING_TAG_ID", 400);
    }

    await tagSubscription(db, id, tagId);
    return json({ success: true });
  } catch {
    return jsonError("Failed to add tag", "TAG_ERROR", 500);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const db = await getDb();
    const { id } = await params;
    const body = (await request.json()) as Record<string, unknown>;
    const { tagId } = body as { tagId?: string };

    if (!tagId) {
      return jsonError("tagId is required", "MISSING_TAG_ID", 400);
    }

    await untagSubscription(db, id, tagId);
    return json({ success: true });
  } catch {
    return jsonError("Failed to remove tag", "TAG_ERROR", 500);
  }
}
