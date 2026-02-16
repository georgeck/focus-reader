# Product Specification: Browser Extension

**Version:** 1.0
**Date:** February 15, 2026
**Status:** Draft

---

## 1. Overview

### 1.1 Problem Statement

The current Focus Reader browser extension is minimal — it can save a page as an article or bookmark, optionally tag it, and configure an API key. It lacks the polish and feature depth expected of a modern read-it-later extension: there is no indication of whether a page is already saved, no context menu integration, no keyboard shortcut beyond a single save command, and no way to manage saved content without opening the full web app.

### 1.2 Product Vision

Transform the extension from a basic save tool into a lightweight companion that surfaces Focus Reader functionality at the point of content discovery. The user should be able to save, tag, annotate, and triage content without leaving the current page.

> **Reference:** This spec extends Section 6.9 of the [Focus Reader PRD](./focus-reader-prd.md) which defines the browser extension as P1 priority.

### 1.3 Goals

- Show whether the current page is already saved and surface its metadata.
- Provide quick triage actions (star, archive, mark read, add to collection) from the popup.
- Add context menu and additional keyboard shortcuts for faster workflows.
- Display a badge on the extension icon reflecting saved/unread status.
- Support a side panel mode for persistent access while browsing.
- Lay groundwork for on-page highlight rendering in a future phase.

### 1.4 Non-Goals

- Full reading view inside the extension (the web app serves this role).
- Social or collaborative annotation features.
- Offline save queue or service-worker caching of articles.
- Mobile browser support (no extension APIs on mobile).

---

## 2. Target User

The same single power user described in the main PRD — someone who saves 5–30 articles per day from the browser, values keyboard-driven workflows, and wants to triage content quickly without context-switching to the web app.

---

## 3. Architecture

### 3.1 High-Level Architecture

```
┌──────────────────────────────────────────────────────┐
│                   Browser Extension                  │
│                                                      │
│  ┌──────────┐  ┌────────────┐  ┌───────────────────┐ │
│  │  Popup   │  │ Side Panel │  │  Content Script   │ │
│  │  (React) │  │  (React)   │  │  (page-level DOM) │ │
│  └────┬─────┘  └─────┬──────┘  └────────┬──────────┘ │
│       │              │                  │            │
│       └──────────────┼──────────────────┘            │
│                      │ chrome.runtime messages       │
│              ┌───────┴────────┐                      │
│              │  Background    │                      │
│              │  Service Worker│                      │
│              └───────┬────────┘                      │
└──────────────────────┼───────────────────────────────┘
                       │ fetch (Bearer token)
                       ▼
              ┌──────────────────┐
              │  Focus Reader    │
              │  REST API        │
              └──────────────────┘
```

### 3.2 Component Responsibilities

| Component          | Role                                                                                                                  |
|--------------------|-----------------------------------------------------------------------------------------------------------------------|
| **Popup**          | Primary quick-save UI shown on icon click. Displays page status, save/triage actions, tag picker.                     |
| **Side Panel**     | Persistent panel (Chrome `sidePanel` API) for browsing saved content without leaving the page.                        |
| **Background**     | Service worker that handles all API calls, caches page status, manages badge, and listens for commands/context menus. |
| **Content Script** | Captures page HTML on demand; future: renders highlights on saved pages.                                              |
| **Options**        | Settings page for API URL, API key, and preferences.                                                                  |

### 3.3 Technology Stack

| Technology               | Rationale                                                                |
|--------------------------|--------------------------------------------------------------------------|
| WXT                      | Already in use; provides HMR, cross-browser builds, manifest generation. |
| React + TypeScript       | Consistent with web app; shared type knowledge.                          |
| Tailwind CSS             | Consistent styling with web app; compact bundle for extension.           |
| `@webext-core/messaging` | Type-safe message passing between scripts (see Margin's pattern).        |
| `browser.storage.sync`   | Already in use for API config; extend for user preferences.              |

---

## 4. Current State (Baseline)

The extension currently implements:

| Feature                                                   | Status   |
|-----------------------------------------------------------|----------|
| Popup with "Save as Article" / "Save as Bookmark" buttons | Complete |
| Tag picker in popup                                       | Complete |
| HTML capture via content script                           | Complete |
| Background script with `Alt+Shift+S` command              | Complete |
| Options page (API URL + API key config)                   | Complete |
| API client with Bearer auth                               | Complete |
| Connection test on options page                           | Complete |

---

## 5. Feature Specifications

### 5.1 Page Status Detection

**Priority:** P0 (Critical)

**Description:** When the popup opens, check whether the current page URL is already saved in Focus Reader and display its status.

**Functional Requirements:**

- On popup open, call `GET /api/documents?url={currentUrl}&limit=1` to check if the document exists.
- If saved, display:
  - Document title (from server, may differ from tab title).
  - Saved date.
  - Current location (inbox / later / archive).
  - Star and read status indicators.
  - "Open in Reader" button linking to the web app's reading view.
- If not saved, show the current save UI (article / bookmark buttons).
- Cache the lookup result in the background script for the active tab to avoid repeated API calls on popup re-open. Invalidate on save or tab URL change.

**API Endpoint (new):**

> If `GET /api/documents` does not support URL-based lookup, add a query parameter:
> `GET /api/documents?url=<encoded-url>&limit=1`
> Returns matching documents or empty array.

### 5.2 Quick Triage Actions

**Priority:** P0 (Critical)

**Description:** When a page is already saved, the popup shows action buttons so the user can triage without opening the web app.

**Functional Requirements:**

- **Star / Unstar** — Toggle `is_starred` via `PATCH /api/documents/:id`.
- **Archive** — Move to archive via `PATCH /api/documents/:id` with `{ location: "archive" }`.
- **Mark as read / unread** — Toggle `is_read` via `PATCH /api/documents/:id`.
- **Add to Collection** — Open a collection picker (list from `GET /api/collections`) and add via `POST /api/collections/:id/documents`.
- **Delete** — Remove document via `DELETE /api/documents/:id` with confirmation.
- All actions update the cached status and reflect immediately in the popup.

### 5.3 Enhanced Popup UI

**Priority:** P0 (Critical)

**Description:** Redesign the popup to be richer and more informative, inspired by Margin's tabbed popup layout.

**Layout (400px wide):**

```
┌──────────────────────────────────────┐
│  Focus Reader          [settings ⚙]  │
├──────────────────────────────────────┤
│  ┌──────────────────────────────────┐│
│  │ 🌐 Page Title                   ││
│  │    example.com  ·  Saved 2h ago ││
│  │              [👁 Open] [🔖 Save]││
│  └──────────────────────────────────┘│
│                                      │
│  ┌──────────────────────────────────┐│
│  │ Add a note...                    ││
│  │                                  ││
│  │  [⊘ Tags...]           [Save]   ││
│  └──────────────────────────────────┘│
│                                      │
│  ┌ Actions ─────────────────────────┐│
│  │ ☆ Star  📖 Read  📥 Archive     ││
│  │ 📁 Collection          🗑 Delete ││
│  └──────────────────────────────────┘│
│                                      │
│  [Open Focus Reader ↗]              │
└──────────────────────────────────────┘
```

**States:**

| State          | Display                                                                                             |
|----------------|-----------------------------------------------------------------------------------------------------|
| Not configured | "Extension not configured" + Open Settings button (current behavior).                               |
| Loading        | Skeleton/spinner while checking page status.                                                        |
| Page not saved | Page info card + "Save as Article" / "Save as Bookmark" buttons + tag picker + optional note field. |
| Page saved     | Page info card with saved metadata + triage action buttons + "Open in Reader" link.                 |
| Saving         | Button disabled with spinner.                                                                       |
| Error          | Inline error message with retry option.                                                             |

### 5.4 Notes on Save

**Priority:** P1 (High)

**Description:** Allow the user to add a short note when saving a page. The note is stored as the document's `description` field or as a highlight/annotation.

**Functional Requirements:**

- Optional textarea in the popup below the page info card.
- Placeholder: "Add a note..."
- Sent as part of the save request body: `{ ..., note: "user text" }`.
- The API stores the note in the `description` field of the document.

> **Design decision:** We use the existing `description` field rather than creating a separate notes system. This keeps the extension simple and the note is visible in the web app's document metadata.

### 5.5 Context Menus

**Priority:** P1 (High)

**Description:** Right-click context menus for saving content without opening the popup.

**Menu Items:**

| Context   | Menu Item                   | Action                                                                                                      |
|-----------|-----------------------------|-------------------------------------------------------------------------------------------------------------|
| Page      | Save page to Focus Reader   | Save current page as article.                                                                               |
| Page      | Save as bookmark            | Save current page as bookmark.                                                                              |
| Selection | Save selection as highlight | Save selected text as a highlight on the current document. Creates the document first if not already saved. |
| Link      | Save link to Focus Reader   | Save the linked URL as an article (fetches content server-side).                                            |

**Behavior:**

- After saving via context menu, show a browser notification ("Saved to Focus Reader" or "Page bookmarked").
- If the user is not authenticated (no API key configured), show a notification directing them to the options page.

### 5.6 Keyboard Shortcuts

**Priority:** P1 (High)

**Description:** Additional keyboard shortcuts beyond the existing `Alt+Shift+S`.

| Shortcut      | Action                        | Command Name                        |
|---------------|-------------------------------|-------------------------------------|
| `Alt+Shift+S` | Save current page as article  | `save-page` (existing)              |
| `Alt+Shift+B` | Save current page as bookmark | `save-bookmark`                     |
| `Alt+Shift+D` | Open popup                    | `_execute_action` (browser default) |

> **Note:** Chrome limits extensions to 4 keyboard shortcuts. We define the most essential ones and allow the user to customize via `chrome://extensions/shortcuts`.

### 5.7 Badge Indicator

**Priority:** P2 (Medium)

**Description:** Show a visual indicator on the extension icon when the current page is already saved.

**Functional Requirements:**

- When navigating to a page that is already saved in Focus Reader, show a small colored dot or checkmark badge on the icon.
- Badge color: primary blue (`#6366f1`) to indicate "saved".
- Clear badge when navigating to an unsaved page.
- Check is performed in the background script on `tabs.onUpdated` (when URL changes) and `tabs.onActivated` (when switching tabs).
- Use cached lookup results to avoid excessive API calls; cache TTL: 60 seconds.

### 5.8 Side Panel

**Priority:** P2 (Medium)

**Description:** A persistent side panel (Chrome `sidePanel` API) that shows the user's reading list and allows triage without leaving the current page.

**Functional Requirements:**

- Open via keyboard shortcut or context menu "Open Focus Reader sidebar".
- Displays a compact list of recent documents from inbox (default), with tabs/filters for: Inbox, Later, Starred.
- Each item shows: title, domain, saved date, read/star indicators.
- Click an item to open it in a new tab (web app reading view).
- Quick actions per item: star, archive, delete (swipe or icon buttons).
- Updates when the user switches browser tabs (detects current URL, highlights if saved).
- Uses the same API client and auth as the popup.

> **Browser compatibility:** Chrome supports `sidePanel` API natively. Firefox supports `sidebar_action`. The WXT framework handles the abstraction. Safari does not support side panels.

### 5.9 Save Link from Context Menu

**Priority:** P2 (Medium)

**Description:** Right-click a link on any page and save the linked URL to Focus Reader without navigating to it.

**Functional Requirements:**

- Context menu item appears on all `<a>` elements: "Save link to Focus Reader".
- Sends `POST /api/documents` with `{ url: linkUrl, type: "article" }`.
- The server fetches and parses the content (existing server-side ingestion).
- Show browser notification on success/failure.

### 5.10 On-Page Highlight Overlay

**Priority:** P3 (Future)

**Description:** Render the user's highlights and annotations directly on saved pages, similar to Margin's content script overlay.

**Functional Requirements (future phase):**

- When visiting a saved page, fetch its highlights from the API.
- Render highlight underlines using the CSS Highlight API (with fallback to `<mark>` wrapping).
- Click a highlight to see the note in a small popover.
- Selection-based highlight creation: select text, choose color, save.
- Uses Shadow DOM for style isolation.
- Toggleable via settings ("Show highlights on pages").

> **Design decision:** This is deferred to a future phase because it requires the text-matching infrastructure (similar to Margin's `DOMTextMatcher`) and careful handling of dynamic pages. The simpler features (popup, context menus, side panel) deliver immediate value.

---

## 6. Messaging Protocol

All API calls are routed through the background service worker. The popup, side panel, and content script communicate with the background via typed messages.

| Message           | Sender          | Params                                  | Response                 |
|-------------------|-----------------|-----------------------------------------|--------------------------|
| `checkPageStatus` | popup/sidepanel | `{ url: string }`                       | `Document \| null`       |
| `savePage`        | popup/sidepanel | `{ url, html?, type, tagIds?, note? }`  | `{ success, document? }` |
| `captureHtml`     | background      | —                                       | `{ html: string }`       |
| `updateDocument`  | popup/sidepanel | `{ id, patch }`                         | `{ success }`            |
| `deleteDocument`  | popup/sidepanel | `{ id }`                                | `{ success }`            |
| `getTags`         | popup           | —                                       | `Tag[]`                  |
| `getCollections`  | popup/sidepanel | —                                       | `Collection[]`           |
| `addToCollection` | popup/sidepanel | `{ collectionId, documentId }`          | `{ success }`            |
| `getDocuments`    | sidepanel       | `{ location?, limit? }`                 | `Document[]`             |
| `getHighlights`   | content         | `{ documentId }`                        | `Highlight[]`            |
| `createHighlight` | content         | `{ documentId, text, color, selector }` | `{ success }`            |

> **Implementation:** Use `@webext-core/messaging` with a `defineExtensionMessaging` protocol map for type safety, following Margin's pattern.

---

## 7. Storage Schema

Extends the existing `browser.storage.sync` usage.

| Key               | Type                            | Default     | Description                                     |
|-------------------|---------------------------------|-------------|-------------------------------------------------|
| `apiUrl`          | `string`                        | `""`        | Focus Reader instance URL.                      |
| `apiKey`          | `string`                        | `""`        | API bearer token.                               |
| `overlayEnabled`  | `boolean`                       | `true`      | Show highlights on pages (not yet implemented). |
| `theme`           | `"light" \| "dark" \| "system"` | `"system"`  | Extension UI theme.                             |
| `defaultSaveType` | `"article" \| "bookmark"`       | `"article"` | Default save mode.                              |

---

## 8. Phased Rollout

### Enhanced Popup & Context Menus (Implemented)

**Deliverables:**

- Redesigned popup with page status detection (5.1, 5.3).
- Quick triage actions for saved pages (5.2).
- Notes on save (5.4).
- Context menus: save page, save as bookmark, save link (5.5, 5.9).
- Additional keyboard shortcut for bookmark (5.6).
- Badge indicator for saved pages (5.7).
- Migrate to `@webext-core/messaging` for typed message passing (6).
- Add Tailwind CSS to extension for consistent styling.

**Success Criteria:**
- Popup shows saved/unsaved status within 500ms of opening.
- All triage actions work without opening the web app.
- Context menu save completes with notification feedback.

### Side Panel (Not Yet Implemented)

**Deliverables:**

- Chrome side panel with reading list view (5.8).
- Firefox sidebar equivalent.
- Tab-aware updates (current page detection).
- Quick triage from side panel.

**Success Criteria:**
- Side panel opens and displays documents within 1s.
- Switching browser tabs updates the panel's "current page" indicator.

### On-Page Highlights (Not Yet Implemented)

**Deliverables:**

- Content script highlight overlay (5.10).
- Text matching and range mapping.
- Selection-based highlight creation.
- Shadow DOM isolation.
- Overlay toggle in settings.

**Success Criteria:**
- Highlights render correctly on 90%+ of saved pages.
- Highlight creation works via text selection.
- No visual interference with page content.

---

## 9. Technical Considerations

### 9.1 Performance

- **Badge checks:** Debounce `tabs.onUpdated` events; cache results per URL with 60s TTL.
- **Popup speed:** Pre-check page status in background on tab change so the popup opens with data immediately.
- **Side panel:** Paginate document list; only fetch visible items.

### 9.2 Security

- API key stored in `browser.storage.sync` (encrypted by the browser, synced across devices).
- All API calls use HTTPS with Bearer token.
- Content script does not execute arbitrary code from the API.
- Context menus require `activeTab` permission (no persistent host access needed for basic features).

### 9.3 Cross-Browser Compatibility

| Feature           | Chrome                | Firefox               | Safari                   |
|-------------------|-----------------------|-----------------------|--------------------------|
| Popup             | MV3                   | MV3                   | MV3 (limited)            |
| Side Panel        | `sidePanel` API       | `sidebar_action`      | Not supported            |
| Context Menus     | `contextMenus`        | `menus`               | `contextMenus`           |
| Badge             | `action.setBadgeText` | `action.setBadgeText` | `action.setBadgeText`    |
| CSS Highlight API | Supported             | Supported             | Supported                |
| `storage.sync`    | Supported             | Supported             | `storage.local` fallback |

> WXT abstracts most of these differences. The side panel is the only feature requiring platform-specific code.

### 9.4 Bundle Size

- Target: < 200KB total (popup + background + content script).
- Tailwind CSS with purging keeps styles minimal.
- React is shared across popup and side panel via WXT's chunk splitting.

---

## 10. API Dependencies

The extension relies on these existing API endpoints:

| Endpoint                              | Used By                                                |
|---------------------------------------|--------------------------------------------------------|
| `GET /api/documents?url=<url>`        | Page status detection (may need new `url` query param) |
| `POST /api/documents`                 | Save page/bookmark                                     |
| `PATCH /api/documents/:id`            | Star, read, archive, update description                |
| `DELETE /api/documents/:id`           | Delete document                                        |
| `GET /api/tags`                       | Tag picker                                             |
| `GET /api/collections`                | Collection picker                                      |
| `POST /api/collections/:id/documents` | Add to collection                                      |
| `GET /api/documents`                  | Side panel list                                        |
| `GET /api/documents/:id/highlights`   | On-page highlights (not yet implemented in extension)  |
| `POST /api/documents/:id/highlights`  | Create highlight (not yet implemented in extension)    |

> **New endpoint needed:** `GET /api/documents?url=<encoded-url>` — filter documents by source URL. This may already work if the existing list endpoint supports URL filtering; otherwise, add it as a query parameter.

---

## 11. References

- [Focus Reader PRD, Section 6.9](./focus-reader-prd.md) — Original browser extension requirements.
- [Margin browser extension](https://margin.at) — Reference implementation for popup UI, context menus, side panel, and content script overlay patterns.
- [WXT Framework](https://wxt.dev) — Extension build tooling already in use.
- [CSS Highlight API](https://developer.mozilla.org/en-US/docs/Web/API/CSS_Custom_Highlight_API) — Modern standard for text highlighting without DOM mutation.
