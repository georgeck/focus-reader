export default defineContentScript({
  matches: ["<all_urls>"],
  runAt: "document_idle",
  main() {
    browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      const msg = message as { action?: string };
      if (msg?.action === "capture-html") {
        sendResponse({ html: document.documentElement.outerHTML });
      }
      return true;
    });
  },
});
