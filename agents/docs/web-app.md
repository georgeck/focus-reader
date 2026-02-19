# Web App Architecture

The web app (`apps/web`) is a Next.js 15 App Router application deployed to Cloudflare Pages via `@opennextjs/cloudflare`.

## Key Patterns

- **Two-mode layout:** `AppShell` switches between Library View (sidebar + document list + right panel) and Reading View (TOC + content + right panel) based on `?doc=` search param
- **API routes** use `getDb()`/`getR2()` from `src/lib/bindings.ts` to access Cloudflare D1/R2 bindings, then create a `UserScopedDb` via `scopeDb(db, userId)` and call into `@focus-reader/api` business logic. All routes wrapped in `withAuth()` middleware which provides the authenticated `userId`
- **Client API calls** go through `apiFetch()` from `src/lib/api-client.ts` which handles JSON headers and error wrapping (`ApiClientError`)
- **Data fetching:** SWR (client-side), `useSWRInfinite` for paginated lists
- **State:** URL search params (`?doc=<id>` for reading view), React context for UI state
- **Keyboard shortcuts** registered via `useKeyboardShortcuts` hook; respects input focus (disabled in inputs/textareas)
- **Command palette** (`Cmd+K`) with navigation, actions (add URL, create collection, highlights, export), and settings commands
- **Article extraction** for bookmarks uses `@mozilla/readability` + linkedom in `packages/parser/src/article.ts`
- **Authentication:** `withAuth()` resolves the user via (in order): session cookie, CF Access JWT, API key bearer token, or single-user auto-auth. Returns `userId` which is used to create `UserScopedDb` for all downstream queries. Controlled by `AUTH_MODE` env var (`single-user` | `multi-user`)

## API Error Format

All API routes use a standardized error envelope:

```json
{ "error": { "code": "NOT_FOUND", "message": "Document not found" } }
```

Use `jsonError()` from `src/lib/api-helpers.ts` to create error responses. The client-side `apiFetch()` in `src/lib/api-client.ts` handles both old and new error formats.

## Features

- **Highlighting:** Text selection creates highlights with colors; highlights support notes and tags; notebook view in right sidebar; global highlights page
- **Collections:** Curated reading lists with drag-and-drop reordering (`@dnd-kit`); accessible from sidebar and command palette
- **Reading preferences:** Configurable font family, size, line height, content width; stored in `user_preferences` table; applied via dynamic inline styles
- **Data export:** Full JSON, single-document Markdown with YAML frontmatter, bulk ZIP, highlights Markdown, copy-as-Markdown
