const WORDS_PER_MINUTE = 238;

export function countWords(text: string): number {
  if (!text || !text.trim()) return 0;
  return text.trim().split(/\s+/).length;
}

export function estimateReadingTime(wordCount: number): number {
  if (wordCount <= 0) return 1;
  return Math.max(1, Math.round(wordCount / WORDS_PER_MINUTE));
}

export function nowISO(): string {
  return new Date().toISOString();
}

export function dateBucket(date: Date): string {
  // Hour-level UTC bucket: "2026-02-13T17"
  return date.toISOString().slice(0, 13);
}
