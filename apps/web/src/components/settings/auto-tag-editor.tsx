"use client";

import { useState } from "react";
import type { AutoTagRule, AutoTagCondition, Tag } from "@focus-reader/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, X } from "lucide-react";

interface AutoTagEditorProps {
  rules: AutoTagRule[];
  onChange: (rules: AutoTagRule[]) => void;
  availableTags: Tag[];
}

const FIELD_OPTIONS: { value: AutoTagCondition["field"]; label: string }[] = [
  { value: "title", label: "Title" },
  { value: "author", label: "Author" },
  { value: "domain", label: "Domain" },
  { value: "sender", label: "Sender" },
  { value: "content", label: "Content" },
];

const OPERATOR_OPTIONS: { value: AutoTagCondition["operator"]; label: string }[] = [
  { value: "contains", label: "contains" },
  { value: "equals", label: "equals" },
  { value: "matches", label: "matches (regex)" },
];

export function AutoTagEditor({ rules, onChange, availableTags }: AutoTagEditorProps) {
  const addRule = () => {
    onChange([
      ...rules,
      {
        tagId: availableTags[0]?.id ?? "",
        conditions: [{ field: "title", operator: "contains", value: "" }],
        matchMode: "all",
      },
    ]);
  };

  const removeRule = (index: number) => {
    onChange(rules.filter((_, i) => i !== index));
  };

  const updateRule = (index: number, updates: Partial<AutoTagRule>) => {
    onChange(rules.map((r, i) => (i === index ? { ...r, ...updates } : r)));
  };

  const addCondition = (ruleIndex: number) => {
    const rule = rules[ruleIndex];
    updateRule(ruleIndex, {
      conditions: [
        ...rule.conditions,
        { field: "title", operator: "contains", value: "" },
      ],
    });
  };

  const removeCondition = (ruleIndex: number, condIndex: number) => {
    const rule = rules[ruleIndex];
    updateRule(ruleIndex, {
      conditions: rule.conditions.filter((_, i) => i !== condIndex),
    });
  };

  const updateCondition = (
    ruleIndex: number,
    condIndex: number,
    updates: Partial<AutoTagCondition>
  ) => {
    const rule = rules[ruleIndex];
    updateRule(ruleIndex, {
      conditions: rule.conditions.map((c, i) =>
        i === condIndex ? { ...c, ...updates } : c
      ),
    });
  };

  return (
    <div className="space-y-3">
      {rules.map((rule, ruleIdx) => (
        <div key={ruleIdx} className="rounded-lg border p-3 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Apply tag:</span>
            <Select
              value={rule.tagId}
              onValueChange={(v) => updateRule(ruleIdx, { tagId: v })}
            >
              <SelectTrigger className="h-7 w-40 text-xs">
                <SelectValue placeholder="Select tag" />
              </SelectTrigger>
              <SelectContent>
                {availableTags.map((tag) => (
                  <SelectItem key={tag.id} value={tag.id}>
                    <span className="flex items-center gap-1.5">
                      <span
                        className="size-2 rounded-full"
                        style={{ backgroundColor: tag.color || "#6366f1" }}
                      />
                      {tag.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-xs text-muted-foreground">when</span>
            <Select
              value={rule.matchMode}
              onValueChange={(v) =>
                updateRule(ruleIdx, { matchMode: v as "all" | "any" })
              }
            >
              <SelectTrigger className="h-7 w-20 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">all</SelectItem>
                <SelectItem value="any">any</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-xs text-muted-foreground">match:</span>
            <div className="flex-1" />
            <Button
              variant="ghost"
              size="icon"
              className="size-6 text-muted-foreground hover:text-destructive"
              onClick={() => removeRule(ruleIdx)}
            >
              <Trash2 className="size-3" />
            </Button>
          </div>

          {rule.conditions.map((cond, condIdx) => (
            <div key={condIdx} className="flex items-center gap-2 pl-4">
              <Select
                value={cond.field}
                onValueChange={(v) =>
                  updateCondition(ruleIdx, condIdx, {
                    field: v as AutoTagCondition["field"],
                  })
                }
              >
                <SelectTrigger className="h-7 w-28 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FIELD_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={cond.operator}
                onValueChange={(v) =>
                  updateCondition(ruleIdx, condIdx, {
                    operator: v as AutoTagCondition["operator"],
                  })
                }
              >
                <SelectTrigger className="h-7 w-36 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OPERATOR_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                value={cond.value}
                onChange={(e) =>
                  updateCondition(ruleIdx, condIdx, { value: e.target.value })
                }
                placeholder="Value..."
                className="h-7 text-xs flex-1"
              />
              {rule.conditions.length > 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-6 text-muted-foreground"
                  onClick={() => removeCondition(ruleIdx, condIdx)}
                >
                  <X className="size-3" />
                </Button>
              )}
            </div>
          ))}

          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-xs ml-4"
            onClick={() => addCondition(ruleIdx)}
          >
            <Plus className="size-3 mr-1" />
            Add condition
          </Button>
        </div>
      ))}

      <Button variant="outline" size="sm" onClick={addRule}>
        <Plus className="size-3 mr-1" />
        Add rule
      </Button>
    </div>
  );
}
