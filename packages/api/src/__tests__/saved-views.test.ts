import { describe, it, expect } from "vitest";
import { queryAstToDocumentQuery, applySortConfig } from "../saved-views.js";
import type { ViewQueryAst, ViewSortConfig } from "@focus-reader/shared";

describe("queryAstToDocumentQuery", () => {
  it("converts type filter", () => {
    const ast: ViewQueryAst = {
      filters: [{ field: "type", operator: "eq", value: "email" }],
      combinator: "and",
    };
    const query = queryAstToDocumentQuery(ast);
    expect(query.type).toBe("email");
  });

  it("converts location filter", () => {
    const ast: ViewQueryAst = {
      filters: [{ field: "location", operator: "eq", value: "inbox" }],
      combinator: "and",
    };
    const query = queryAstToDocumentQuery(ast);
    expect(query.location).toBe("inbox");
  });

  it("converts is_read filter to status read", () => {
    const ast: ViewQueryAst = {
      filters: [{ field: "is_read", operator: "eq", value: 1 }],
      combinator: "and",
    };
    const query = queryAstToDocumentQuery(ast);
    expect(query.status).toBe("read");
  });

  it("converts is_read filter to status unread", () => {
    const ast: ViewQueryAst = {
      filters: [{ field: "is_read", operator: "eq", value: 0 }],
      combinator: "and",
    };
    const query = queryAstToDocumentQuery(ast);
    expect(query.status).toBe("unread");
  });

  it("converts is_starred filter", () => {
    const ast: ViewQueryAst = {
      filters: [{ field: "is_starred", operator: "eq", value: 1 }],
      combinator: "and",
    };
    const query = queryAstToDocumentQuery(ast);
    expect(query.isStarred).toBe(true);
  });

  it("converts tag filter", () => {
    const ast: ViewQueryAst = {
      filters: [{ field: "tag", operator: "eq", value: "tag-123" }],
      combinator: "and",
    };
    const query = queryAstToDocumentQuery(ast);
    expect(query.tagId).toBe("tag-123");
  });

  it("converts source_id filter", () => {
    const ast: ViewQueryAst = {
      filters: [{ field: "source_id", operator: "eq", value: "sub-456" }],
      combinator: "and",
    };
    const query = queryAstToDocumentQuery(ast);
    expect(query.subscriptionId).toBe("sub-456");
  });

  it("converts date range filters", () => {
    const ast: ViewQueryAst = {
      filters: [
        { field: "saved_after", operator: "eq", value: "2024-01-01T00:00:00Z" },
        { field: "saved_before", operator: "eq", value: "2024-12-31T23:59:59Z" },
      ],
      combinator: "and",
    };
    const query = queryAstToDocumentQuery(ast);
    expect(query.savedAfter).toBe("2024-01-01T00:00:00Z");
    expect(query.savedBefore).toBe("2024-12-31T23:59:59Z");
  });

  it("handles multiple filters", () => {
    const ast: ViewQueryAst = {
      filters: [
        { field: "type", operator: "eq", value: "email" },
        { field: "is_read", operator: "eq", value: 0 },
      ],
      combinator: "and",
    };
    const query = queryAstToDocumentQuery(ast);
    expect(query.type).toBe("email");
    expect(query.status).toBe("unread");
  });

  it("handles empty filters", () => {
    const ast: ViewQueryAst = {
      filters: [],
      combinator: "and",
    };
    const query = queryAstToDocumentQuery(ast);
    expect(query).toEqual({});
  });
});

describe("applySortConfig", () => {
  it("applies sort field and direction", () => {
    const query = { type: "email" as const };
    const sortConfig: ViewSortConfig = {
      field: "saved_at",
      direction: "desc",
    };
    const result = applySortConfig(query, sortConfig);
    expect(result.sortBy).toBe("saved_at");
    expect(result.sortDir).toBe("desc");
    expect(result.type).toBe("email");
  });
});
