"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import type { FeedWithStats } from "@focus-reader/shared";
import { useFeeds } from "@/hooks/use-feeds";
import { useApp } from "@/contexts/app-context";
import { FeedListItem } from "./feed-list-item";
import { FeedListToolbar } from "./feed-list-toolbar";
import { Skeleton } from "@/components/ui/skeleton";

interface FeedListProps {
  title: string;
}

export function FeedList({ title }: FeedListProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { selectedDocumentId, setDocumentIds, setCurrentDocumentIndex, setSelectedDocumentId } = useApp();
  const { feeds, isLoading, mutate } = useFeeds();

  const [searchQuery, setSearchQuery] = useState("");

  // Sync context selection → URL so right panel reacts to keyboard nav
  useEffect(() => {
    if (!selectedDocumentId) return;
    const current = searchParams.get("feed");
    if (current === selectedDocumentId) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("feed", selectedDocumentId);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [selectedDocumentId, searchParams, router, pathname]);

  // Client-side search filtering by feed title
  const filteredFeeds = useMemo(() => {
    if (!searchQuery.trim()) {
      return feeds;
    }
    const query = searchQuery.toLowerCase();
    return feeds.filter((f) => f.title.toLowerCase().includes(query));
  }, [searchQuery, feeds]);

  // Sync to AppContext for keyboard nav (reuse documentIds array)
  useEffect(() => {
    setDocumentIds(filteredFeeds.map((f) => f.id));
  }, [filteredFeeds, setDocumentIds]);

  // Selection handler
  const selectFeed = useCallback(
    (id: string) => {
      setSelectedDocumentId(id);
      const idx = filteredFeeds.findIndex((f) => f.id === id);
      setCurrentDocumentIndex(idx);
      // Update URL with ?feed=id
      const params = new URLSearchParams(searchParams.toString());
      params.set("feed", id);
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [filteredFeeds, setSelectedDocumentId, setCurrentDocumentIndex, searchParams, router, pathname]
  );

  // Navigate to feed detail page (double-click)
  const navigateToFeed = useCallback(
    (id: string) => {
      router.push(`/feeds/${id}`);
    },
    [router]
  );

  if (isLoading && feeds.length === 0) {
    return (
      <div className="flex-1 flex flex-col">
        <FeedListToolbar title={title} total={0} onSearch={setSearchQuery} />
        <div className="flex-1 overflow-y-auto">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex gap-3 px-4 py-3 border-b">
              <Skeleton className="size-14 rounded" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (filteredFeeds.length === 0) {
    return (
      <div className="flex-1 flex flex-col">
        <FeedListToolbar title={title} total={0} onSearch={setSearchQuery} />
        <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
          {searchQuery.trim() ? (
            <>No feeds match &ldquo;{searchQuery}&rdquo;</>
          ) : (
            <>No feeds yet. Add feeds in Settings to start collecting articles.</>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <FeedListToolbar
        title={title}
        total={filteredFeeds.length}
        onSearch={setSearchQuery}
      />
      <div className="flex-1 overflow-y-auto">
        {filteredFeeds.map((feed) => (
          <FeedListItem
            key={feed.id}
            feed={feed}
            isSelected={feed.id === (searchParams.get("feed") || selectedDocumentId)}
            onClick={() => selectFeed(feed.id)}
            onDoubleClick={() => navigateToFeed(feed.id)}
            onMutate={mutate}
          />
        ))}
      </div>
      <div className="border-t px-4 py-1.5 text-xs text-muted-foreground text-right">
        Count: {filteredFeeds.length}
      </div>
    </div>
  );
}
