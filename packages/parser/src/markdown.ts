import TurndownService from "turndown";
import { parseHTML } from "linkedom";

let turndownInstance: TurndownService | null = null;

function getTurndown(): TurndownService {
  if (!turndownInstance) {
    turndownInstance = new TurndownService({
      headingStyle: "atx",
      codeBlockStyle: "fenced",
      bulletListMarker: "-",
    });

    // Preserve tables as HTML (GFM table support)
    turndownInstance.keep(["table", "thead", "tbody", "tr", "th", "td"]);
  }
  return turndownInstance;
}

export function htmlToMarkdown(html: string): string {
  const turndown = getTurndown();
  // Parse HTML using linkedom so Turndown doesn't need the global `document`
  // (which doesn't exist in Cloudflare Workers runtime)
  const { document } = parseHTML(
    `<!DOCTYPE html><html><body>${html}</body></html>`
  );
  return turndown.turndown(document.body as unknown as HTMLElement);
}
