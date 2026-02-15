import type {
  Feed,
  FeedWithStats,
  UpdateFeedInput,
} from "@focus-reader/shared";
import {
  listFeeds,
  createFeed,
  getFeedByUrl,
  updateFeed,
  softDeleteFeed,
  hardDeleteFeed,
  addTagToFeed,
  removeTagFromFeed,
} from "@focus-reader/db";
import {
  fetchFeed,
  discoverFeedUrl,
  parseOpml,
  generateOpml,
} from "@focus-reader/parser";
import type { OpmlFeed } from "@focus-reader/parser";

export async function getFeeds(db: D1Database): Promise<FeedWithStats[]> {
  return listFeeds(db);
}

export async function addFeed(db: D1Database, url: string): Promise<Feed> {
  let feedUrl = url;
  let parsedFeed;

  // Try fetching the URL directly as a feed
  try {
    parsedFeed = await fetchFeed(url);
  } catch {
    // Not a feed URL — try discovering from HTML
    const response = await fetch(url, {
      headers: { "User-Agent": "FocusReader/1.0" },
      redirect: "follow",
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.status}`);
    }
    const html = await response.text();
    const discovered = discoverFeedUrl(html, url);
    if (!discovered) {
      throw new Error("No feed found at this URL");
    }
    feedUrl = discovered;
    parsedFeed = await fetchFeed(feedUrl);
  }

  // Check for duplicate
  const existing = await getFeedByUrl(db, feedUrl);
  if (existing) {
    throw new DuplicateFeedError(existing.id);
  }

  return createFeed(db, {
    feed_url: feedUrl,
    title: parsedFeed.title || feedUrl,
    description: parsedFeed.description,
    site_url: parsedFeed.siteUrl,
    icon_url: parsedFeed.iconUrl,
  });
}

export async function patchFeed(
  db: D1Database,
  id: string,
  updates: UpdateFeedInput
): Promise<void> {
  await updateFeed(db, id, updates);
}

export async function removeFeed(
  db: D1Database,
  id: string,
  hard = false
): Promise<void> {
  if (hard) {
    await hardDeleteFeed(db, id);
  } else {
    await softDeleteFeed(db, id);
  }
}

export async function importOpml(
  db: D1Database,
  xml: string
): Promise<{ imported: number; skipped: number }> {
  const feeds = parseOpml(xml);
  let imported = 0;
  let skipped = 0;

  for (const feed of feeds) {
    const existing = await getFeedByUrl(db, feed.feedUrl);
    if (existing) {
      skipped++;
      continue;
    }
    await createFeed(db, {
      feed_url: feed.feedUrl,
      title: feed.title || feed.feedUrl,
      site_url: feed.siteUrl,
    });
    imported++;
  }

  return { imported, skipped };
}

export async function exportOpml(db: D1Database): Promise<string> {
  const feeds = await listFeeds(db);
  const opmlFeeds: OpmlFeed[] = feeds.map((f) => ({
    title: f.title,
    feedUrl: f.feed_url,
    siteUrl: f.site_url,
  }));
  return generateOpml(opmlFeeds, "Focus Reader Feeds");
}

export async function tagFeed(
  db: D1Database,
  feedId: string,
  tagId: string
): Promise<void> {
  await addTagToFeed(db, feedId, tagId);
}

export async function untagFeed(
  db: D1Database,
  feedId: string,
  tagId: string
): Promise<void> {
  await removeTagFromFeed(db, feedId, tagId);
}

export class DuplicateFeedError extends Error {
  public existingId: string;
  constructor(existingId: string) {
    super("This feed is already subscribed");
    this.name = "DuplicateFeedError";
    this.existingId = existingId;
  }
}
