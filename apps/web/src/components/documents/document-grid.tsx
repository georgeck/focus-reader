"use client";

import type { DocumentWithTags } from "@focus-reader/shared";
import { DocumentCard } from "./document-card";

interface DocumentGridProps {
  documents: DocumentWithTags[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onOpen: (id: string) => void;
  onHover: (id: string | null) => void;
  onMutate: () => void;
}

export function DocumentGrid({
  documents,
  selectedId,
  onSelect,
  onOpen,
  onHover,
  onMutate,
}: DocumentGridProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 p-4">
      {documents.map((doc) => (
        <DocumentCard
          key={doc.id}
          document={doc}
          isSelected={doc.id === selectedId}
          onClick={() => onSelect(doc.id)}
          onDoubleClick={() => onOpen(doc.id)}
          onMouseEnter={() => onHover(doc.id)}
          onMouseLeave={() => onHover(null)}
          onMutate={onMutate}
        />
      ))}
    </div>
  );
}
