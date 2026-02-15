"use client";

import { useState } from "react";
import { HIGHLIGHT_COLORS } from "@focus-reader/shared";
import type { HighlightColor, HighlightWithTags } from "@focus-reader/shared";
import { Trash2, Copy, X } from "lucide-react";
import { toast } from "sonner";

interface HighlightDetailPopoverProps {
  highlight: HighlightWithTags;
  position: { top: number; left: number };
  onUpdateColor: (color: string) => void;
  onUpdateNote: (note: string | null) => void;
  onDelete: () => void;
  onClose: () => void;
}

export function HighlightDetailPopover({
  highlight,
  position,
  onUpdateColor,
  onUpdateNote,
  onDelete,
  onClose,
}: HighlightDetailPopoverProps) {
  const [note, setNote] = useState(highlight.note || "");
  const [editingNote, setEditingNote] = useState(false);

  const copyText = () => {
    navigator.clipboard.writeText(highlight.text);
    toast("Copied to clipboard");
  };

  const saveNote = () => {
    onUpdateNote(note.trim() || null);
    setEditingNote(false);
  };

  return (
    <div
      className="fixed z-50 w-72 rounded-lg bg-popover border shadow-lg"
      style={{ top: position.top, left: position.left, transform: "translateX(-50%)" }}
    >
      <div className="p-3 space-y-3">
        {/* Text preview */}
        <p className="text-xs text-muted-foreground line-clamp-3 italic">
          &ldquo;{highlight.text}&rdquo;
        </p>

        {/* Color picker */}
        <div className="flex items-center gap-1">
          {HIGHLIGHT_COLORS.map((color) => (
            <button
              key={color}
              className="size-6 rounded-full transition-all"
              style={{
                backgroundColor: color,
                outline: highlight.color === color ? "2px solid var(--ring)" : "none",
                outlineOffset: "2px",
              }}
              onClick={() => onUpdateColor(color)}
            />
          ))}
        </div>

        {/* Note */}
        {editingNote ? (
          <div>
            <textarea
              className="w-full text-sm bg-transparent border rounded p-1.5 resize-none focus:outline-none focus:ring-1 focus:ring-ring"
              rows={2}
              placeholder="Add a note..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              autoFocus
            />
            <div className="flex justify-end gap-1 mt-1">
              <button
                className="text-xs px-2 py-1 rounded text-muted-foreground hover:text-foreground"
                onClick={() => setEditingNote(false)}
              >
                Cancel
              </button>
              <button
                className="text-xs px-2 py-1 rounded bg-primary text-primary-foreground hover:bg-primary/90"
                onClick={saveNote}
              >
                Save
              </button>
            </div>
          </div>
        ) : (
          <button
            className="text-xs text-muted-foreground hover:text-foreground w-full text-left"
            onClick={() => setEditingNote(true)}
          >
            {highlight.note ? highlight.note : "Add a note..."}
          </button>
        )}

        {/* Tags */}
        {highlight.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {highlight.tags.map((tag) => (
              <span
                key={tag.id}
                className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] text-primary"
              >
                <span
                  className="size-1.5 rounded-full"
                  style={{ backgroundColor: tag.color || "#6366f1" }}
                />
                {tag.name}
              </span>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-1 border-t pt-2">
          <button
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded hover:bg-accent"
            onClick={copyText}
          >
            <Copy className="size-3" /> Copy
          </button>
          <button
            className="flex items-center gap-1 text-xs text-destructive hover:text-destructive/80 px-2 py-1 rounded hover:bg-accent"
            onClick={onDelete}
          >
            <Trash2 className="size-3" /> Delete
          </button>
          <div className="flex-1" />
          <button
            className="text-muted-foreground hover:text-foreground p-1 rounded hover:bg-accent"
            onClick={onClose}
          >
            <X className="size-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
