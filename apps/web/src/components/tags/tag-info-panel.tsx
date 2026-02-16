"use client";

import { useState } from "react";
import type { TagWithCount } from "@focus-reader/shared";
import { apiFetch } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Pencil, Palette, ExternalLink, Trash2 } from "lucide-react";
import { timeAgo, formatDate } from "@/lib/format";
import { toast } from "sonner";
import Link from "next/link";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ColorPicker } from "@/components/settings/color-picker";
import { TagEditDialog } from "./tag-edit-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useRouter } from "next/navigation";

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
      {children}
    </h3>
  );
}

function MetadataRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-foreground font-medium">{value}</dd>
    </div>
  );
}

interface TagInfoPanelProps {
  tag: TagWithCount | null;
  onMutate: () => void;
}

export function TagInfoPanel({ tag, onMutate }: TagInfoPanelProps) {
  const router = useRouter();

  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const updateColor = async (color: string) => {
    if (!tag) return;
    try {
      await apiFetch(`/api/tags/${tag.id}`, {
        method: "PATCH",
        body: JSON.stringify({ color }),
      });
      onMutate();
      setColorPickerOpen(false);
      toast("Color updated");
    } catch {
      toast.error("Failed to update color");
    }
  };

  const deleteTag = async () => {
    if (!tag) return;
    setIsDeleting(true);
    try {
      await apiFetch(`/api/tags/${tag.id}`, { method: "DELETE" });
      toast("Tag deleted");
      onMutate();
      // Navigate back to tags list without selection
      router.push("/tags");
    } catch {
      toast.error("Failed to delete tag");
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  if (!tag) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-4">
        <p className="text-sm text-muted-foreground">
          Select a tag to see its details
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="p-4 space-y-6">
        {/* Color preview */}
        <div className="flex justify-center">
          <div
            className="size-16 rounded-full"
            style={{ backgroundColor: tag.color || "#6366f1" }}
          />
        </div>

        {/* Tag name */}
        <div className="text-center">
          <h2 className="text-sm font-semibold">{tag.name}</h2>
          <p className="text-xs text-muted-foreground mt-1">
            {tag.documentCount} document{tag.documentCount === 1 ? "" : "s"}
          </p>
        </div>

        {/* Quick actions */}
        <div className="space-y-2">
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start"
            onClick={() => setEditDialogOpen(true)}
          >
            <Pencil className="size-4 mr-2" />
            Rename
          </Button>
          <Popover open={colorPickerOpen} onOpenChange={setColorPickerOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
              >
                <Palette className="size-4 mr-2" />
                Change Color
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-3" align="start">
              <ColorPicker
                value={tag.color}
                onChange={updateColor}
                onClose={() => setColorPickerOpen(false)}
              />
            </PopoverContent>
          </Popover>
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start"
            asChild
          >
            <Link href={`/tags/${tag.id}`}>
              <ExternalLink className="size-4 mr-2" />
              View Documents
            </Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start text-destructive hover:text-destructive"
            onClick={() => setDeleteDialogOpen(true)}
          >
            <Trash2 className="size-4 mr-2" />
            Delete Tag
          </Button>
        </div>

        {/* Metadata */}
        <div>
          <SectionHeading>METADATA</SectionHeading>
          <dl className="mt-2 space-y-2">
            <MetadataRow
              label="Documents"
              value={`${tag.documentCount}`}
            />
            <MetadataRow
              label="Created"
              value={formatDate(tag.created_at)}
            />
            <MetadataRow
              label="Last used"
              value={timeAgo(tag.created_at)}
            />
          </dl>
        </div>

        {tag.description && (
          <div>
            <SectionHeading>DESCRIPTION</SectionHeading>
            <p className="text-sm text-muted-foreground mt-2">
              {tag.description}
            </p>
          </div>
        )}
      </div>

      {/* Edit dialog */}
      <TagEditDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        tag={tag}
        onSaved={onMutate}
      />

      {/* Delete confirmation */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Tag</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &ldquo;{tag.name}&rdquo;? This will
              remove the tag from all documents. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              onClick={deleteTag}
              disabled={isDeleting}
              variant="destructive"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
