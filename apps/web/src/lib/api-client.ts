export async function apiFetch<T>(
  url: string,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", ...init?.headers },
    ...init,
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    // Support both { error: { code, message } } and legacy { error, code } formats
    const err = body.error as Record<string, string> | string | undefined;
    const message = typeof err === "object" && err !== null ? err.message : (typeof err === "string" ? err : res.statusText);
    const code = typeof err === "object" && err !== null ? err.code : ((body.code as string) || "UNKNOWN");
    throw new ApiClientError(message, code, res.status);
  }
  return res.json();
}

export class ApiClientError extends Error {
  code: string;
  status: number;
  constructor(message: string, code: string, status: number) {
    super(message);
    this.name = "ApiClientError";
    this.code = code;
    this.status = status;
  }
}
