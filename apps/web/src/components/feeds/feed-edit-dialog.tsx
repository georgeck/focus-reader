"use client";

import { useState, useEffect } from "react";
import type { FeedWithStats } from "@focus-reader/shared";
import { apiFetch } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

interface FeedEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feed: FeedWithStats;
  onSaved: () => void;
}

export function FeedEditDialog({
  open,
  onOpenChange,
  feed,
  onSaved,
}: FeedEditDialogProps) {
  const [title, setTitle] = useState(feed.title);
  const [description, setDescription] = useState(feed.description || "");
  const [iconUrl, setIconUrl] = useState(feed.icon_url || "");
  const [fetchInterval, setFetchInterval] = useState(feed.fetch_interval_minutes);
  const [fetchFullContent, setFetchFullContent] = useState(feed.fetch_full_content === 1);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle(feed.title);
      setDescription(feed.description || "");
      setIconUrl(feed.icon_url || "");
      setFetchInterval(feed.fetch_interval_minutes);
      setFetchFullContent(feed.fetch_full_content === 1);
    }
  }, [open, feed]);

  const handleSave = async () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      toast.error("Feed title cannot be empty");
      return;
    }

    if (fetchInterval < 1) {
      toast.error("Fetch interval must be at least 1 minute");
      return;
    }

    setIsSaving(true);
    try {
      await apiFetch(`/api/feeds/${feed.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          title: trimmedTitle,
          description: description.trim() || null,
          icon_url: iconUrl.trim() || null,
          fetch_interval_minutes: fetchInterval,
          fetch_full_content: fetchFullContent ? 1 : 0,
        }),
      });
      onSaved();
      onOpenChange(false);
      toast("Feed updated");
    } catch {
      toast.error("Failed to update feed");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Feed</DialogTitle>
          <DialogDescription>
            Update the feed settings.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label htmlFor="title" className="text-sm font-medium">
              Title
            </label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Feed title"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="description" className="text-sm font-medium">
              Description (optional)
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Feed description"
              rows={3}
              className="w-full text-sm border rounded-md px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="icon_url" className="text-sm font-medium">
              Icon URL (optional)
            </label>
            <Input
              id="icon_url"
              value={iconUrl}
              onChange={(e) => setIconUrl(e.target.value)}
              placeholder="https://example.com/icon.png"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="fetch_interval" className="text-sm font-medium">
              Fetch interval (minutes)
            </label>
            <Input
              id="fetch_interval"
              type="number"
              min="1"
              value={fetchInterval}
              onChange={(e) => setFetchInterval(parseInt(e.target.value) || 1)}
              placeholder="60"
            />
          </div>

          <div className="flex items-center justify-between">
            <label htmlFor="fetch_full_content" className="text-sm font-medium">
              Fetch full article content
            </label>
            <Switch
              id="fetch_full_content"
              checked={fetchFullContent}
              onCheckedChange={(checked) => setFetchFullContent(checked)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
