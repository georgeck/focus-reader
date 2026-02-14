/**
 * Local email ingestion script.
 * Reads a .eml file from disk and replays it against the local email worker
 * using wrangler's unstable_dev API.
 *
 * Usage:
 *   npx tsx scripts/ingest-local.ts <path-to-eml-file>
 *   npx tsx scripts/ingest-local.ts <path-to-eml-file> --recipient user@read.example.com
 *
 * The script starts a local workerd instance, invokes the email handler directly,
 * then shuts down. D1/R2 state persists in apps/email-worker/.wrangler/state/.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { unstable_dev } from "wrangler";

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
    "Usage: npx tsx scripts/ingest-local.ts <path-to-eml-file> [--recipient addr@domain]"
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

// Start local worker via wrangler's dev API
const workerPath = resolve(
  import.meta.dirname || ".",
  "../apps/email-worker/src/index.ts"
);
const configPath = resolve(
  import.meta.dirname || ".",
  "../apps/email-worker/wrangler.toml"
);

console.log("Starting local worker...");
const worker = await unstable_dev(workerPath, {
  config: configPath,
  experimental: { disableExperimentalWarning: true },
  local: true,
  persist: true,
});

try {
  // Build a mock email message and invoke the handler
  // unstable_dev doesn't expose the email handler directly, so we use the
  // worker's module to call it via the service binding approach.
  // Instead, we POST the raw EML to a special /__email endpoint that we
  // invoke directly on the worker module.

  // Since unstable_dev doesn't support email triggers, we call the worker
  // module's email() function directly via the miniflare instance.
  const mf = (worker as any).mf || (worker as any).__mf;
  if (!mf) {
    // Fallback: POST raw EML bytes to the worker and let the user know
    // that direct email invocation requires the test suite
    console.error(
      "Direct email handler invocation is not supported with this version of wrangler."
    );
    console.error("Use the integration tests instead:");
    console.error("  pnpm --filter focus-reader-email-worker test");
    process.exit(1);
  }

  const bindings = await mf.getBindings();
  const { default: emailWorker } = await import(workerPath);

  // Build ForwardableEmailMessage-like object
  const raw = new ReadableStream({
    start(controller) {
      controller.enqueue(new Uint8Array(emlBuffer));
      controller.close();
    },
  });

  const message = {
    from: fromMatch?.[1]?.match(/<([^>]+)>/)?.[1] || fromMatch?.[1] || "unknown@example.com",
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
    EMAIL_DOMAIN: bindings.EMAIL_DOMAIN || "read.yourdomain.com",
    COLLAPSE_PLUS_ALIAS: bindings.COLLAPSE_PLUS_ALIAS || "false",
  };

  console.log("Sending email to worker...");
  await emailWorker.email(message, env, {
    waitUntil() {},
    passThroughOnException() {},
  });

  console.log("Done! Email processed successfully.");
  console.log();
  console.log("Inspect results:");
  console.log(
    '  pnpm --filter focus-reader-email-worker exec -- wrangler d1 execute FOCUS_DB --local --command "SELECT id, title, type FROM document ORDER BY saved_at DESC LIMIT 10"'
  );
} finally {
  await worker.stop();
}
