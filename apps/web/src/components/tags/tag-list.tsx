"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import type { TagWithCount } from "@focus-reader/shared";
import { useTags } from "@/hooks/use-tags";
import { useApp } from "@/contexts/app-context";
import { TagListItem } from "./tag-list-item";
import { TagListToolbar } from "./tag-list-toolbar";
import { Skeleton } from "@/components/ui/skeleton";

interface TagListProps {
  title: string;
}

export function TagList({ title }: TagListProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { setDocumentIds, setCurrentDocumentIndex, setSelectedDocumentId } = useApp();
  const { tags, isLoading, mutate } = useTags();

  const [searchQuery, setSearchQuery] = useState("");

  // Client-side search filtering
  const filteredTags = useMemo(() => {
    if (!searchQuery.trim()) {
      return tags;
    }
    const query = searchQuery.toLowerCase();
    return tags.filter((t) => t.name.toLowerCase().includes(query));
  }, [searchQuery, tags]);

  // Sync to AppContext for keyboard nav (reuse documentIds array)
  useEffect(() => {
    setDocumentIds(filteredTags.map((t) => t.id));
  }, [filteredTags, setDocumentIds]);

  // Selection handler
  const selectTag = useCallback(
    (id: string) => {
      setSelectedDocumentId(id);
      const idx = filteredTags.findIndex((t) => t.id === id);
      setCurrentDocumentIndex(idx);
      // Update URL with ?tag=id
      const params = new URLSearchParams(searchParams.toString());
      params.set("tag", id);
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [filteredTags, setSelectedDocumentId, setCurrentDocumentIndex, searchParams, router, pathname]
  );

  // Navigate to tag detail page (double-click)
  const navigateToTag = useCallback(
    (id: string) => {
      router.push(`/tags/${id}`);
    },
    [router]
  );

  if (isLoading && tags.length === 0) {
    return (
      <div className="flex-1 flex flex-col">
        <TagListToolbar title={title} total={0} onSearch={setSearchQuery} />
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

  if (filteredTags.length === 0) {
    return (
      <div className="flex-1 flex flex-col">
        <TagListToolbar title={title} total={0} onSearch={setSearchQuery} />
        <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
          {searchQuery.trim() ? (
            <>No tags match &ldquo;{searchQuery}&rdquo;</>
          ) : (
            <>No tags yet. Tags are created when you tag documents.</>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <TagListToolbar
        title={title}
        total={filteredTags.length}
        onSearch={setSearchQuery}
      />
      <div className="flex-1 overflow-y-auto">
        {filteredTags.map((tag) => (
          <TagListItem
            key={tag.id}
            tag={tag}
            isSelected={tag.id === searchParams.get("tag")}
            onClick={() => selectTag(tag.id)}
            onDoubleClick={() => navigateToTag(tag.id)}
            onMutate={mutate}
          />
        ))}
      </div>
      <div className="border-t px-4 py-1.5 text-xs text-muted-foreground text-right">
        Count: {filteredTags.length}
      </div>
    </div>
  );
}
