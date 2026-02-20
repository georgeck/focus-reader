import { NextRequest } from "next/server";
import { getEnv } from "@/lib/bindings";
import { json, jsonError } from "@/lib/api-helpers";
import { getBetterAuth } from "@/lib/better-auth";

export async function POST(request: NextRequest) {
  try {
    const env = await getEnv();
    if (env.AUTH_MODE !== "multi-user") {
      return json({ ok: true });
    }

    const auth = await getBetterAuth();
    return auth.api.signOut({
      headers: request.headers,
      asResponse: true,
    });
  } catch (error) {
    console.error("[auth/logout]", error);
    return jsonError("Failed to log out", "AUTH_LOGOUT_ERROR", 500);
  }
}
