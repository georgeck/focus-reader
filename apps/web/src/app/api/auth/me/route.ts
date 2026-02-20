import { NextRequest } from "next/server";
import { getUserById } from "@focus-reader/db";
import { getDb, getEnv } from "@/lib/bindings";
import { json, jsonError } from "@/lib/api-helpers";
import { resolveAuthUser } from "@/lib/auth-middleware";

export async function GET(request: NextRequest) {
  try {
    const env = await getEnv();
    const authMode = env.AUTH_MODE === "multi-user" ? "multi-user" : "single-user";

    const result = await resolveAuthUser(request);
    if (!result.authenticated || !result.userId) {
      return json({ authenticated: false, authMode });
    }

    const db = await getDb();
    const user = await getUserById(db, result.userId);
    if (!user) {
      return json({ authenticated: false, authMode });
    }

    return json({
      authenticated: true,
      authMode,
      method: result.method,
      user: {
        id: user.id,
        email: user.email,
        slug: user.slug,
        name: user.name,
        avatar_url: user.avatar_url,
      },
    });
  } catch (error) {
    console.error("[auth/me]", error);
    return jsonError("Failed to resolve auth session", "AUTH_ME_ERROR", 500);
  }
}
