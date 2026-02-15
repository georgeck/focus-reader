"use client";

import useSWR from "swr";
import type { HighlightWithTags, HighlightWithDocument } from "@focus-reader/shared";
import { apiFetch } from "@/lib/api-client";

export function useHighlightsForDocument(documentId: string | null) {
  const { data, error, isLoading, mutate } = useSWR(
    documentId ? `/api/documents/${documentId}/highlights` : null,
    (url: string) => apiFetch<HighlightWithTags[]>(url)
  );

  return {
    highlights: data ?? [],
    isLoading,
    error,
    mutate,
  };
}

export function useHighlights(options?: {
  tagId?: string;
  color?: string;
  limit?: number;
  cursor?: string;
}) {
  const params = new URLSearchParams();
  if (options?.tagId) params.set("tagId", options.tagId);
  if (options?.color) params.set("color", options.color);
  if (options?.limit) params.set("limit", String(options.limit));
  if (options?.cursor) params.set("cursor", options.cursor);

  const qs = params.toString();
  const key = `/api/highlights${qs ? `?${qs}` : ""}`;

  const { data, error, isLoading, mutate } = useSWR(
    key,
    (url: string) =>
      apiFetch<{ items: HighlightWithDocument[]; total: number; nextCursor?: string }>(url)
  );

  return {
    highlights: data?.items ?? [],
    total: data?.total ?? 0,
    nextCursor: data?.nextCursor,
    isLoading,
    error,
    mutate,
  };
}
