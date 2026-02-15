import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock browser.storage.sync
const mockStorage: Record<string, unknown> = {};
const browserMock = {
  storage: {
    sync: {
      get: vi.fn(async (keys: string[]) => {
        const result: Record<string, unknown> = {};
        for (const key of keys) {
          if (key in mockStorage) result[key] = mockStorage[key];
        }
        return result;
      }),
      set: vi.fn(async (items: Record<string, unknown>) => {
        Object.assign(mockStorage, items);
      }),
    },
  },
};

// Set global browser mock before importing the module
vi.stubGlobal("browser", browserMock);

// Mock fetch
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// Import after mocks are set up
const { getConfig, saveConfig, savePage, getTags, testConnection } = await import(
  "../lib/api-client"
);

beforeEach(() => {
  vi.clearAllMocks();
  // Reset storage
  for (const key of Object.keys(mockStorage)) delete mockStorage[key];
});

describe("getConfig", () => {
  it("returns null when not configured", async () => {
    const config = await getConfig();
    expect(config).toBeNull();
  });

  it("returns config when set", async () => {
    mockStorage.apiUrl = "https://example.com";
    mockStorage.apiKey = "test-key";
    const config = await getConfig();
    expect(config).toEqual({ apiUrl: "https://example.com", apiKey: "test-key" });
  });
});

describe("saveConfig", () => {
  it("saves config to storage", async () => {
    await saveConfig({ apiUrl: "https://example.com", apiKey: "key123" });
    expect(browserMock.storage.sync.set).toHaveBeenCalledWith({
      apiUrl: "https://example.com",
      apiKey: "key123",
    });
  });
});

describe("savePage", () => {
  it("sends correct POST body", async () => {
    mockStorage.apiUrl = "https://example.com";
    mockStorage.apiKey = "key123";
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: "doc-1" }),
    });

    await savePage("https://page.com", "<html></html>", {
      type: "article",
      tagIds: ["tag-1", "tag-2"],
    });

    expect(mockFetch).toHaveBeenCalledWith("https://example.com/api/documents", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer key123",
      },
      body: JSON.stringify({
        url: "https://page.com",
        type: "article",
        html: "<html></html>",
        tagIds: ["tag-1", "tag-2"],
      }),
    });
  });

  it("throws when not configured", async () => {
    await expect(savePage("https://page.com", null)).rejects.toThrow(
      "Extension not configured"
    );
  });

  it("throws on error response", async () => {
    mockStorage.apiUrl = "https://example.com";
    mockStorage.apiKey = "key123";
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 409,
      json: async () => ({ error: { message: "This URL is already saved" } }),
    });

    await expect(
      savePage("https://page.com", null, { type: "bookmark" })
    ).rejects.toThrow("This URL is already saved");
  });
});

describe("getTags", () => {
  it("sends GET with auth header", async () => {
    mockStorage.apiUrl = "https://example.com";
    mockStorage.apiKey = "key123";
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [{ id: "t1", name: "News", color: "#ff0000" }],
    });

    const tags = await getTags();

    expect(mockFetch).toHaveBeenCalledWith("https://example.com/api/tags", {
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer key123",
      },
    });
    expect(tags).toEqual([{ id: "t1", name: "News", color: "#ff0000" }]);
  });
});

describe("testConnection", () => {
  it("returns true when getTags succeeds", async () => {
    mockStorage.apiUrl = "https://example.com";
    mockStorage.apiKey = "key123";
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    expect(await testConnection()).toBe(true);
  });

  it("returns false when not configured", async () => {
    expect(await testConnection()).toBe(false);
  });

  it("returns false on network error", async () => {
    mockStorage.apiUrl = "https://example.com";
    mockStorage.apiKey = "key123";
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    expect(await testConnection()).toBe(false);
  });
});
