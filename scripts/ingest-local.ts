/**
 * Local email ingestion script.
 * Reads a .eml file from disk, spins up a Miniflare instance with the
 * email worker, and invokes the email handler directly.
 *
 * Usage:
 *   pnpm tsx scripts/ingest-local.ts <path-to-eml-file>
 *   pnpm tsx scripts/ingest-local.ts <path-to-eml-file> --recipient user@read.example.com
 *
 * D1/R2 state persists in apps/email-worker/.wrangler/state/.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Miniflare } from "miniflare";

// Parse arguments
const args = process.argv.slice(2);
let emlPath: string | undefined;
let recipientOverride: string | undefined;

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--recipient" && args[i + 1]) {
    recipientOverride = args[i + 1];
    i++;
  } else if (!emlPath) {
    emlPath = args[i];
  }
}

if (!emlPath) {
  console.error(
    "Usage: pnpm tsx scripts/ingest-local.ts <path-to-eml-file> [--recipient addr@domain]"
  );
  process.exit(1);
}

const absolutePath = resolve(emlPath);
const emlBuffer = readFileSync(absolutePath);

// Parse basic headers for display
const emlText = emlBuffer.toString("utf-8");
const subjectMatch = emlText.match(/^Subject:\s*(.+)$/m);
const fromMatch = emlText.match(/^From:\s*(.+)$/m);
const toMatch = emlText.match(/^To:\s*(?:.*<)?([^>\s]+)>?/m);

const detectedRecipient = toMatch?.[1] || "unknown@read.example.com";
const recipient = recipientOverride || detectedRecipient;

console.log(`File: ${absolutePath} (${emlBuffer.byteLength} bytes)`);
console.log(`Subject: ${subjectMatch?.[1] || "(unknown)"}`);
console.log(`From: ${fromMatch?.[1] || "(unknown)"}`);
console.log(`To: ${recipient}${recipientOverride ? " (overridden)" : ""}`);
console.log();

const scriptDir = import.meta.dirname || resolve("scripts");
const repoRoot = resolve(scriptDir, "..");
const workerPath = resolve(repoRoot, "apps/email-worker/dist/index.js");
const persistDir = resolve(repoRoot, "apps/email-worker/.wrangler/state");
const migrationsPath = resolve(repoRoot, "packages/db/migrations/0001_initial_schema.sql");

async function main() {
  console.log("Starting Miniflare...");
  const mf = new Miniflare({
    modules: true,
    scriptPath: workerPath,
    compatibilityDate: "2026-02-13",
    compatibilityFlags: ["nodejs_compat"],
    d1Databases: { FOCUS_DB: "focus-reader-db" },
    r2Buckets: { FOCUS_STORAGE: "focus-reader-storage" },
    bindings: {
      EMAIL_DOMAIN: "level-up.dev",
      COLLAPSE_PLUS_ALIAS: "true",
    },
    d1Persist: persistDir,
    r2Persist: persistDir,
  });

  try {
    // Apply migrations via batch of prepared statements.
    // Make CREATE statements idempotent for repeat runs.
    const db = await mf.getD1Database("FOCUS_DB");
    const migrationSql = readFileSync(migrationsPath, "utf-8")
      .replace(/CREATE TABLE /g, "CREATE TABLE IF NOT EXISTS ")
      .replace(/CREATE INDEX /g, "CREATE INDEX IF NOT EXISTS ")
      .replace(/CREATE UNIQUE INDEX /g, "CREATE UNIQUE INDEX IF NOT EXISTS ");
    const statements = migrationSql
      .split(";")
      .map((s) => s.replace(/--.*$/gm, "").trim())
      .filter(Boolean);
    await db.batch(statements.map((s) => db.prepare(s)));
    console.log(`Migrations applied (${statements.length} statements).`);

    // Import the worker module and invoke its email handler
    const { default: emailWorker } = await import(workerPath);

    // Get bindings from Miniflare
    const bindings = await mf.getBindings();

    // Build ForwardableEmailMessage-like object
    const raw = new ReadableStream({
      start(controller: ReadableStreamDefaultController) {
        controller.enqueue(new Uint8Array(emlBuffer));
        controller.close();
      },
    });

    const message = {
      from:
        fromMatch?.[1]?.match(/<([^>]+)>/)?.[1] ||
        fromMatch?.[1] ||
        "unknown@example.com",
      to: recipient,
      raw,
      rawSize: emlBuffer.byteLength,
      headers: new Headers(),
      setReject() {},
      forward() {
        return Promise.resolve();
      },
      reply() {
        return Promise.resolve();
      },
    };

    const env = {
      FOCUS_DB: bindings.FOCUS_DB,
      FOCUS_STORAGE: bindings.FOCUS_STORAGE,
      EMAIL_DOMAIN: "level-up.dev",
      COLLAPSE_PLUS_ALIAS: "true",
    };

    console.log("Sending email to worker...");
    await emailWorker.email(message, env, {
      waitUntil() {},
      passThroughOnException() {},
    });

    console.log("Done! Email processed successfully.");
    console.log();

    // Show what was stored
    const result = await db
      .prepare(
        "SELECT id, title, type, saved_at FROM document ORDER BY saved_at DESC LIMIT 5"
      )
      .all();
    console.log("Recent documents in D1:");
    for (const row of result.results) {
      console.log(`  ${row.id}  ${row.title}  [${row.type}]  ${row.saved_at}`);
    }
    console.log();
    console.log("To query more:");
    console.log(
      '  pnpm --filter focus-reader-email-worker exec -- wrangler d1 execute FOCUS_DB --local --command "SELECT id, title FROM document"'
    );
  } finally {
    await mf.dispose();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
