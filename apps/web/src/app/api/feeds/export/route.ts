import { NextRequest } from "next/server";
import { exportOpml } from "@focus-reader/api";
import { getDb } from "@/lib/bindings";
import { jsonError } from "@/lib/api-helpers";
import { withAuth } from "@/lib/auth-middleware";

export async function GET(request: NextRequest) {
  return withAuth(request, async () => {
    try {
      const db = await getDb();
      const xml = await exportOpml(db);
      return new Response(xml, {
        headers: {
          "Content-Type": "application/xml",
          "Content-Disposition": 'attachment; filename="focus-reader-feeds.opml"',
        },
      });
    } catch {
      return jsonError("Failed to export OPML", "EXPORT_ERROR", 500);
    }
  });
}
