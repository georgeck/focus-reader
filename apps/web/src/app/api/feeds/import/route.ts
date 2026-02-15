import { NextRequest } from "next/server";
import { importOpml } from "@focus-reader/api";
import { getDb } from "@/lib/bindings";
import { json, jsonError } from "@/lib/api-helpers";
import { withAuth } from "@/lib/auth-middleware";

export async function POST(request: NextRequest) {
  return withAuth(request, async () => {
    try {
      const db = await getDb();
      const xml = await request.text();

      if (!xml.trim()) {
        return jsonError("OPML content is required", "MISSING_BODY", 400);
      }

      const result = await importOpml(db, xml);
      return json(result);
    } catch {
      return jsonError("Failed to import OPML", "IMPORT_ERROR", 500);
    }
  });
}
