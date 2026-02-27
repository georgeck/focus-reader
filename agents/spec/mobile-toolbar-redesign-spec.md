# Mobile Toolbar Redesign — Spec

**Version:** 1.0
**Date:** February 27, 2026
**Status:** Approved for implementation
**Scope:** `DocumentListToolbar` + `SearchBar` + `DocumentList` (floating bulk bar)

---

## Problem Statement

The `DocumentListToolbar` has two usability failures on mobile:

1. **Overflow:** Search input + type filter + sort dropdown + view toggle don't fit on one
   line at mobile widths, causing awkward two-line wrapping.
2. **Bulk selection UX is buried and cluttered:** Entering selection mode requires finding
   it inside the title's chevron dropdown. Once in bulk mode, action buttons wrap into a
   second line on mobile. The title chevron mixes navigation concerns with mode-switch
   concerns.

---

## Solution Overview

Two independent improvements:

- **A. Toolbar compaction** — collapse search and filter controls to icons on mobile
- **B. Bulk selection redesign** — dedicated entry point + floating bottom action bar

---

## A. Toolbar Compaction

### A.1 Search: expandable icon (mobile only)

**Mobile (`sm` breakpoint and below):**
- Show a `Search` icon button in place of the full input
- Tapping it expands the search inline, replacing the filter/sort/view-toggle row with a
  full-width search input + X dismiss button
- Dismissing collapses back to icon state and clears the query
- While expanded, no other right-side toolbar controls are shown

**Desktop (`sm` and above):**
- Keep the current always-visible text input — no change
- The `SearchBar` component gains a `compact` prop to switch between the two behaviors

### A.2 Filters: merged icon button

Collapse "All Types" dropdown + "Date saved / Sort" dropdown into a single icon button
using `SlidersHorizontal` from lucide-react.

**Mobile:** The merged button opens a **bottom Sheet** (`shadcn/ui Sheet` with
`side="bottom"`) containing:
- Type filter section (radio-style list: All Types / Articles / Emails / RSS / Bookmarks / PDFs)
- Sort by section (radio-style list: Date saved / Date published / Title / Reading time)
- Sort direction section (radio-style: Recent → Old / Old → Recent, etc.)
- A "Done" close button at the bottom

**Desktop:** The merged button opens a regular `DropdownMenu` with the same sections,
using `DropdownMenuLabel` separators. Functionally identical to today, just behind one
trigger instead of two.

If any non-default filter or sort is active, the button shows a small blue dot indicator
to signal that active filters exist.

### A.3 View mode toggle

The list/grid toggle stays in the toolbar on both desktop and mobile — no change.

### A.4 Title chevron

The title's `DropdownMenu` currently contains selection-related items. Leave it as-is
for now; it will be re-evaluated once the new layout is stable.

### Resulting toolbar layout

**Normal mode, mobile:**
```
[☰?]  [Title ▾]                    [view toggle]  [🔍]  [⚙]
```
_(☰ only shown when sidebar is collapsed)_

**Normal mode, desktop:**
```
[☰?]  [Title ▾]         [___ search input ___]  [All Types ▾]  [Date saved ▾]  [view toggle]  [▷ panel]
```
_(desktop is unchanged from today)_

**Search active (mobile — expanded):**
```
[________ search input ________] [✕]
```
_(all other right-side controls hidden while search is open)_

---

## B. Bulk Selection Redesign

### B.1 Entry point: dedicated Select button

Add a `CheckSquare` icon button directly in the toolbar, on the **left cluster** after the
title, always visible when `onToggleBulkMode` is provided.

- Normal state: ghost icon button, neutral color
- This replaces the hidden-in-chevron entry point (the chevron dropdown keeps "Exit
  selection mode" as a fallback but the primary entry is the visible button)

```
[Title ▾]  [☐]                    [view toggle]  [🔍]  [⚙]
```

### B.2 Bulk mode — toolbar

When bulk mode is active, the toolbar left side transforms to:

```
[✕ Done]  [N selected]  [Select all / Clear all]  [Select all matching (N)?]
```

- `✕ Done` button exits bulk mode (replaces the `CheckSquare` button while active)
- "N selected" is a plain text label
- "Select all" / "Clear all" toggles select-all-visible
- "Select all matching (N)" — only shown when `onToggleSelectAllMatching` is provided
  (i.e. not in search mode) — small text button

The right side (search icon, filter icon, view toggle) is **hidden** while bulk mode is
active; it is not needed and the space is better used for selection controls.

### B.3 Bulk mode — floating action bar (mobile)

On mobile, bulk actions are shown in a **floating bar pinned to the bottom** of the
document list container:

```
┌──────────────────────────────────────────┐
│  [Archive (2)]  [Later (2)]  [Delete (2)] │
└──────────────────────────────────────────┘
```

- `sticky bottom-0` on the list wrapper div, full width
- Appears when `isBulkMode` is true; hidden otherwise
- `bg-background border-t shadow-md py-2 px-3`
- Three buttons as a flex row, `flex-1` each for equal widths
- "Delete" uses `text-destructive` / `variant="ghost"` with destructive color
- All buttons disabled when 0 items selected or when `isBulkDeleting`/`isBulkUpdating`

### B.4 Bulk mode — inline actions (desktop)

On desktop (`sm` and above), bulk actions remain **inline in the toolbar** right cluster:

```
[✕ Done]  [N selected]  [Select all]      [Archive (2)]  [Later (2)]  [Delete (2)]
```

Same disabled states as B.3.

### B.5 Confirmation for delete

The existing `window.confirm` for delete is a known issue (blocks browser events in
automation). Out of scope for this spec — leave as-is for now.

---

## Component Changes Summary

| Component | Changes |
|---|---|
| `SearchBar` | Add `compact` prop: icon-only trigger that expands on tap (mobile only) |
| `DocumentListToolbar` | Add `CheckSquare` select button; restructure bulk-mode left cluster (B.2); hide right controls in bulk mode; replace two filter dropdowns with single merged `SlidersHorizontal` button; no changes to title chevron or view mode toggle |
| `DocumentList` | Render `BulkActionBar` at bottom of list container on mobile |
| `BulkActionBar` (new) | Mobile-only sticky bottom bar with Archive / Later / Delete actions; hidden on desktop |

---

## Decisions Log

| # | Decision |
|---|---|
| 1 | Desktop search keeps the full visible text input; icon-only is mobile-only |
| 2 | Merged filter panel opens as a bottom Sheet on mobile, DropdownMenu on desktop |
| 3 | Title chevron kept as-is for now, to be revisited once new layout is stable |
| 4 | View mode toggle (list/grid) stays in the toolbar on both desktop and mobile |
