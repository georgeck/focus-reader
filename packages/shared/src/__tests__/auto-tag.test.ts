import { describe, it, expect } from "vitest";
import { evaluateAutoTagRules } from "../auto-tag.js";
import type { AutoTagRule } from "../auto-tag.js";

describe("evaluateAutoTagRules", () => {
  it("matches title contains condition", () => {
    const rules: AutoTagRule[] = [
      {
        tagId: "tag-1",
        conditions: [{ field: "title", operator: "contains", value: "AI" }],
        matchMode: "all",
      },
    ];

    const result = evaluateAutoTagRules(rules, {
      title: "AI Weekly Digest",
      author: null,
      url: null,
      plain_text_content: null,
    });

    expect(result).toEqual(["tag-1"]);
  });

  it("matches domain equals condition", () => {
    const rules: AutoTagRule[] = [
      {
        tagId: "tag-2",
        conditions: [
          { field: "domain", operator: "equals", value: "example.com" },
        ],
        matchMode: "all",
      },
    ];

    const result = evaluateAutoTagRules(rules, {
      title: "Some Article",
      author: null,
      url: "https://example.com/article",
      plain_text_content: null,
    });

    expect(result).toEqual(["tag-2"]);
  });

  it("requires all conditions in matchMode all", () => {
    const rules: AutoTagRule[] = [
      {
        tagId: "tag-3",
        conditions: [
          { field: "title", operator: "contains", value: "Tech" },
          { field: "author", operator: "equals", value: "Alice" },
        ],
        matchMode: "all",
      },
    ];

    // Only title matches, not author
    const result = evaluateAutoTagRules(rules, {
      title: "Tech News",
      author: "Bob",
      url: null,
      plain_text_content: null,
    });

    expect(result).toEqual([]);
  });

  it("requires at least one condition in matchMode any", () => {
    const rules: AutoTagRule[] = [
      {
        tagId: "tag-4",
        conditions: [
          { field: "title", operator: "contains", value: "Tech" },
          { field: "author", operator: "equals", value: "Alice" },
        ],
        matchMode: "any",
      },
    ];

    // Only title matches
    const result = evaluateAutoTagRules(rules, {
      title: "Tech News",
      author: "Bob",
      url: null,
      plain_text_content: null,
    });

    expect(result).toEqual(["tag-4"]);
  });

  it("handles invalid regex gracefully", () => {
    const rules: AutoTagRule[] = [
      {
        tagId: "tag-5",
        conditions: [
          { field: "title", operator: "matches", value: "[invalid(" },
        ],
        matchMode: "all",
      },
    ];

    const result = evaluateAutoTagRules(rules, {
      title: "Some Title",
      author: null,
      url: null,
      plain_text_content: null,
    });

    expect(result).toEqual([]);
  });

  it("returns empty array for empty rules", () => {
    const result = evaluateAutoTagRules([], {
      title: "Some Title",
      author: null,
      url: null,
      plain_text_content: null,
    });

    expect(result).toEqual([]);
  });

  it("matches sender field using from_address", () => {
    const rules: AutoTagRule[] = [
      {
        tagId: "tag-6",
        conditions: [
          { field: "sender", operator: "contains", value: "@newsletter.com" },
        ],
        matchMode: "all",
      },
    ];

    const result = evaluateAutoTagRules(rules, {
      title: "Weekly Update",
      author: null,
      url: null,
      plain_text_content: null,
      from_address: "noreply@newsletter.com",
    });

    expect(result).toEqual(["tag-6"]);
  });

  it("matches regex patterns", () => {
    const rules: AutoTagRule[] = [
      {
        tagId: "tag-7",
        conditions: [
          { field: "title", operator: "matches", value: "^\\d{4}" },
        ],
        matchMode: "all",
      },
    ];

    const result = evaluateAutoTagRules(rules, {
      title: "2024 Year in Review",
      author: null,
      url: null,
      plain_text_content: null,
    });

    expect(result).toEqual(["tag-7"]);
  });

  it("performs case-insensitive matching", () => {
    const rules: AutoTagRule[] = [
      {
        tagId: "tag-8",
        conditions: [
          { field: "title", operator: "contains", value: "IMPORTANT" },
        ],
        matchMode: "all",
      },
    ];

    const result = evaluateAutoTagRules(rules, {
      title: "This is important news",
      author: null,
      url: null,
      plain_text_content: null,
    });

    expect(result).toEqual(["tag-8"]);
  });
});
