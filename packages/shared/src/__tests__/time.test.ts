import { describe, it, expect } from "vitest";
import { countWords, estimateReadingTime, nowISO, dateBucket } from "../time.js";

describe("countWords", () => {
  it("counts words in a sentence", () => {
    expect(countWords("Hello world, this is a test.")).toBe(6);
  });

  it("returns 0 for empty string", () => {
    expect(countWords("")).toBe(0);
  });

  it("returns 0 for whitespace-only string", () => {
    expect(countWords("   ")).toBe(0);
  });

  it("handles multiple spaces between words", () => {
    expect(countWords("hello   world")).toBe(2);
  });

  it("handles newlines and tabs", () => {
    expect(countWords("hello\nworld\tthere")).toBe(3);
  });
});

describe("estimateReadingTime", () => {
  it("returns minimum 1 minute for short text", () => {
    expect(estimateReadingTime(10)).toBe(1);
  });

  it("calculates reading time at 238 WPM", () => {
    expect(estimateReadingTime(238)).toBe(1);
    expect(estimateReadingTime(476)).toBe(2);
    expect(estimateReadingTime(1190)).toBe(5);
  });

  it("rounds to nearest minute", () => {
    expect(estimateReadingTime(400)).toBe(2);
  });

  it("returns 1 for zero word count", () => {
    expect(estimateReadingTime(0)).toBe(1);
  });

  it("returns 1 for negative word count", () => {
    expect(estimateReadingTime(-5)).toBe(1);
  });
});

describe("nowISO", () => {
  it("returns a valid ISO 8601 string", () => {
    const result = nowISO();
    expect(new Date(result).toISOString()).toBe(result);
  });
});

describe("dateBucket", () => {
  it("returns hour-level UTC bucket", () => {
    const date = new Date("2026-02-13T17:45:30.000Z");
    expect(dateBucket(date)).toBe("2026-02-13T17");
  });

  it("handles midnight", () => {
    const date = new Date("2026-01-01T00:00:00.000Z");
    expect(dateBucket(date)).toBe("2026-01-01T00");
  });
});
