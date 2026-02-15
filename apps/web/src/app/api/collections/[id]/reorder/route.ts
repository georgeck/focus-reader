import { NextRequest } from "next/server";
import { reorderCollection } from "@focus-reader/api";
import { getDb } from "@/lib/bindings";
import { json, jsonError } from "@/lib/api-helpers";
import { withAuth } from "@/lib/auth-middleware";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, async () => {
    try {
      const db = await getDb();
      const { id } = await params;
      const body = (await request.json()) as Record<string, unknown>;
      const { orderedDocumentIds } = body as { orderedDocumentIds?: string[] };

      if (!orderedDocumentIds || !Array.isArray(orderedDocumentIds)) {
        return jsonError("orderedDocumentIds array is required", "MISSING_IDS", 400);
      }

      await reorderCollection(db, id, orderedDocumentIds);
      return json({ success: true });
    } catch {
      return jsonError("Failed to reorder", "REORDER_ERROR", 500);
    }
  });
}
