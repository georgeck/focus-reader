"use client";

import { forwardRef, useCallback, useImperativeHandle, useState } from "react";
import type { TagWithCount } from "@focus-reader/shared";
import { apiFetch } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Palette, Pencil, MoreHorizontal, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ColorPicker } from "@/components/settings/color-picker";
import { TagEditDialog } from "./tag-edit-dialog";

interface TagListItemActionsProps {
  tag: TagWithCount;
  onMutate: () => void;
}

export interface TagListItemActionsHandle {
  openMenu: () => void;
}

export const TagListItemActions = forwardRef<
  TagListItemActionsHandle,
  TagListItemActionsProps
>(function TagListItemActions({ tag, onMutate }, ref) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  useImperativeHandle(ref, () => ({
    openMenu: () => setDropdownOpen(true),
  }));

  const updateColor = useCallback(
    async (color: string) => {
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
    },
    [tag.id, onMutate]
  );

  const deleteTag = useCallback(async () => {
    try {
      await apiFetch(`/api/tags/${tag.id}`, { method: "DELETE" });
      onMutate();
      toast("Tag deleted");
    } catch {
      toast.error("Failed to delete tag");
    }
  }, [tag.id, onMutate]);

  return (
    <>
      {/* Floating toolbar - visible on group hover */}
      <div
        className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity bg-background/90 backdrop-blur-sm rounded-md border shadow-sm px-0.5 py-0.5"
        onClick={(e) => e.stopPropagation()}
      >
        <Popover open={colorPickerOpen} onOpenChange={setColorPickerOpen}>
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Palette className="size-3.5" />
                </Button>
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent side="bottom">Change color</TooltipContent>
          </Tooltip>
          <PopoverContent className="w-auto p-3" align="end">
            <ColorPicker
              value={tag.color}
              onChange={updateColor}
              onClose={() => setColorPickerOpen(false)}
            />
          </PopoverContent>
        </Popover>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={(e) => {
                e.stopPropagation();
                setEditDialogOpen(true);
              }}
            >
              <Pencil className="size-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Edit name</TooltipContent>
        </Tooltip>

        <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="size-3.5" />
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent side="bottom">More actions</TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
            <DropdownMenuItem
              onClick={() => {
                setEditDialogOpen(true);
                setDropdownOpen(false);
              }}
            >
              <Pencil className="size-4 mr-2" /> Edit name
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                setColorPickerOpen(true);
                setDropdownOpen(false);
              }}
            >
              <Palette className="size-4 mr-2" /> Change color
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={deleteTag} className="text-destructive">
              <Trash2 className="size-4 mr-2" /> Delete tag
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Edit dialog */}
      <TagEditDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        tag={tag}
        onSaved={onMutate}
      />
    </>
  );
});
