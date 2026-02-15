export interface ExtensionConfig {
  apiUrl: string;
  apiKey: string;
}

export async function getConfig(): Promise<ExtensionConfig | null> {
  const result = await browser.storage.sync.get(["apiUrl", "apiKey"]);
  if (!result.apiUrl || !result.apiKey) return null;
  return { apiUrl: result.apiUrl as string, apiKey: result.apiKey as string };
}

export async function saveConfig(config: ExtensionConfig): Promise<void> {
  await browser.storage.sync.set({ apiUrl: config.apiUrl, apiKey: config.apiKey });
}

async function request(path: string, init?: RequestInit): Promise<Response> {
  const config = await getConfig();
  if (!config) throw new Error("Extension not configured. Set API URL and key in options.");

  const url = `${config.apiUrl.replace(/\/$/, "")}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
      ...init?.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const msg = body?.error?.message ?? `Request failed (${res.status})`;
    throw new Error(msg);
  }

  return res;
}

export interface SavePageOptions {
  type?: "article" | "bookmark";
  tagIds?: string[];
}

export async function savePage(
  url: string,
  html: string | null,
  options?: SavePageOptions
): Promise<unknown> {
  const res = await request("/api/documents", {
    method: "POST",
    body: JSON.stringify({
      url,
      type: options?.type ?? "article",
      html,
      tagIds: options?.tagIds,
    }),
  });
  return res.json();
}

export interface Tag {
  id: string;
  name: string;
  color: string | null;
}

export async function getTags(): Promise<Tag[]> {
  const res = await request("/api/tags");
  return res.json();
}

export async function testConnection(): Promise<boolean> {
  try {
    await getTags();
    return true;
  } catch {
    return false;
  }
}
