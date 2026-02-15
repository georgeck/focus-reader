"use client";

import useSWR from "swr";
import type { SavedView } from "@focus-reader/shared";
import { apiFetch } from "@/lib/api-client";

export function useSavedViews() {
  const { data, error, isLoading, mutate } = useSWR(
    "/api/saved-views",
    (url: string) => apiFetch<SavedView[]>(url)
  );

  return {
    views: data ?? [],
    isLoading,
    error,
    mutate,
  };
}
