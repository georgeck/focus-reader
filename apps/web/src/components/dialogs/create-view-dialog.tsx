"use client";

import { useState } from "react";
import type { ViewFilter, ViewQueryAst } from "@focus-reader/shared";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus, X } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { toast } from "sonner";

interface CreateViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
}

const FIELD_OPTIONS: { value: ViewFilter["field"]; label: string }[] = [
  { value: "type", label: "Type" },
  { value: "location", label: "Location" },
  { value: "is_read", label: "Read status" },
  { value: "is_starred", label: "Starred" },
  { value: "tag", label: "Tag" },
  { value: "source_id", label: "Source" },
  { value: "saved_after", label: "Saved after" },
  { value: "saved_before", label: "Saved before" },
];

const OPERATOR_OPTIONS: { value: ViewFilter["operator"]; label: string }[] = [
  { value: "eq", label: "equals" },
  { value: "neq", label: "not equals" },
  { value: "gt", label: "greater than" },
  { value: "lt", label: "less than" },
  { value: "contains", label: "contains" },
];

const SORT_FIELDS = [
  { value: "saved_at", label: "Date saved" },
  { value: "published_at", label: "Date published" },
  { value: "title", label: "Title" },
  { value: "reading_time_minutes", label: "Reading time" },
];

export function CreateViewDialog({
  open,
  onOpenChange,
  onCreated,
}: CreateViewDialogProps) {
  const [name, setName] = useState("");
  const [combinator, setCombinator] = useState<"and" | "or">("and");
  const [filters, setFilters] = useState<ViewFilter[]>([
    { field: "type", operator: "eq", value: "" },
  ]);
  const [sortField, setSortField] = useState("saved_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setName("");
    setCombinator("and");
    setFilters([{ field: "type", operator: "eq", value: "" }]);
    setSortField("saved_at");
    setSortDir("desc");
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const ast: ViewQueryAst = {
        filters: filters.filter((f) => f.value !== ""),
        combinator,
      };
      await apiFetch("/api/saved-views", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          query_ast_json: JSON.stringify(ast),
          sort_json: JSON.stringify({ field: sortField, direction: sortDir }),
          pinned_order: null,
        }),
      });
      toast("View created");
      reset();
      onOpenChange(false);
      onCreated?.();
    } catch {
      toast.error("Failed to create view");
    } finally {
      setSaving(false);
    }
  };

  const addFilter = () => {
    setFilters([...filters, { field: "type", operator: "eq", value: "" }]);
  };

  const removeFilter = (index: number) => {
    setFilters(filters.filter((_, i) => i !== index));
  };

  const updateFilter = (index: number, updates: Partial<ViewFilter>) => {
    setFilters(
      filters.map((f, i) => (i === index ? { ...f, ...updates } : f))
    );
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Saved View</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <Input
            placeholder="View name..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Match</span>
            <Select
              value={combinator}
              onValueChange={(v) => setCombinator(v as "and" | "or")}
            >
              <SelectTrigger className="h-8 w-20 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="and">ALL</SelectItem>
                <SelectItem value="or">ANY</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground">
              of the following:
            </span>
          </div>

          {filters.map((filter, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <Select
                value={filter.field}
                onValueChange={(v) =>
                  updateFilter(idx, { field: v as ViewFilter["field"] })
                }
              >
                <SelectTrigger className="h-8 w-32 text-xs">
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
                value={filter.operator}
                onValueChange={(v) =>
                  updateFilter(idx, { operator: v as ViewFilter["operator"] })
                }
              >
                <SelectTrigger className="h-8 w-28 text-xs">
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
                value={String(filter.value)}
                onChange={(e) => updateFilter(idx, { value: e.target.value })}
                placeholder="Value..."
                className="h-8 text-xs flex-1"
              />
              {filters.length > 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  onClick={() => removeFilter(idx)}
                >
                  <X className="size-3" />
                </Button>
              )}
            </div>
          ))}

          <Button variant="ghost" size="sm" onClick={addFilter}>
            <Plus className="size-3 mr-1" />
            Add filter
          </Button>

          <div className="flex items-center gap-2 pt-2 border-t">
            <span className="text-sm text-muted-foreground">Sort by</span>
            <Select value={sortField} onValueChange={setSortField}>
              <SelectTrigger className="h-8 w-36 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORT_FIELDS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={sortDir}
              onValueChange={(v) => setSortDir(v as "asc" | "desc")}
            >
              <SelectTrigger className="h-8 w-24 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="desc">Newest</SelectItem>
                <SelectItem value="asc">Oldest</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !name.trim()}>
            {saving && <Loader2 className="size-4 mr-2 animate-spin" />}
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
