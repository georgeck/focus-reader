import { parseHTML } from "linkedom";

export interface PageMetadata {
  title: string | null;
  description: string | null;
  author: string | null;
  siteName: string | null;
  ogImage: string | null;
  favicon: string | null;
  canonicalUrl: string | null;
  publishedDate: string | null;
}

export function extractMetadata(html: string, url: string): PageMetadata {
  const { document } = parseHTML(html);

  const getMeta = (property: string): string | null => {
    const el =
      document.querySelector(`meta[property="${property}"]`) ||
      document.querySelector(`meta[name="${property}"]`);
    return el?.getAttribute("content") || null;
  };

  const title =
    getMeta("og:title") ||
    document.querySelector("title")?.textContent ||
    null;

  const description =
    getMeta("og:description") ||
    getMeta("description") ||
    null;

  const author =
    getMeta("author") ||
    getMeta("article:author") ||
    null;

  const siteName =
    getMeta("og:site_name") ||
    null;

  const ogImage =
    getMeta("og:image") ||
    getMeta("twitter:image") ||
    null;

  const canonicalUrl =
    document.querySelector("link[rel='canonical']")?.getAttribute("href") ||
    getMeta("og:url") ||
    null;

  const publishedDate =
    getMeta("article:published_time") ||
    getMeta("datePublished") ||
    null;

  // Favicon: try apple-touch-icon first (higher quality), then standard favicon
  let favicon =
    document.querySelector("link[rel='apple-touch-icon']")?.getAttribute("href") ||
    document.querySelector("link[rel='icon']")?.getAttribute("href") ||
    document.querySelector("link[rel='shortcut icon']")?.getAttribute("href") ||
    null;

  // Resolve relative favicon URLs
  if (favicon && !favicon.startsWith("http")) {
    try {
      favicon = new URL(favicon, url).href;
    } catch {
      favicon = null;
    }
  }

  return {
    title,
    description,
    author,
    siteName,
    ogImage,
    favicon,
    canonicalUrl,
    publishedDate,
  };
}
