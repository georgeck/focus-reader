import { describe, it, expect } from "vitest";
import { htmlToMarkdown } from "../markdown.js";

describe("htmlToMarkdown", () => {
  it("converts headings", () => {
    const result = htmlToMarkdown("<h1>Title</h1><h2>Subtitle</h2>");
    expect(result).toContain("# Title");
    expect(result).toContain("## Subtitle");
  });

  it("converts paragraphs and bold/italic", () => {
    const result = htmlToMarkdown(
      "<p><strong>Bold</strong> and <em>italic</em></p>"
    );
    expect(result).toContain("**Bold**");
    expect(result).toContain("_italic_");
  });

  it("converts links", () => {
    const result = htmlToMarkdown(
      '<a href="https://example.com">Click here</a>'
    );
    expect(result).toContain("[Click here](https://example.com)");
  });

  it("converts unordered lists", () => {
    const result = htmlToMarkdown(
      "<ul><li>Item 1</li><li>Item 2</li></ul>"
    );
    expect(result).toContain("Item 1");
    expect(result).toContain("Item 2");
    expect(result).toContain("-");
  });

  it("converts ordered lists", () => {
    const result = htmlToMarkdown(
      "<ol><li>First</li><li>Second</li></ol>"
    );
    expect(result).toContain("1.  First");
    expect(result).toContain("2.  Second");
  });

  it("converts code blocks", () => {
    const result = htmlToMarkdown(
      "<pre><code>const x = 1;</code></pre>"
    );
    expect(result).toContain("```");
    expect(result).toContain("const x = 1;");
  });
});
