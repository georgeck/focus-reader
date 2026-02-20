import { authenticateRequest } from "@focus-reader/api";
import { getUserById } from "@focus-reader/db";
import { getDb, getEnv } from "./bindings";
import { jsonError } from "./api-helpers";
import { getBetterAuth } from "./better-auth";

export interface AuthUserResult {
  authenticated: boolean;
  userId?: string;
  method?: "session" | "cf-access" | "api-key" | "single-user";
  error?: string;
}

export async function resolveAuthUser(request: Request): Promise<AuthUserResult> {
  const db = await getDb();
  const env = await getEnv();
  const authMode = env.AUTH_MODE === "multi-user" ? "multi-user" : "single-user";

  if (authMode === "multi-user") {
    try {
      const auth = await getBetterAuth();
      const session = await auth.api.getSession({
        headers: request.headers,
      });
      const sessionUserId = session?.user?.id;
      if (sessionUserId) {
        const user = await getUserById(db, sessionUserId);
        if (user && user.is_active === 1) {
          return {
            authenticated: true,
            userId: sessionUserId,
            method: "session",
          };
        }
      }
    } catch (error) {
      console.error("[auth/session] Failed to validate session:", error);
    }
  }

  // API key works in both modes; CF Access/single-user paths are enforced only in single-user mode.
  const result = await authenticateRequest(db, request, {
    OWNER_EMAIL: env.OWNER_EMAIL,
    CF_ACCESS_TEAM_DOMAIN: env.CF_ACCESS_TEAM_DOMAIN,
    CF_ACCESS_AUD: env.CF_ACCESS_AUD,
    AUTH_MODE: env.AUTH_MODE,
  });
  if (!result.authenticated || !result.userId) {
    return { authenticated: false, error: result.error };
  }
  return {
    authenticated: true,
    userId: result.userId,
    method: result.method,
  };
}

export async function withAuth(
  request: Request,
  handler: (userId: string) => Promise<Response>
): Promise<Response> {
  const result = await resolveAuthUser(request);
  if (!result.authenticated || !result.userId) {
    return jsonError(
      result.error || "Authentication required",
      "UNAUTHORIZED",
      401
    );
  }
  return handler(result.userId);
}
