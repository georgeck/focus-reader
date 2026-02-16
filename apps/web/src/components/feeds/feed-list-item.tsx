"use client";

import { useRef } from "react";
import type { FeedWithStats } from "@focus-reader/shared";
import { cn } from "@/lib/utils";
import { timeAgo } from "@/lib/format";
import { Rss } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  FeedListItemActions,
  type FeedListItemActionsHandle,
} from "./feed-list-item-actions";

interface FeedListItemProps {
  feed: FeedWithStats;
  isSelected: boolean;
  onClick: () => void;
  onDoubleClick: () => void;
  onMutate: () => void;
}

export function FeedListItem({
  feed,
  isSelected,
  onClick,
  onDoubleClick,
  onMutate,
}: FeedListItemProps) {
  const actionsRef = useRef<FeedListItemActionsHandle>(null);

  // Extract domain from site_url or feed_url
  const siteUrl = feed.site_url || feed.feed_url;
  let domain = "";
  if (siteUrl) {
    try {
      domain = new URL(siteUrl).hostname.replace(/^www\./, "");
    } catch {
      domain = siteUrl;
    }
  }

  return (
    <div
      data-selected={isSelected}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onContextMenu={(e) => {
        e.preventDefault();
        actionsRef.current?.openMenu();
      }}
      className={cn(
        "group relative flex gap-3 px-4 py-3 border-b cursor-pointer transition-colors",
        isSelected ? "bg-accent" : "hover:bg-accent/50"
      )}
    >
      {/* Feed Icon */}
      <div className="flex size-14 flex-shrink-0 items-center justify-center rounded bg-muted">
        {feed.icon_url ? (
          <img
            src={feed.icon_url}
            alt={feed.title}
            className="size-14 rounded object-cover"
          />
        ) : (
          <Rss className="size-6 text-muted-foreground" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-medium truncate">{feed.title}</h3>
        <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
          <span className="truncate">{domain}</span>
          <span>&middot;</span>
          <span>
            {feed.documentCount} article{feed.documentCount === 1 ? "" : "s"}
          </span>
          <span>&middot;</span>
          <span>
            {feed.last_fetched_at ? `Fetched ${timeAgo(feed.last_fetched_at)}` : "Never fetched"}
          </span>
        </div>
        {/* Status badges */}
        <div className="flex items-center gap-1.5 mt-1.5">
          {feed.unreadCount > 0 && (
            <Badge variant="secondary" className="text-xs px-1.5 py-0">
              {feed.unreadCount} unread
            </Badge>
          )}
          {feed.is_active === 0 && (
            <Badge variant="outline" className="text-xs px-1.5 py-0">
              Paused
            </Badge>
          )}
          {feed.error_count > 0 && (
            <Badge variant="destructive" className="text-xs px-1.5 py-0">
              Error
            </Badge>
          )}
        </div>
      </div>

      {/* Right meta - hidden on group hover when toolbar shows */}
      <div className="flex flex-col items-end gap-1 flex-shrink-0 group-hover:opacity-0 transition-opacity">
        <span className="text-xs text-muted-foreground">
          {feed.last_fetched_at ? timeAgo(feed.last_fetched_at) : "Never"}
        </span>
      </div>

      {/* Actions toolbar + context menu */}
      <FeedListItemActions ref={actionsRef} feed={feed} onMutate={onMutate} />
    </div>
  );
}
