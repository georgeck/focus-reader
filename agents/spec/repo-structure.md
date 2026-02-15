# Repository Structure Specification: Focus Reader Monorepo

**Version:** 1.1  
**Date:** February 15, 2026  
**Status:** Current implementation snapshot

---

## 1. Overview

This document describes the repository structure that is currently implemented in `focus-reader/`.

Focus Reader is a PNPM workspace monorepo with Turborepo task orchestration. It contains:

- Shared TypeScript packages for data model, parsing, DB access, and business logic
- Deployable Cloudflare apps (web app, email worker, RSS worker)
- A browser extension app (WXT)
- Agent/spec/planning documentation under `agents/`

### 1.1 Why this structure

The monorepo enables:

- Atomic changes across schema, query helpers, API logic, and UI
- Shared runtime logic across workers and web API routes
- Single install/build/test workflow for all workspaces

---

## 2. Current Directory Layout

```text
focus-reader/
├── apps/
│   ├── web/                    # Next.js 15 app deployed via OpenNext Cloudflare
│   ├── email-worker/           # Cloudflare Email Worker (inbound email ingestion)
│   ├── rss-worker/             # Cloudflare Worker (scheduled RSS polling)
│   └── extension/              # Browser extension (WXT + React)
├── packages/
│   ├── shared/                 # Types, constants, utility helpers
│   ├── db/                     # D1 migrations + typed query helpers
│   ├── parser/                 # Email/article/RSS/PDF parsing + sanitization
│   └── api/                    # Business logic used by web API routes
├── scripts/
│   ├── ingest-local.ts         # Local .eml ingestion harness (Miniflare)
│   └── sync-secrets.sh         # Writes shared env vars into app .dev.vars files
├── agents/
│   ├── spec/
│   └── plans/
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
├── tsconfig.base.json
└── .npmrc
```

---

## 3. Root Workspace Configuration

### 3.1 `pnpm-workspace.yaml`

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

### 3.2 Root `package.json`

Current root scripts:

```json
{
  "scripts": {
    "build": "turbo run build",
    "dev": "turbo run dev",
    "test": "turbo run test",
    "typecheck": "turbo run typecheck",
    "db:migrate": "pnpm --filter @focus-reader/db run migrate",
    "clean": "turbo run clean && rm -rf node_modules"
  }
}
```

Other important root settings:

- `packageManager`: `pnpm@10.6.2`
- `engines.node`: `>=20.0.0`
- No root `lint` script currently

### 3.3 `turbo.json`

```json
{
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**", ".output/**"]
    },
    "typecheck": { "dependsOn": ["^build"] },
    "test": { "dependsOn": ["^build"] },
    "dev": { "persistent": true, "cache": false },
    "clean": { "cache": false }
  }
}
```

### 3.4 `.npmrc`

```ini
strict-peer-dependencies=true
shamefully-hoist=false
```

### 3.5 Shared TypeScript config (`tsconfig.base.json`)

- `target`: `ES2022`
- `module`: `ESNext`
- `moduleResolution`: `bundler`
- strict mode enabled globally

---

## 4. Shared Packages (`packages/`)

All internal packages are private and consumed via `workspace:*`/`workspace:^`.

### 4.1 `packages/shared` (`@focus-reader/shared`)

Purpose:

- Core types (`Document`, `Feed`, `Subscription`, etc.)
- Constants (`DOCUMENT_TYPES`, `CHANNEL_TYPES`, retry limits, paging defaults)
- Utilities: URL normalization, slug/display-name conversion, reading-time helpers
- Auto-tag rule evaluation utilities

Build/test:

- Bundling: `tsup` (ESM + d.ts)
- Tests: Vitest (Node)

### 4.2 `packages/db` (`@focus-reader/db`)

Purpose:

- Canonical D1 migrations
- Typed query helpers for all entities
- Schema/table constants

Current migrations:

- `0001_initial_schema.sql`
- `0002_fts5_search.sql`
- `0003_highlight_collection_indexes.sql`

Important query modules include:

- `documents`, `email-meta`, `pdf-meta`, `attachments`
- `subscriptions`, `feeds`, `tags`, `highlights`
- `search`, `saved-views`, `api-keys`, `denylist`, `ingestion-log`

Build/test:

- Bundling: `tsup`
- Extra export: `./migration-sql`
- Tests: Vitest + `@cloudflare/vitest-pool-workers`
- Migration script: `wrangler d1 migrations apply FOCUS_DB --local`

### 4.3 `packages/parser` (`@focus-reader/parser`)

Purpose:

- Email parsing (`postal-mime`) and dedup helpers
- Article extraction (`@mozilla/readability`)
- RSS/Atom/JSON Feed fetch + OPML import/export
- PDF metadata/text extraction helpers
- HTML sanitization + HTML-to-Markdown conversion

Implementation note:

- Current sanitizer is a manual allowlist DOM walker using `linkedom` (`src/sanitize.ts`)
- `dompurify` is present as a dependency but is not currently used in sanitizer runtime code

Build/test:

- Bundling: `tsup`
- Tests: Vitest (Node) with parser fixtures

### 4.4 `packages/api` (`@focus-reader/api`)

Purpose:

- Business logic consumed by web route handlers
- Authentication helper logic (Cloudflare Access + API key)

Current modules include:

- `documents`, `subscriptions`, `feeds`, `tags`
- `highlights`, `search`, `saved-views`, `api-keys`
- `denylist`, `auth`

Build/test:

- Bundling: `tsup`
- Tests: Vitest (`--passWithNoTests` script enabled, but tests exist)

---

## 5. Applications (`apps/`)

### 5.1 `apps/web` (`focus-reader-web`)

Runtime and deployment:

- Next.js 15 App Router + React 19
- Deployed with `@opennextjs/cloudflare`
- Cloudflare Worker entry generated at `.open-next/worker.js`

Key config files:

- `next.config.ts` uses `initOpenNextCloudflareForDev()` with shared persist path
- `open-next.config.ts` enables R2 incremental cache override
- `wrangler.toml` binds D1/R2 and `NEXT_INC_CACHE_R2_BUCKET`

App route groups:

- Reader views: `/inbox`, `/later`, `/archive`, `/all`, `/starred`
- Filtered resource views: `/subscriptions/[id]`, `/feeds/[id]`, `/tags/[id]`, `/views/[id]`
- Settings: `/settings/*` (email, subscriptions, feeds, denylist, API keys, ingestion log)

API route handlers currently implemented under `src/app/api`:

- `documents`, `documents/upload`, `documents/[id]`, `documents/[id]/content`, `documents/[id]/tags`, `documents/[id]/highlights`
- `highlights`, `highlights/[id]`, `highlights/[id]/tags`
- `subscriptions`, `subscriptions/[id]`, `subscriptions/[id]/tags`
- `feeds`, `feeds/[id]`, `feeds/[id]/tags`, `feeds/import`, `feeds/export`
- `tags`, `tags/[id]`
- `saved-views`, `saved-views/[id]`
- `api-keys`, `api-keys/[id]`
- `denylist`, `denylist/[id]`
- `search`, `settings`, `ingestion-log`

Testing:

- Vitest in Node environment for API route tests (`src/__tests__/api`)

### 5.2 `apps/email-worker` (`focus-reader-email-worker`)

Purpose:

- Handles inbound emails via Cloudflare Email Routing
- Runs parse -> dedup -> validate -> sanitize -> CID upload -> markdown conversion -> D1 persist

Current characteristics:

- Uses `FOCUS_DB` (D1) and `FOCUS_STORAGE` (R2)
- Uses `EMAIL_DOMAIN` and `COLLAPSE_PLUS_ALIAS` env vars
- Build script uses `wrangler deploy --dry-run --outdir dist`

Testing:

- Vitest + `@cloudflare/vitest-pool-workers`
- Miniflare config includes D1 + R2

### 5.3 `apps/rss-worker` (`focus-reader-rss-worker`)

Purpose:

- Scheduled polling of active feeds
- Creates RSS documents, applies feed auto-tag rules, inherits feed tags, logs ingestion outcomes

Current characteristics:

- Uses `FOCUS_DB` (D1)
- Cron trigger currently: `0 */12 * * *`
- Marks feeds inactive after repeated errors (logic in worker source)

Testing:

- Vitest + `@cloudflare/vitest-pool-workers`

### 5.4 `apps/extension` (`focus-reader-extension`)

Runtime and tooling:

- WXT-based browser extension with React (`@wxt-dev/module-react`)
- Build output under `.output/`

Current source layout:

- `src/entrypoints/background.ts`
- `src/entrypoints/content.ts`
- `src/entrypoints/popup/*`
- `src/entrypoints/options/*`
- `src/lib/api-client.ts`

Current integration model:

- Stores API URL/API key in extension storage
- Calls Focus Reader REST API over HTTP (`Authorization: Bearer <key>`)
- Does not currently import internal monorepo packages

---

## 6. Dependency Graph (Current)

```text
@focus-reader/shared
  ├─> @focus-reader/db
  │     ├─> @focus-reader/api
  │     │     └─> apps/web
  │     ├─> apps/email-worker
  │     └─> apps/rss-worker
  └─> @focus-reader/parser
        ├─> @focus-reader/api
        ├─> apps/email-worker
        └─> apps/rss-worker

apps/extension (HTTP client to web API; no internal package deps today)
```

Notes:

- `apps/web` directly depends on `@focus-reader/shared`, `@focus-reader/db`, `@focus-reader/api`
- `apps/web` does not currently declare a direct dependency on `@focus-reader/parser`

---

## 7. Cloudflare Bindings and Runtime Resources

### 7.1 Shared bindings

| Binding | Type | Used by |
|---|---|---|
| `FOCUS_DB` | D1 | web, email-worker, rss-worker, db migration tooling |
| `FOCUS_STORAGE` | R2 | web, email-worker |

### 7.2 Web-only binding

| Binding | Type | Purpose |
|---|---|---|
| `NEXT_INC_CACHE_R2_BUCKET` | R2 | OpenNext incremental cache |

### 7.3 Important env vars in active code paths

- `EMAIL_DOMAIN`
- `COLLAPSE_PLUS_ALIAS`
- `OWNER_EMAIL`
- `CF_ACCESS_TEAM_DOMAIN`
- `CF_ACCESS_AUD`

---

## 8. Build, Dev, and Task Pipeline

### 8.1 Root commands

```bash
pnpm build
pnpm dev
pnpm test
pnpm typecheck
pnpm db:migrate
```

### 8.2 Per-workspace highlights

- Packages (`shared`, `db`, `parser`, `api`) use `tsup` for builds
- `apps/web` uses `next build`
- Worker apps use Wrangler dry-run deploy for build artifacts
- `apps/extension` uses WXT (`wxt build`, `wxt` for dev)

### 8.3 Turbo behavior

- `build` runs in dependency order (`^build`)
- `test` and `typecheck` also depend on `^build`
- `dev` is non-cached and persistent

---

## 9. Testing Strategy (Current)

| Workspace | Runner | Environment |
|---|---|---|
| `packages/shared` | Vitest | Node |
| `packages/parser` | Vitest | Node |
| `packages/api` | Vitest | Node |
| `packages/db` | Vitest + workers pool | workerd (D1) |
| `apps/web` | Vitest | Node |
| `apps/email-worker` | Vitest + workers pool | workerd (D1 + R2) |
| `apps/rss-worker` | Vitest + workers pool | workerd (D1) |
| `apps/extension` | Vitest | Node |

Version constraint in workspace scripts/deps:

- `vitest` pinned to `~3.2.0`

---

## 10. Local Development and Persistence

### 10.1 Typical local app startup

```bash
pnpm --filter focus-reader-web dev
pnpm --filter focus-reader-email-worker dev
pnpm --filter focus-reader-rss-worker dev
pnpm --filter focus-reader-extension dev
```

### 10.2 Local state persistence

- Web dev initializes OpenNext Cloudflare dev with persist path `../../.wrangler/state/v3`
- Email/RSS worker dev scripts use `wrangler dev --persist-to ../../.wrangler/state`
- `scripts/ingest-local.ts` uses Miniflare persistence rooted at `apps/email-worker/.wrangler/state`

### 10.3 Local secrets sync helper

`./scripts/sync-secrets.sh` writes shared values to:

- `apps/email-worker/.dev.vars`
- `apps/web/.dev.vars`

Variables written:

- `EMAIL_DOMAIN`
- `COLLAPSE_PLUS_ALIAS`
- `OWNER_EMAIL`

---

## 11. CI/CD and Deployment Status

Current repository state:

- No `.github/workflows` directory is committed right now
- Deployment is performed via workspace-specific Wrangler/OpenNext commands

Current deployment components:

- `apps/web` (OpenNext Cloudflare worker + assets)
- `apps/email-worker`
- `apps/rss-worker`

---

## 12. Spec Maintenance Notes

When updating this file, keep it implementation-aligned:

- Prefer reading actual workspace `package.json`, `wrangler.toml`, and app/package source trees
- Update dependency graphs when `workspace:*` relationships change
- Reflect route and API handler changes under `apps/web/src/app/api`
- Reflect any new migrations under `packages/db/migrations`

---

## 13. Relationship to Other Specs

- **`focus-reader-prd.md`**: Product scope and data model requirements
- **`email-newsletter-prd.md`**: Detailed email ingestion behavior
- **`focus-reader-ui-spec.md`**: UI architecture and interaction details for the web app

This document is the repository topology and tooling reference for implementing those specs.
