import { describe, it, expect, beforeEach } from "vitest";
import { env } from "cloudflare:test";
import {
  createHighlight,
  getHighlight,
  getHighlightWithTags,
  listHighlightsForDocument,
  listAllHighlights,
  updateHighlight,
  deleteHighlight,
  addTagToHighlight,
  removeTagFromHighlight,
  getHighlightCountForDocument,
} from "../queries/highlights.js";
import { createDocument } from "../queries/documents.js";
import { createTag } from "../queries/tags.js";
import { INITIAL_SCHEMA_SQL, FTS5_MIGRATION_SQL, INDEXES_MIGRATION_SQL } from "../migration-sql.js";

async function applyMigration(db: D1Database) {
  const allSql = INITIAL_SCHEMA_SQL + "\n" + FTS5_MIGRATION_SQL + "\n" + INDEXES_MIGRATION_SQL;
  const statements = allSql
    .split(";")
    .map((s) => s.trim())
    .filter(
      (s) =>
        s.length > 0 &&
        !s.startsWith("--") &&
        !s.match(/^--/) &&
        s.includes(" ")
    );

  for (const stmt of statements) {
    await db.prepare(stmt).run();
  }
}

async function createTestDocument(db: D1Database, overrides?: Record<string, unknown>) {
  return createDocument(db, {
    type: "article",
    title: "Test Article",
    origin_type: "manual",
    url: "https://example.com/test",
    ...overrides,
  });
}

describe("highlight queries", () => {
  beforeEach(async () => {
    await applyMigration(env.FOCUS_DB);
  });

  describe("createHighlight + getHighlight", () => {
    it("creates and retrieves a highlight", async () => {
      const doc = await createTestDocument(env.FOCUS_DB);
      const highlight = await createHighlight(env.FOCUS_DB, {
        document_id: doc.id,
        text: "This is highlighted text",
        note: "A note",
        color: "#90EE90",
        position_percent: 0.25,
      });

      expect(highlight.id).toBeDefined();
      expect(highlight.document_id).toBe(doc.id);
      expect(highlight.text).toBe("This is highlighted text");
      expect(highlight.note).toBe("A note");
      expect(highlight.color).toBe("#90EE90");
      expect(highlight.position_percent).toBe(0.25);
      expect(highlight.created_at).toBeDefined();
      expect(highlight.updated_at).toBeDefined();

      const fetched = await getHighlight(env.FOCUS_DB, highlight.id);
      expect(fetched).not.toBeNull();
      expect(fetched!.text).toBe("This is highlighted text");
    });

    it("uses default color #FFFF00", async () => {
      const doc = await createTestDocument(env.FOCUS_DB);
      const highlight = await createHighlight(env.FOCUS_DB, {
        document_id: doc.id,
        text: "Default color",
      });

      expect(highlight.color).toBe("#FFFF00");
    });

    it("creates with custom id", async () => {
      const doc = await createTestDocument(env.FOCUS_DB);
      const customId = crypto.randomUUID();
      const highlight = await createHighlight(env.FOCUS_DB, {
        id: customId,
        document_id: doc.id,
        text: "Custom ID highlight",
      });

      expect(highlight.id).toBe(customId);
    });

    it("stores position_selector JSON", async () => {
      const doc = await createTestDocument(env.FOCUS_DB);
      const selector = JSON.stringify({
        type: "TextPositionSelector",
        cssSelector: "article > p:nth-child(3)",
        startOffset: 10,
        endOffset: 35,
        surroundingText: {
          prefix: "before the ",
          exact: "highlighted text here",
          suffix: " and after",
        },
      });

      const highlight = await createHighlight(env.FOCUS_DB, {
        document_id: doc.id,
        text: "highlighted text here",
        position_selector: selector,
        position_percent: 0.5,
      });

      expect(highlight.position_selector).toBe(selector);
    });
  });

  describe("getHighlightWithTags", () => {
    it("returns highlight with empty tags", async () => {
      const doc = await createTestDocument(env.FOCUS_DB);
      const highlight = await createHighlight(env.FOCUS_DB, {
        document_id: doc.id,
        text: "Test",
      });

      const result = await getHighlightWithTags(env.FOCUS_DB, highlight.id);
      expect(result).not.toBeNull();
      expect(result!.tags).toEqual([]);
    });

    it("returns highlight with tags", async () => {
      const doc = await createTestDocument(env.FOCUS_DB);
      const highlight = await createHighlight(env.FOCUS_DB, {
        document_id: doc.id,
        text: "Test",
      });
      const tag = await createTag(env.FOCUS_DB, { name: "important" });
      await addTagToHighlight(env.FOCUS_DB, highlight.id, tag.id);

      const result = await getHighlightWithTags(env.FOCUS_DB, highlight.id);
      expect(result!.tags).toHaveLength(1);
      expect(result!.tags[0].name).toBe("important");
    });

    it("returns null for non-existent id", async () => {
      const result = await getHighlightWithTags(env.FOCUS_DB, "non-existent");
      expect(result).toBeNull();
    });
  });

  describe("listHighlightsForDocument", () => {
    it("returns highlights ordered by position_percent ASC", async () => {
      const doc = await createTestDocument(env.FOCUS_DB);
      await createHighlight(env.FOCUS_DB, {
        document_id: doc.id,
        text: "Bottom",
        position_percent: 0.9,
      });
      await createHighlight(env.FOCUS_DB, {
        document_id: doc.id,
        text: "Top",
        position_percent: 0.1,
      });
      await createHighlight(env.FOCUS_DB, {
        document_id: doc.id,
        text: "Middle",
        position_percent: 0.5,
      });

      const highlights = await listHighlightsForDocument(env.FOCUS_DB, doc.id);
      expect(highlights).toHaveLength(3);
      expect(highlights[0].text).toBe("Top");
      expect(highlights[1].text).toBe("Middle");
      expect(highlights[2].text).toBe("Bottom");
    });

    it("returns empty array for document with no highlights", async () => {
      const doc = await createTestDocument(env.FOCUS_DB);
      const highlights = await listHighlightsForDocument(env.FOCUS_DB, doc.id);
      expect(highlights).toEqual([]);
    });

    it("includes tags on each highlight", async () => {
      const doc = await createTestDocument(env.FOCUS_DB);
      const highlight = await createHighlight(env.FOCUS_DB, {
        document_id: doc.id,
        text: "Tagged",
        position_percent: 0.5,
      });
      const tag = await createTag(env.FOCUS_DB, { name: "key-point" });
      await addTagToHighlight(env.FOCUS_DB, highlight.id, tag.id);

      const highlights = await listHighlightsForDocument(env.FOCUS_DB, doc.id);
      expect(highlights[0].tags).toHaveLength(1);
      expect(highlights[0].tags[0].name).toBe("key-point");
    });
  });

  describe("listAllHighlights", () => {
    it("returns highlights with document info", async () => {
      const doc = await createTestDocument(env.FOCUS_DB, {
        title: "My Article",
        author: "Jane",
      });
      await createHighlight(env.FOCUS_DB, {
        document_id: doc.id,
        text: "Important point",
      });

      const result = await listAllHighlights(env.FOCUS_DB);
      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.items[0].text).toBe("Important point");
      expect(result.items[0].document.title).toBe("My Article");
      expect(result.items[0].document.author).toBe("Jane");
    });

    it("filters by color", async () => {
      const doc = await createTestDocument(env.FOCUS_DB);
      await createHighlight(env.FOCUS_DB, {
        document_id: doc.id,
        text: "Yellow",
        color: "#FFFF00",
      });
      await createHighlight(env.FOCUS_DB, {
        document_id: doc.id,
        text: "Green",
        color: "#90EE90",
      });

      const result = await listAllHighlights(env.FOCUS_DB, { color: "#90EE90" });
      expect(result.items).toHaveLength(1);
      expect(result.items[0].text).toBe("Green");
    });

    it("filters by tag", async () => {
      const doc = await createTestDocument(env.FOCUS_DB);
      const h1 = await createHighlight(env.FOCUS_DB, {
        document_id: doc.id,
        text: "Tagged",
      });
      await createHighlight(env.FOCUS_DB, {
        document_id: doc.id,
        text: "Untagged",
      });
      const tag = await createTag(env.FOCUS_DB, { name: "research" });
      await addTagToHighlight(env.FOCUS_DB, h1.id, tag.id);

      const result = await listAllHighlights(env.FOCUS_DB, { tagId: tag.id });
      expect(result.items).toHaveLength(1);
      expect(result.items[0].text).toBe("Tagged");
    });

    it("supports cursor pagination", async () => {
      const doc = await createTestDocument(env.FOCUS_DB);
      // Create 3 highlights
      for (let i = 0; i < 3; i++) {
        await createHighlight(env.FOCUS_DB, {
          document_id: doc.id,
          text: `Highlight ${i}`,
        });
      }

      const page1 = await listAllHighlights(env.FOCUS_DB, { limit: 2 });
      expect(page1.items).toHaveLength(2);
      expect(page1.nextCursor).toBeDefined();

      const page2 = await listAllHighlights(env.FOCUS_DB, { limit: 2, cursor: page1.nextCursor });
      expect(page2.items).toHaveLength(1);
      expect(page2.nextCursor).toBeUndefined();
    });
  });

  describe("updateHighlight", () => {
    it("updates text and note", async () => {
      const doc = await createTestDocument(env.FOCUS_DB);
      const highlight = await createHighlight(env.FOCUS_DB, {
        document_id: doc.id,
        text: "Original",
      });

      await updateHighlight(env.FOCUS_DB, highlight.id, {
        text: "Updated text",
        note: "New note",
      });

      const updated = await getHighlight(env.FOCUS_DB, highlight.id);
      expect(updated!.text).toBe("Updated text");
      expect(updated!.note).toBe("New note");
    });

    it("updates color", async () => {
      const doc = await createTestDocument(env.FOCUS_DB);
      const highlight = await createHighlight(env.FOCUS_DB, {
        document_id: doc.id,
        text: "Test",
      });

      await updateHighlight(env.FOCUS_DB, highlight.id, { color: "#FF6B6B" });

      const updated = await getHighlight(env.FOCUS_DB, highlight.id);
      expect(updated!.color).toBe("#FF6B6B");
    });

    it("no-ops with empty updates", async () => {
      const doc = await createTestDocument(env.FOCUS_DB);
      const highlight = await createHighlight(env.FOCUS_DB, {
        document_id: doc.id,
        text: "Test",
      });

      // Should not throw
      await updateHighlight(env.FOCUS_DB, highlight.id, {});

      const fetched = await getHighlight(env.FOCUS_DB, highlight.id);
      expect(fetched!.text).toBe("Test");
    });
  });

  describe("deleteHighlight", () => {
    it("deletes highlight and its tags", async () => {
      const doc = await createTestDocument(env.FOCUS_DB);
      const highlight = await createHighlight(env.FOCUS_DB, {
        document_id: doc.id,
        text: "To delete",
      });
      const tag = await createTag(env.FOCUS_DB, { name: "temp" });
      await addTagToHighlight(env.FOCUS_DB, highlight.id, tag.id);

      await deleteHighlight(env.FOCUS_DB, highlight.id);

      const fetched = await getHighlight(env.FOCUS_DB, highlight.id);
      expect(fetched).toBeNull();

      // Verify highlight_tags cleaned up
      const tagResult = await env.FOCUS_DB
        .prepare("SELECT COUNT(*) as count FROM highlight_tags WHERE highlight_id = ?1")
        .bind(highlight.id)
        .first<{ count: number }>();
      expect(tagResult!.count).toBe(0);
    });
  });

  describe("addTagToHighlight + removeTagFromHighlight", () => {
    it("adds and removes tags", async () => {
      const doc = await createTestDocument(env.FOCUS_DB);
      const highlight = await createHighlight(env.FOCUS_DB, {
        document_id: doc.id,
        text: "Test",
      });
      const tag1 = await createTag(env.FOCUS_DB, { name: "tag1" });
      const tag2 = await createTag(env.FOCUS_DB, { name: "tag2" });

      await addTagToHighlight(env.FOCUS_DB, highlight.id, tag1.id);
      await addTagToHighlight(env.FOCUS_DB, highlight.id, tag2.id);

      let withTags = await getHighlightWithTags(env.FOCUS_DB, highlight.id);
      expect(withTags!.tags).toHaveLength(2);

      await removeTagFromHighlight(env.FOCUS_DB, highlight.id, tag1.id);

      withTags = await getHighlightWithTags(env.FOCUS_DB, highlight.id);
      expect(withTags!.tags).toHaveLength(1);
      expect(withTags!.tags[0].name).toBe("tag2");
    });

    it("addTagToHighlight is idempotent (INSERT OR IGNORE)", async () => {
      const doc = await createTestDocument(env.FOCUS_DB);
      const highlight = await createHighlight(env.FOCUS_DB, {
        document_id: doc.id,
        text: "Test",
      });
      const tag = await createTag(env.FOCUS_DB, { name: "dup" });

      await addTagToHighlight(env.FOCUS_DB, highlight.id, tag.id);
      await addTagToHighlight(env.FOCUS_DB, highlight.id, tag.id);

      const withTags = await getHighlightWithTags(env.FOCUS_DB, highlight.id);
      expect(withTags!.tags).toHaveLength(1);
    });
  });

  describe("getHighlightCountForDocument", () => {
    it("returns correct count", async () => {
      const doc = await createTestDocument(env.FOCUS_DB);
      expect(await getHighlightCountForDocument(env.FOCUS_DB, doc.id)).toBe(0);

      await createHighlight(env.FOCUS_DB, {
        document_id: doc.id,
        text: "One",
      });
      await createHighlight(env.FOCUS_DB, {
        document_id: doc.id,
        text: "Two",
      });

      expect(await getHighlightCountForDocument(env.FOCUS_DB, doc.id)).toBe(2);
    });
  });
});
