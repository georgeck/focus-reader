# Phase 1 Implementation Gaps (Revalidation)

**Date:** February 14, 2026
**Status:** Active tracking document
**Scope:** Gaps only for Phase 1 requirements defined in `agents/plans/phase-1-plan.md`

---

## 1. Open Gaps

### 1.1 Auth Enforcement Not Applied in API Routes

Auth utilities exist (`packages/api/src/auth.ts`) but route handlers do not enforce authentication yet. Per AGENTS.md: "No auth in Phase 1 (single-user app). Auth middleware planned for Phase 2+." The middleware intentionally allows all requests in dev/single-user mode. Deferred to Phase 2.

### 1.4 Keyboard Shortcuts — j/k Navigation Not Implemented

`j`/`k` (next/previous document) require sharing the document list state between `DocumentList` and `AppShell`. This needs a context/store refactor. Deferred — `s`, `m`, `e`, `f`, `Escape`, `[`, `]`, `Shift+H` are all implemented.

### 1.8 Web/API Test Coverage Gaps Remain

Phase 1 expected API route/business-logic tests are still missing. Web app has a placeholder test script. API package uses `--passWithNoTests`. Writing comprehensive tests for Next.js API routes with Cloudflare bindings requires mocking `getCloudflareContext()`.

---

## 2. Closed Since Prior Review

### 2.1 URL Save Extraction Pipeline Implemented

Now includes URL normalization, fetch, article extraction, metadata fallback, and dedup by normalized URL.

Evidence:
- `packages/api/src/documents.ts:61`

### 2.2 Metadata Extraction Module Added and Exported

Metadata extraction is implemented and exported from parser package.

Evidence:
- `packages/parser/src/metadata.ts:14`
- `packages/parser/src/index.ts:4`

### 2.3 Focus Mode Implemented

Focus mode state and UI behavior now wired in app shell and reader toolbar.

Evidence:
- `apps/web/src/contexts/app-context.tsx:16`
- `apps/web/src/components/layout/app-shell.tsx:38`
- `apps/web/src/components/reader/reader-toolbar.tsx:115`

### 2.4 API Surface Completed

All planned Step 7 routes now exist:
- `POST /api/subscriptions` — creates subscription with auto-generated pseudo email
- `DELETE /api/subscriptions/[id]?hard=true` — hard delete with cascade
- `POST /api/documents/[id]/tags` — add tag to document
- `DELETE /api/documents/[id]/tags` — remove tag from document
- `POST /api/subscriptions/[id]/tags` — add tag to subscription
- `DELETE /api/subscriptions/[id]/tags` — remove tag from subscription

Evidence:
- `apps/web/src/app/api/subscriptions/route.ts`
- `apps/web/src/app/api/subscriptions/[id]/route.ts`
- `apps/web/src/app/api/documents/[id]/tags/route.ts`
- `apps/web/src/app/api/subscriptions/[id]/tags/route.ts`

### 2.5 Tag Assignment Flow Fixed

Route handlers now intercept `addTagId`/`removeTagId` fields and route to dedicated tag functions instead of passing them to generic update queries. All PATCH routes whitelist allowed fields before passing to DB update functions, preventing SQL injection via unguarded dynamic field mapping.

Evidence:
- `apps/web/src/app/api/documents/[id]/route.ts` — handles addTagId/removeTagId, whitelists UpdateDocumentInput fields
- `apps/web/src/app/api/subscriptions/[id]/route.ts` — same pattern for subscriptions
- `apps/web/src/app/api/tags/[id]/route.ts` — whitelists UpdateTagInput fields
- `packages/api/src/tags.ts` — exports tagSubscription/untagSubscription

### 2.6 Keyboard Shortcuts Expanded

Added `s` (star/unstar), `m` (toggle read/unread), `e` (archive) shortcuts to AppShell. These operate on the currently viewed document in reading view.

Evidence:
- `apps/web/src/components/layout/app-shell.tsx`

### 2.7 Add-Content Entry Point Wired

Sidebar plus button now opens the AddBookmarkDialog.

Evidence:
- `apps/web/src/components/layout/nav-sidebar.tsx` — imports and renders AddBookmarkDialog

### 2.8 Settings Scope Completed

- Ingestion log page created with table of recent events (time, channel, status, error, attempts)
- Settings layout updated with "Ingestion Log" nav entry
- Email settings page now fetches and displays configured EMAIL_DOMAIN from env
- API route `/api/settings` returns emailDomain
- API route `/api/ingestion-log` returns recent ingestion events

Evidence:
- `apps/web/src/app/settings/ingestion-log/page.tsx`
- `apps/web/src/app/settings/layout.tsx`
- `apps/web/src/app/settings/email/page.tsx`
- `apps/web/src/app/api/settings/route.ts`
- `apps/web/src/app/api/ingestion-log/route.ts`

### 2.9 API Error Envelope Standardized

Error responses now use `{ error: { code, message } }` format. Client-side `apiFetch` handles both old and new formats.

Evidence:
- `apps/web/src/lib/api-helpers.ts`
- `apps/web/src/lib/api-client.ts`

---

## 3. Validation Snapshot

Latest verification run passes:

- `pnpm build`
- `pnpm typecheck`
- `pnpm test`

Note: Passing CI/build checks does not close the functional Phase 1 scope gaps listed above.
