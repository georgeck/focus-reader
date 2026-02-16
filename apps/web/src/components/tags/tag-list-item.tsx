"use client";

import { useRef } from "react";
import type { TagWithCount } from "@focus-reader/shared";
import { cn } from "@/lib/utils";
import { timeAgo } from "@/lib/format";
import {
  TagListItemActions,
  type TagListItemActionsHandle,
} from "./tag-list-item-actions";

interface TagListItemProps {
  tag: TagWithCount;
  isSelected: boolean;
  onClick: () => void;
  onDoubleClick: () => void;
  onMutate: () => void;
}

export function TagListItem({
  tag,
  isSelected,
  onClick,
  onDoubleClick,
  onMutate,
}: TagListItemProps) {
  const actionsRef = useRef<TagListItemActionsHandle>(null);

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
      {/* Color preview */}
      <div className="flex size-14 flex-shrink-0 items-center justify-center rounded bg-muted">
        <div
          className="size-8 rounded-full"
          style={{ backgroundColor: tag.color || "#6366f1" }}
        />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-medium truncate">{tag.name}</h3>
        <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
          <span>
            {tag.documentCount} document{tag.documentCount === 1 ? "" : "s"}
          </span>
          <span>&middot;</span>
          <span>Created {timeAgo(tag.created_at)}</span>
        </div>
      </div>

      {/* Right meta - hidden on group hover when toolbar shows */}
      <div className="flex flex-col items-end gap-1 flex-shrink-0 group-hover:opacity-0 transition-opacity">
        <span className="text-xs text-muted-foreground">
          {timeAgo(tag.created_at)}
        </span>
      </div>

      {/* Actions toolbar + context menu */}
      <TagListItemActions ref={actionsRef} tag={tag} onMutate={onMutate} />
    </div>
  );
}
