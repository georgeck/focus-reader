"use client";

import { Button } from "@/components/ui/button";
import { PanelLeftOpen, PanelRightOpen } from "lucide-react";
import { SearchBar } from "@/components/search/search-bar";
import { useApp } from "@/contexts/app-context";

interface FeedListToolbarProps {
  title: string;
  total: number;
  onSearch: (query: string) => void;
}

export function FeedListToolbar({ title, total, onSearch }: FeedListToolbarProps) {
  const { sidebarCollapsed, toggleSidebar, rightPanelVisible, toggleRightPanel } = useApp();

  return (
    <div className="flex items-center justify-between gap-2 border-b px-4 py-2">
      <div className="flex items-center gap-1 shrink-0">
        {sidebarCollapsed && (
          <Button variant="ghost" size="icon" className="size-7" onClick={toggleSidebar}>
            <PanelLeftOpen className="size-4" />
          </Button>
        )}
        <h2 className="text-sm font-semibold">{title}</h2>
        <span className="text-xs text-muted-foreground ml-1">
          ({total})
        </span>
      </div>
      <div className="flex items-center gap-2">
        <SearchBar onSearch={onSearch} />
        {!rightPanelVisible && (
          <Button variant="ghost" size="icon" className="size-7" onClick={toggleRightPanel}>
            <PanelRightOpen className="size-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
