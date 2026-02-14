import { getEnv } from "@/lib/bindings";
import { json, jsonError } from "@/lib/api-helpers";

export async function GET() {
  try {
    const env = await getEnv();
    return json({
      emailDomain: env.EMAIL_DOMAIN || null,
    });
  } catch {
    return jsonError("Failed to fetch settings", "FETCH_ERROR", 500);
  }
}
