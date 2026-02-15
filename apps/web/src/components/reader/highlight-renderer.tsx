"use client";

import { useEffect, useCallback } from "react";
import type { HighlightWithTags, PositionSelector } from "@focus-reader/shared";

interface HighlightRendererProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
  highlights: HighlightWithTags[];
  onHighlightClick: (highlightId: string, rect: DOMRect) => void;
}

function findTextInContainer(container: HTMLElement, searchText: string): Range | null {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  let node: Text | null;
  while ((node = walker.nextNode() as Text | null)) {
    const idx = (node.textContent || "").indexOf(searchText);
    if (idx >= 0) {
      const range = document.createRange();
      range.setStart(node, idx);
      range.setEnd(node, idx + searchText.length);
      return range;
    }
  }
  return null;
}

function anchorHighlight(
  container: HTMLElement,
  highlight: HighlightWithTags
): Range | null {
  // Primary: use CSS selector + offsets
  if (highlight.position_selector) {
    try {
      const selector: PositionSelector = JSON.parse(highlight.position_selector);
      const el = container.querySelector(selector.cssSelector);
      if (el) {
        const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
        let node: Text | null;
        let offset = 0;
        while ((node = walker.nextNode() as Text | null)) {
          const len = node.textContent?.length || 0;
          if (offset + len >= selector.startOffset) {
            const localStart = selector.startOffset - offset;
            const localEnd = Math.min(len, localStart + selector.surroundingText.exact.length);
            const range = document.createRange();
            range.setStart(node, localStart);
            range.setEnd(node, localEnd);
            if (range.toString() === selector.surroundingText.exact) {
              return range;
            }
            break;
          }
          offset += len;
        }
      }
    } catch {
      // Fall through to text search
    }
  }

  // Fallback: text search
  return findTextInContainer(container, highlight.text.slice(0, 200));
}

export function applyHighlights(
  container: HTMLElement,
  highlights: HighlightWithTags[],
  onClick: (highlightId: string, rect: DOMRect) => void
) {
  for (const h of highlights) {
    const range = anchorHighlight(container, h);
    if (!range) continue;

    try {
      const mark = document.createElement("mark");
      mark.style.backgroundColor = h.color;
      mark.style.color = "inherit";
      mark.style.borderRadius = "2px";
      mark.style.paddingInline = "1px";
      mark.style.cursor = "pointer";
      mark.dataset.highlightId = h.id;
      mark.addEventListener("click", (e) => {
        e.stopPropagation();
        const rect = mark.getBoundingClientRect();
        onClick(h.id, rect);
      });
      range.surroundContents(mark);
    } catch {
      // surroundContents fails on cross-element ranges — skip gracefully
    }
  }
}

export function removeHighlightMarks(container: HTMLElement | null) {
  if (!container) return;
  const marks = container.querySelectorAll("mark[data-highlight-id]");
  marks.forEach((mark) => {
    const parent = mark.parentNode;
    if (!parent) return;
    while (mark.firstChild) {
      parent.insertBefore(mark.firstChild, mark);
    }
    parent.removeChild(mark);
    parent.normalize();
  });
}

export function HighlightRenderer({ containerRef, highlights, onHighlightClick }: HighlightRendererProps) {
  const apply = useCallback(() => {
    const el = containerRef.current;
    if (!el || !highlights.length) return;
    removeHighlightMarks(el);
    applyHighlights(el, highlights, onHighlightClick);
  }, [containerRef, highlights, onHighlightClick]);

  useEffect(() => {
    // Small delay to ensure DOM is rendered
    const timer = setTimeout(apply, 100);
    return () => {
      clearTimeout(timer);
      removeHighlightMarks(containerRef.current);
    };
  }, [apply, containerRef]);

  return null;
}
