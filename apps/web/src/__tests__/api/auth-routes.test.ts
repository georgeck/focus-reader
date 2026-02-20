import { beforeEach, describe, expect, it, vi } from "vitest";
import { createRequest, setAuthEnabled, setEnvOverrides } from "../setup";

vi.mock("@focus-reader/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@focus-reader/api")>();
  return {
    ...actual,
    authenticateRequest: vi.fn(),
  };
});

vi.mock("@focus-reader/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@focus-reader/db")>();
  return {
    ...actual,
    getUserById: vi.fn(),
    getUserByEmail: vi.fn(),
    createUserByEmail: vi.fn(),
  };
});

vi.mock("@/lib/better-auth", () => ({
  getBetterAuth: vi.fn(),
}));

const { authenticateRequest } = await import("@focus-reader/api");
const { getBetterAuth } = await import("@/lib/better-auth");

const {
  getUserById,
} = await import("@focus-reader/db");

const { POST: loginPost } = await import("@/app/api/auth/login/route");
const { GET: verifyGet } = await import("@/app/api/auth/verify/route");
const { GET: meGet } = await import("@/app/api/auth/me/route");
const { POST: logoutPost } = await import("@/app/api/auth/logout/route");

beforeEach(() => {
  vi.clearAllMocks();
  setAuthEnabled(false);
  setEnvOverrides({ AUTH_MODE: "single-user" });

  vi.mocked(authenticateRequest).mockResolvedValue({
    authenticated: true,
    userId: "test-user-id",
    method: "single-user",
  });

  vi.mocked(getBetterAuth).mockResolvedValue({
    api: {
      signInMagicLink: vi.fn().mockResolvedValue({ status: true }),
      getSession: vi.fn().mockResolvedValue(null),
      signOut: vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 })),
    },
    handler: vi.fn(),
  } as unknown as Awaited<ReturnType<typeof getBetterAuth>>);
});

describe("auth routes", () => {
  it("rejects login endpoint outside multi-user mode", async () => {
    const req = createRequest("POST", "/api/auth/login", {
      body: { email: "user@example.com" },
    });

    const res = await loginPost(req);

    expect(res.status).toBe(400);
    const body = (await res.json()) as { error?: { code?: string } };
    expect(body.error?.code).toBe("UNSUPPORTED_MODE");
    const auth = await getBetterAuth();
    expect(auth.api.signInMagicLink).not.toHaveBeenCalled();
  });

  it("issues magic link in multi-user mode", async () => {
    setEnvOverrides({ AUTH_MODE: "multi-user" });

    const req = createRequest("POST", "/api/auth/login", {
      body: { email: "User@Example.com" },
    });

    const res = await loginPost(req);

    expect(res.status).toBe(200);
    const auth = await getBetterAuth();
    expect(auth.api.signInMagicLink).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({ email: "user@example.com" }),
      })
    );
  });

  it("redirects verify endpoint to Better Auth verification path", async () => {
    setEnvOverrides({ AUTH_MODE: "multi-user" });

    const req = createRequest("GET", "/api/auth/verify?token=magic.token");
    const res = await verifyGet(req);

    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe(
      "http://localhost:3000/api/auth/magic-link/verify?token=magic.token&callbackURL=%2Finbox&newUserCallbackURL=%2Finbox&errorCallbackURL=%2Flogin%3Ferror%3Dinvalid_or_expired"
    );
  });

  it("returns unauthenticated in multi-user mode when no session/api-key", async () => {
    setEnvOverrides({ AUTH_MODE: "multi-user" });
    vi.mocked(getBetterAuth).mockResolvedValue({
      api: {
        signInMagicLink: vi.fn().mockResolvedValue({ status: true }),
        getSession: vi.fn().mockResolvedValue(null),
        signOut: vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 })),
      },
      handler: vi.fn(),
    } as unknown as Awaited<ReturnType<typeof getBetterAuth>>);
    vi.mocked(authenticateRequest).mockResolvedValue({
      authenticated: false,
      error: "Authentication required",
    });

    const req = createRequest("GET", "/api/auth/me");
    const res = await meGet(req);

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      authenticated: boolean;
      authMode: string;
    };
    expect(body.authenticated).toBe(false);
    expect(body.authMode).toBe("multi-user");
  });

  it("clears session cookie on logout", async () => {
    setEnvOverrides({ AUTH_MODE: "multi-user" });
    const req = createRequest("POST", "/api/auth/logout");
    const res = await logoutPost(req);

    expect(res.status).toBe(200);
    const auth = await getBetterAuth();
    expect(auth.api.signOut).toHaveBeenCalled();
  });

  it("returns authenticated user in /api/auth/me", async () => {
    setEnvOverrides({ AUTH_MODE: "single-user" });
    vi.mocked(getUserById).mockResolvedValue({
      id: "test-user-id",
      email: "owner@example.com",
      email_verified: 1,
      slug: "owner",
      name: "Owner",
      avatar_url: null,
      is_admin: 1,
      is_active: 1,
      created_at: "2026-02-20T00:00:00.000Z",
      updated_at: "2026-02-20T00:00:00.000Z",
    });

    const req = createRequest("GET", "/api/auth/me");
    const res = await meGet(req);

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      authenticated: boolean;
      user?: { id: string; email: string };
    };
    expect(body.authenticated).toBe(true);
    expect(body.user?.id).toBe("test-user-id");
    expect(body.user?.email).toBe("owner@example.com");
  });
});
