# Toolbar Consolidation Spec (Desktop + Mobile)

## Context
The current document-list toolbar is overloaded on small screens and splits bulk-selection actions across mixed UI patterns (dropdown + inline controls), which is hard to scan and discover.

This spec consolidates search/filter/sort controls and redesigns selection mode for cleaner, more intuitive behavior on both mobile and desktop.

## Goals
- Prevent top-toolbar wrapping/clutter on mobile.
- Keep desktop efficient while reducing control duplication.
- Make bulk selection mode discoverable and obvious.
- Keep list/grid view toggle always visible.

## Non-Goals
- No changes to query semantics or backend APIs.
- No changes to actual bulk action types (Later, Archive, Delete).

## Confirmed Product Decisions

### Search / Filter / Sort / View
- Keep **view toggle (list/grid)** always visible on desktop and mobile.
- Move **Type** and **Sort** controls into a single **Filter** control.
- Desktop:
  - Keep inline search input.
  - Replace separate type/sort controls with one filter control.
- Mobile:
  - Replace inline search with a search icon trigger.
  - Search opens an expanded search input row.
  - Use one filter control for type + sort.

### Selection Mode
- Entry should be an explicit visible toolbar control (not hidden in title dropdown).
- Add a visible **Select** button with an **empty checkbox icon** (Gmail-like affordance).
- Remove selection-mode entry/action items from title dropdown.
- In selection mode:
  - Show a dedicated selection state UI.
  - Keep selection actions grouped under a single **Actions** menu for scalability.
  - Desktop: top contextual action bar with scope controls + actions menu.
  - Mobile: top contextual state + sticky bottom actions menu.

### Selection Scope Wording
- Use compact mutually exclusive scope toggles in selection mode:
  - `Visible` (or `Visible (N)` when helpful)
  - `All matching (N)`
- Active toggle indicates current selection scope.
- Avoid separate scope-label text to reduce clutter.
- Use `None` for deselect-all action (while staying in selection mode), and `Cancel` to exit selection mode.

### Why This Path
- Reduces cognitive load by replacing verbose scope text with explicit segmented-like toggles.
- Keeps batch operations scalable without consuming horizontal space as actions grow.
- Matches user mental model from Gmail-style selection UX while preserving Focus Reader-specific actions.
- Avoids false “already selected” signal by using an empty checkbox icon for entering selection mode.
- Separates semantics clearly: `None` (clear selection) vs `Cancel` (exit mode).

## “Filter Badge” Clarification
The filter button may show an optional numeric badge for active non-default options:
- `+1` when type is not "All Types".
- `+1` when sort field/direction differs from default (`saved_at desc`).
- Total shown as count (for example `2`).

This badge is optional in v1; recommended for discoverability.

## Target UX

### Default Mode (Desktop)
- Left group:
  - Sidebar-open button (when collapsed)
  - Title selector (`Inbox`, etc.)
  - Select button (icon only)
- Center/right group:
  - Inline search input
  - Filter button (opens menu/sheet-like panel)
  - View toggle (list/grid)
  - Right-panel open button (desktop only, existing behavior)

### Default Mode (Mobile)
- Row 1:
  - Sidebar-open button (when collapsed)
  - Title selector
  - Select button (icon only)
  - Search icon button
  - Filter button
  - View toggle
- Row 2 (only when search expanded):
  - Full-width search input

### Selection Mode (Desktop)
- Replace normal toolbar controls with contextual selection bar:
  - Selected count (`N selected`)
  - Scope toggles: `Visible` / `All matching (N)` (mutually exclusive)
  - `None` (clear selected IDs but stay in selection mode)
  - Split-style `Actions` control with menu containing `Move to Later`, `Move to Archive`, `Delete`
  - `Cancel` (exit selection mode)

### Selection Mode (Mobile)
- Top bar simplified:
  - `N selected`
  - `Cancel`
  - Compact scope toggles + `None`
- Sticky bottom action bar:
  - Single split-style `Actions` menu (Later, Archive, Delete)

## Interaction Rules
- Enter selection mode by tapping visible `Select` button.
- Exit selection mode by `Cancel` button.
- Selection actions disabled when `selectedCount === 0` or mutation in progress.
- Keep existing `allVisibleSelected` / `allMatchingSelected` semantics.
- Keep existing keyboard shortcuts on desktop; no mobile-specific shortcut hints in tooltip UI.

## Information Architecture Changes
- Title dropdown should only contain title/context options.
- Remove bulk-mode actions and entry from title dropdown.
- Filter control owns:
  - Type selection
  - Sort field
  - Sort direction

## Technical Implementation Plan

### Primary Files
- `apps/web/src/components/documents/document-list-toolbar.tsx`
- `apps/web/src/components/search/search-bar.tsx` (if expansion/compact mode is needed)
- `apps/web/src/hooks/use-mobile.ts` (reuse existing breakpoint hook)
- Optional helper extraction if toolbar gets too large:
  - `document-list-filter-menu.tsx`
  - `document-selection-bar.tsx`
  - `document-selection-mobile-actions.tsx`

### Implementation Steps
1. Refactor toolbar state model in `DocumentListToolbar`:
   - Add local `mobileSearchOpen` state.
   - Add explicit Select button UI in default mode.
   - Remove selection entry/actions from title dropdown.
2. Consolidate filter + sort into one filter control:
   - Build one menu content that includes type + sort field + sort direction.
   - Keep current callbacks (`onTypeFilter`, `onSortByChange`, `onSortDirChange`).
3. Rework selection mode rendering:
   - Desktop contextual top action bar + unified Actions menu.
   - Mobile top mini bar + sticky bottom Actions menu.
4. Keep view toggle always visible in default mode (desktop/mobile).
5. Verify right-panel toggle remains desktop-only and non-overlapping.
6. Add/adjust tests for toolbar behavior by mode:
   - default vs selection mode
   - mobile vs desktop rendering (hook-mocked)
   - action enable/disable states

## Acceptance Criteria
- Mobile toolbar no longer wraps into cluttered two-line control groups in default state.
- Type and sort are only accessible via a single filter control.
- View toggle remains visible in default mode on both desktop and mobile.
- Selection mode is entered via a visible Select button.
- Bulk actions are no longer hidden behind title dropdown.
- Mobile selection actions are reachable via sticky bottom bar.
- Desktop remains efficient for keyboard/mouse workflows.
