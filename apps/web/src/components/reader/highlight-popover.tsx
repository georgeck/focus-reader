"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { HIGHLIGHT_COLORS } from "@focus-reader/shared";
import type { HighlightColor } from "@focus-reader/shared";
import { MessageSquare } from "lucide-react";

interface HighlightPopoverProps {
  onCreateHighlight: (text: string, color: string, positionSelector: string | null, positionPercent: number, note?: string) => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

function getPositionSelector(range: Range, container: HTMLElement): string | null {
  try {
    const startNode = range.startContainer;
    const cssSelector = getCssSelector(startNode.parentElement!, container);
    const text = range.toString();
    const fullText = startNode.textContent || "";

    // Get surrounding context (~30 chars)
    const startIdx = Math.max(0, range.startOffset - 30);
    const endIdx = Math.min(fullText.length, range.endOffset + 30);
    const prefix = fullText.slice(startIdx, range.startOffset);
    const suffix = fullText.slice(range.endOffset, endIdx);

    return JSON.stringify({
      type: "TextPositionSelector",
      cssSelector,
      startOffset: range.startOffset,
      endOffset: range.endOffset,
      surroundingText: { prefix, exact: text, suffix },
    });
  } catch {
    return null;
  }
}

function getCssSelector(el: Element, container: HTMLElement): string {
  const parts: string[] = [];
  let current: Element | null = el;
  while (current && current !== container) {
    if (current.id) {
      parts.unshift(`#${current.id}`);
      break;
    }
    const parentEl: Element | null = current.parentElement;
    if (!parentEl) break;
    const tag = current.tagName;
    const siblings = Array.from(parentEl.children).filter((c) => c.tagName === tag);
    const index = siblings.indexOf(current) + 1;
    parts.unshift(`${tag.toLowerCase()}:nth-of-type(${index})`);
    current = parentEl;
  }
  return parts.join(" > ");
}

function getPositionPercent(range: Range, container: HTMLElement): number {
  const rect = range.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();
  const scrollTop = container.scrollTop;
  const relativeTop = rect.top - containerRect.top + scrollTop;
  const totalHeight = container.scrollHeight;
  return totalHeight > 0 ? Math.max(0, Math.min(1, relativeTop / totalHeight)) : 0;
}

export function HighlightPopover({ onCreateHighlight, containerRef }: HighlightPopoverProps) {
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [selectedText, setSelectedText] = useState("");
  const [showNote, setShowNote] = useState(false);
  const [note, setNote] = useState("");
  const rangeRef = useRef<Range | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const handleMouseUp = useCallback(() => {
    // Delay to allow selection to settle
    setTimeout(() => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || !selection.rangeCount) {
        return;
      }
      const range = selection.getRangeAt(0);
      const text = range.toString().trim();
      if (!text || !containerRef.current) return;

      // Make sure selection is within our container
      if (!containerRef.current.contains(range.commonAncestorContainer)) return;

      const rect = range.getBoundingClientRect();
      const containerRect = containerRef.current.getBoundingClientRect();

      setPosition({
        top: rect.top - containerRect.top - 48,
        left: rect.left - containerRect.left + rect.width / 2,
      });
      setSelectedText(text);
      rangeRef.current = range.cloneRange();
      setVisible(true);
      setShowNote(false);
      setNote("");
    }, 10);
  }, [containerRef]);

  const handleMouseDown = useCallback(
    (e: MouseEvent) => {
      if (popoverRef.current?.contains(e.target as Node)) return;
      setVisible(false);
    },
    []
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("mousedown", handleMouseDown);
    return () => {
      el.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("mousedown", handleMouseDown);
    };
  }, [containerRef, handleMouseUp, handleMouseDown]);

  const createHighlight = useCallback(
    (color: HighlightColor) => {
      if (!selectedText || !containerRef.current || !rangeRef.current) return;
      const posSelector = getPositionSelector(rangeRef.current, containerRef.current);
      const posPct = getPositionPercent(rangeRef.current, containerRef.current);
      onCreateHighlight(selectedText, color, posSelector, posPct, showNote ? note : undefined);
      setVisible(false);
      window.getSelection()?.removeAllRanges();
    },
    [selectedText, containerRef, onCreateHighlight, showNote, note]
  );

  if (!visible) return null;

  return (
    <div
      ref={popoverRef}
      className="absolute z-50 flex flex-col items-center gap-1"
      style={{ top: position.top, left: position.left, transform: "translateX(-50%)" }}
    >
      <div className="flex items-center gap-1 rounded-lg bg-popover border shadow-lg px-2 py-1.5">
        {HIGHLIGHT_COLORS.map((color) => (
          <button
            key={color}
            className="size-6 rounded-full border-2 border-transparent hover:border-foreground/30 transition-colors"
            style={{ backgroundColor: color }}
            onClick={() => createHighlight(color)}
            title={`Highlight ${color}`}
          />
        ))}
        <div className="w-px h-5 bg-border mx-1" />
        <button
          className="flex items-center justify-center size-6 rounded text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => setShowNote(!showNote)}
          title="Add note"
        >
          <MessageSquare className="size-3.5" />
        </button>
      </div>
      {showNote && (
        <div className="rounded-lg bg-popover border shadow-lg p-2 w-64">
          <textarea
            className="w-full text-sm bg-transparent border rounded p-1.5 resize-none focus:outline-none focus:ring-1 focus:ring-ring"
            rows={2}
            placeholder="Add a note..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            autoFocus
          />
          <div className="flex justify-end mt-1">
            <button
              className="text-xs px-2 py-1 rounded bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={() => createHighlight("#FFFF00")}
            >
              Save with note
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
