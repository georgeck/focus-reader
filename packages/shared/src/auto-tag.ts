export interface AutoTagRule {
  tagId: string;
  conditions: AutoTagCondition[];
  matchMode: "all" | "any";
}

export interface AutoTagCondition {
  field: "title" | "author" | "domain" | "sender" | "content";
  operator: "contains" | "equals" | "matches";
  value: string;
}

export function evaluateAutoTagRules(
  rules: AutoTagRule[],
  document: {
    title: string;
    author: string | null;
    url: string | null;
    plain_text_content: string | null;
    from_address?: string | null;
  }
): string[] {
  const matchedTagIds: string[] = [];

  for (const rule of rules) {
    if (rule.conditions.length === 0) continue;

    const results = rule.conditions.map((cond) =>
      evaluateCondition(cond, document)
    );

    const matches =
      rule.matchMode === "all"
        ? results.every(Boolean)
        : results.some(Boolean);

    if (matches) {
      matchedTagIds.push(rule.tagId);
    }
  }

  return matchedTagIds;
}

function evaluateCondition(
  condition: AutoTagCondition,
  document: {
    title: string;
    author: string | null;
    url: string | null;
    plain_text_content: string | null;
    from_address?: string | null;
  }
): boolean {
  const fieldValue = getFieldValue(condition.field, document);
  if (fieldValue === null) return false;

  switch (condition.operator) {
    case "contains":
      return fieldValue.toLowerCase().includes(condition.value.toLowerCase());
    case "equals":
      return fieldValue.toLowerCase() === condition.value.toLowerCase();
    case "matches":
      try {
        const regex = new RegExp(condition.value, "i");
        return regex.test(fieldValue);
      } catch {
        return false;
      }
    default:
      return false;
  }
}

function getFieldValue(
  field: AutoTagCondition["field"],
  document: {
    title: string;
    author: string | null;
    url: string | null;
    plain_text_content: string | null;
    from_address?: string | null;
  }
): string | null {
  switch (field) {
    case "title":
      return document.title;
    case "author":
      return document.author;
    case "domain":
      if (!document.url) return null;
      try {
        return new URL(document.url).hostname;
      } catch {
        return null;
      }
    case "sender":
      return document.from_address ?? null;
    case "content":
      return document.plain_text_content;
    default:
      return null;
  }
}
