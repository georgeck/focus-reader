import { listIngestionLogs } from "@focus-reader/db";
import { getDb } from "@/lib/bindings";
import { json, jsonError } from "@/lib/api-helpers";

export async function GET() {
  try {
    const db = await getDb();
    const logs = await listIngestionLogs(db);
    return json(logs);
  } catch {
    return jsonError("Failed to fetch ingestion logs", "FETCH_ERROR", 500);
  }
}
