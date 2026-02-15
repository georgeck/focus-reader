import { useState, useEffect } from "react";
import { getTags, type Tag } from "@/lib/api-client";

interface TagPickerProps {
  selectedIds: string[];
  onToggle: (tagId: string) => void;
}

export function TagPicker({ selectedIds, onToggle }: TagPickerProps) {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getTags()
      .then(setTags)
      .catch(() => setTags([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="tag-picker-loading">Loading tags...</div>;
  if (tags.length === 0) return null;

  return (
    <div className="tag-picker">
      {tags.map((tag) => (
        <label key={tag.id} className="tag-item">
          <input
            type="checkbox"
            checked={selectedIds.includes(tag.id)}
            onChange={() => onToggle(tag.id)}
          />
          <span
            className="tag-dot"
            style={{ backgroundColor: tag.color ?? "#888" }}
          />
          <span className="tag-name">{tag.name}</span>
        </label>
      ))}
    </div>
  );
}
