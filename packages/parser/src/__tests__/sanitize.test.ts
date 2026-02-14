import { describe, it, expect } from "vitest";
import { sanitizeHtml, rewriteCidUrls } from "../sanitize.js";

describe("sanitizeHtml", () => {
  it("strips script tags", () => {
    const html = '<p>Hello</p><script>alert("xss")</script><p>World</p>';
    const result = sanitizeHtml(html);
    expect(result).not.toContain("<script");
    expect(result).toContain("Hello");
    expect(result).toContain("World");
  });

  it("strips event handlers", () => {
    const html = '<img src="photo.jpg" onerror="alert(1)" />';
    const result = sanitizeHtml(html);
    expect(result).not.toContain("onerror");
    expect(result).toContain("photo.jpg");
  });

  it("strips 1x1 tracking pixels", () => {
    const html =
      '<p>Content</p><img src="https://track.example.com/pixel.gif" width="1" height="1" />';
    const result = sanitizeHtml(html);
    expect(result).not.toContain("pixel.gif");
    expect(result).toContain("Content");
  });

  it("strips known tracker domain images", () => {
    const html =
      '<p>Content</p><img src="https://open.substack.com/track/abc" />';
    const result = sanitizeHtml(html);
    expect(result).not.toContain("open.substack.com");
  });

  it("preserves legitimate images", () => {
    const html = '<img src="https://example.com/hero.jpg" alt="Hero" />';
    const result = sanitizeHtml(html);
    expect(result).toContain("hero.jpg");
    expect(result).toContain('alt="Hero"');
  });

  it("preserves basic formatting tags", () => {
    const html =
      "<h1>Title</h1><p><strong>Bold</strong> and <em>italic</em></p>";
    const result = sanitizeHtml(html);
    expect(result).toContain("<h1>");
    expect(result).toContain("<strong>");
    expect(result).toContain("<em>");
  });

  it("strips style tags", () => {
    const html = "<style>body { color: red; }</style><p>Text</p>";
    const result = sanitizeHtml(html);
    expect(result).not.toContain("<style");
    expect(result).toContain("Text");
  });

  it("strips iframes", () => {
    const html = '<iframe src="https://evil.com"></iframe><p>Safe</p>';
    const result = sanitizeHtml(html);
    expect(result).not.toContain("iframe");
    expect(result).toContain("Safe");
  });
});

describe("rewriteCidUrls", () => {
  it("rewrites cid: image URLs to proxy paths", () => {
    const html = '<p>Hello</p><img src="cid:img001" />';
    const cidMap = new Map([["img001", "attachments/doc1/img001"]]);
    const result = rewriteCidUrls(html, "doc1", cidMap);
    expect(result).toContain('src="/api/attachments/doc1/img001"');
    expect(result).not.toContain("cid:");
  });

  it("preserves non-cid images", () => {
    const html =
      '<img src="https://example.com/photo.jpg" /><img src="cid:img001" />';
    const cidMap = new Map([["img001", "path"]]);
    const result = rewriteCidUrls(html, "doc1", cidMap);
    expect(result).toContain("https://example.com/photo.jpg");
    expect(result).toContain("/api/attachments/doc1/img001");
  });

  it("leaves unknown cid references unchanged", () => {
    const html = '<img src="cid:unknown" />';
    const cidMap = new Map<string, string>();
    const result = rewriteCidUrls(html, "doc1", cidMap);
    expect(result).toContain("cid:unknown");
  });
});
