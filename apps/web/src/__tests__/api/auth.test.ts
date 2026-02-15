import { describe, it, expect, vi, beforeEach } from "vitest";
import { createRequest, setAuthEnabled } from "../setup";

// Use a real authenticateRequest for auth tests — don't mock it
vi.mock("@focus-reader/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@focus-reader/api")>();
  return {
    ...actual,
    // Keep real authenticateRequest, mock everything else the routes might need
    getDocuments: vi.fn().mockResolvedValue({ data: [], cursor: null }),
  };
});

import { GET } from "@/app/api/documents/route";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Auth enforcement", () => {
  it("returns 401 when CF_ACCESS vars are set and no credentials provided", async () => {
    setAuthEnabled(true);

    const req = createRequest("GET", "/api/documents");
    const res = await GET(req);

    expect(res.status).toBe(401);
    const body = await res.json() as Record<string, any>;
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("returns 200 when CF_ACCESS vars are not set (dev mode)", async () => {
    setAuthEnabled(false);

    const req = createRequest("GET", "/api/documents");
    const res = await GET(req);

    expect(res.status).toBe(200);
  });
});
