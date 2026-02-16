import { NextRequest } from "next/server";
import { jsonError } from "@/lib/api-helpers";

const ALLOWED_CONTENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "image/avif",
];

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");
  if (!url) {
    return jsonError("Missing url parameter", "MISSING_URL", 400);
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return jsonError("Invalid url", "INVALID_URL", 400);
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return jsonError("Invalid protocol", "INVALID_PROTOCOL", 400);
  }

  try {
    const response = await fetch(url, {
      headers: { Accept: "image/*" },
      redirect: "follow",
    });

    if (!response.ok) {
      return jsonError("Upstream fetch failed", "UPSTREAM_ERROR", 502);
    }

    const contentType = response.headers.get("content-type")?.split(";")[0]?.trim() || "";
    if (!ALLOWED_CONTENT_TYPES.includes(contentType)) {
      return jsonError("Not an image", "INVALID_CONTENT_TYPE", 400);
    }

    const body = response.body;
    return new Response(body, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, immutable",
      },
    });
  } catch {
    return jsonError("Failed to fetch image", "FETCH_ERROR", 502);
  }
}
