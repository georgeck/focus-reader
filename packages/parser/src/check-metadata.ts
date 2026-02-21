import { extractMetadata } from "./metadata.js";

// This is a simple script to test the metadata extraction on a given URL.
// Usage: `pnpm --filter @focus-reader/parser check-metadata https://example.com`
async function main() {
  const url = process.argv[2] ?? "https://www.example.com/";
  const html = await fetch(url).then(r => r.text());
  console.log(JSON.stringify(extractMetadata(html, url), null, 2));
}

main();
