import { savePage } from "@/lib/api-client";

export default defineBackground(() => {
  browser.commands.onCommand.addListener(async (command) => {
    if (command !== "save-page") return;

    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id || !tab.url) return;

    let html: string | null = null;
    try {
      const response = await browser.tabs.sendMessage(tab.id, { action: "capture-html" }) as { html?: string };
      html = response?.html ?? null;
    } catch {
      // Content script not available (e.g. chrome:// pages) — save as bookmark
    }

    try {
      await savePage(tab.url, html, { type: html ? "article" : "bookmark" });
    } catch (err) {
      console.error("Failed to save page:", err);
    }
  });
});
