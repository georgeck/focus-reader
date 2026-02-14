/**
 * Local email ingestion script.
 * Reads a .eml file from disk and replays it against the local email worker
 * via wrangler's unstable_dev API.
 *
 * Usage: npx tsx scripts/ingest-local.ts <path-to-eml-file>
 *
 * Prerequisites: the email worker must be running locally via `pnpm --filter focus-reader-email-worker dev`
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { execSync } from "node:child_process";

const emlPath = process.argv[2];
if (!emlPath) {
  console.error("Usage: npx tsx scripts/ingest-local.ts <path-to-eml-file>");
  process.exit(1);
}

const absolutePath = resolve(emlPath);
const emlBuffer = readFileSync(absolutePath);

console.log(`Read ${emlBuffer.byteLength} bytes from ${absolutePath}`);

// Parse basic headers from the EML to show useful info
const emlText = emlBuffer.toString("utf-8");
const subjectMatch = emlText.match(/^Subject:\s*(.+)$/m);
const fromMatch = emlText.match(/^From:\s*(.+)$/m);
const toMatch = emlText.match(/^To:\s*(.+)$/m);

console.log(`Subject: ${subjectMatch?.[1] || "(unknown)"}`);
console.log(`From: ${fromMatch?.[1] || "(unknown)"}`);
console.log(`To: ${toMatch?.[1] || "(unknown)"}`);
console.log();

// Use wrangler to send the email to the local worker
// Note: wrangler doesn't have a direct "send email" CLI command.
// For local testing, use the integration tests or deploy to staging.
console.log("To test locally, use one of these methods:");
console.log();
console.log("1. Run the integration tests:");
console.log("   pnpm --filter focus-reader-email-worker test");
console.log();
console.log("2. Deploy to staging and send a real email:");
console.log("   pnpm --filter focus-reader-email-worker deploy");
console.log();
console.log("3. Inspect the local D1 database after tests:");
console.log(
  '   pnpm --filter focus-reader-email-worker exec -- wrangler d1 execute FOCUS_DB --local --command "SELECT id, title, type FROM document ORDER BY saved_at DESC LIMIT 10"'
);
