# Cloudflare & Local Development

## Bindings

| Binding         | Type        | Used By                            |
|-----------------|-------------|------------------------------------|
| `FOCUS_DB`      | D1 Database | email-worker, web, db (migrations) |
| `FOCUS_STORAGE` | R2 Bucket   | email-worker, web                  |

Environment variables:
- `EMAIL_DOMAIN` — Catch-all email subdomain (e.g., `read.yourdomain.com`)
- `COLLAPSE_PLUS_ALIAS` — `"true"` or `"false"`, controls plus-alias collapsing

## Starting Dev Servers

```bash
# Terminal 1: Web app (Next.js on port 3000)
pnpm --filter focus-reader-web dev

# Terminal 2: Email worker (optional, for testing email ingestion)
pnpm --filter focus-reader-email-worker dev
```

## Shared Local D1/R2 State

The web app and email worker share Cloudflare D1 and R2 bindings during local development:

- **Web app:** `apps/web/next.config.ts` calls `initOpenNextCloudflareForDev()` with `persist: { path: "../../.wrangler/state/v3" }`. The `apps/web/wrangler.toml` configures D1/R2 bindings and `[miniflare]` persist paths pointing to the same shared location.
- **Email worker:** `apps/email-worker/package.json` dev script uses `--persist-to ../../.wrangler/state`.

This means documents ingested by the email worker appear immediately in the web app's UI.

## Applying Migrations

```bash
# Apply migrations to the shared local D1
pnpm --filter @focus-reader/db wrangler d1 migrations apply focus-reader-db --local
```

Or use the `wrangler.toml` in `apps/web/` or `apps/email-worker/` which both reference `migrations_dir = "../../packages/db/migrations"`.

## Web App Bindings

Access via `@opennextjs/cloudflare`'s `getCloudflareContext()`:

```typescript
import { getCloudflareContext } from "@opennextjs/cloudflare";
const { env } = await getCloudflareContext();
const db: D1Database = env.FOCUS_DB;
const r2: R2Bucket = env.FOCUS_STORAGE;
```

**Important:** For local dev, `getCloudflareContext()` requires:
1. `initOpenNextCloudflareForDev()` called in `apps/web/next.config.ts` (top-level, before the config export)
2. A `apps/web/wrangler.toml` with D1/R2 bindings configured

Without both, all API routes will return 500 errors because bindings are undefined.

## D1 Constraints

- **Foreign keys are NOT enforced** in production. Implement cascading deletes at the application level.
