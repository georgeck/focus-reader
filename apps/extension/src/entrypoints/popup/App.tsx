import { useState, useEffect, useCallback } from "react";
import { getConfig, savePage } from "@/lib/api-client";
import { TagPicker } from "@/components/TagPicker";

type Status = "idle" | "saving" | "success" | "error" | "not-configured";

export function App() {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [pageUrl, setPageUrl] = useState("");
  const [pageTitle, setPageTitle] = useState("");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [showTags, setShowTags] = useState(false);

  useEffect(() => {
    getConfig().then((config) => {
      if (!config) setStatus("not-configured");
    });
    browser.tabs
      .query({ active: true, currentWindow: true })
      .then(([tab]) => {
        if (tab?.url) setPageUrl(tab.url);
        if (tab?.title) setPageTitle(tab.title);
      });
  }, []);

  const handleToggleTag = useCallback((tagId: string) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  }, []);

  const handleSave = useCallback(
    async (type: "article" | "bookmark") => {
      setStatus("saving");
      setError("");

      let html: string | null = null;
      if (type === "article") {
        try {
          const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
          if (tab?.id) {
            const response = await browser.tabs.sendMessage(tab.id, { action: "capture-html" }) as { html?: string };
            html = response?.html ?? null;
          }
        } catch {
          // Content script unavailable — fall back to bookmark
        }
      }

      try {
        await savePage(pageUrl, html, {
          type: html ? type : "bookmark",
          tagIds: selectedTagIds.length > 0 ? selectedTagIds : undefined,
        });
        setStatus("success");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Save failed");
        setStatus("error");
      }
    },
    [pageUrl, selectedTagIds]
  );

  if (status === "not-configured") {
    return (
      <div className="popup">
        <h2>Focus Reader</h2>
        <p className="message">Extension not configured.</p>
        <button onClick={() => browser.runtime.openOptionsPage()}>Open Settings</button>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="popup">
        <h2>Focus Reader</h2>
        <p className="message success">Saved!</p>
      </div>
    );
  }

  return (
    <div className="popup">
      <h2>Focus Reader</h2>
      <p className="page-title" title={pageUrl}>
        {pageTitle || pageUrl}
      </p>

      {status === "error" && <p className="message error">{error}</p>}

      <div className="actions">
        <button disabled={status === "saving"} onClick={() => handleSave("article")}>
          {status === "saving" ? "Saving..." : "Save as Article"}
        </button>
        <button disabled={status === "saving"} onClick={() => handleSave("bookmark")}>
          Save as Bookmark
        </button>
      </div>

      <button className="toggle-tags" onClick={() => setShowTags(!showTags)}>
        {showTags ? "Hide Tags" : "Add Tags"}
      </button>
      {showTags && <TagPicker selectedIds={selectedTagIds} onToggle={handleToggleTag} />}
    </div>
  );
}
