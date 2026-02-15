"use client";

export function PdfViewer({ documentId }: { documentId: string }) {
  return (
    <iframe
      src={`/api/documents/${documentId}/content`}
      className="w-full h-full border-0"
      title="PDF document"
    />
  );
}
