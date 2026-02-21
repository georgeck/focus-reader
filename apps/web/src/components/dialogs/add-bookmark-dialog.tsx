"use client";

import { useState, useRef, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { apiFetch, ApiClientError } from "@/lib/api-client";
import { useApp } from "@/contexts/app-context";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";

type Mode = "url" | "file";

interface AddBookmarkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialMode?: Mode;
}

export function AddBookmarkDialog({
  open,
  onOpenChange,
  initialMode = "url",
}: AddBookmarkDialogProps) {
  const { mutateDocumentList } = useApp();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [url, setUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setUrl("");
    setError("");
    setSelectedFile(null);
    setDragOver(false);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) reset();
    onOpenChange(open);
  };

  const handleSaveUrl = async () => {
    if (!url.trim()) return;
    setSaving(true);
    setError("");
    try {
      await apiFetch("/api/documents", {
        method: "POST",
        body: JSON.stringify({ url: url.trim(), type: "bookmark" }),
      });
      mutateDocumentList();
      toast("Document saved");
      reset();
      onOpenChange(false);
    } catch (err) {
      if (err instanceof ApiClientError && err.code === "DUPLICATE_URL") {
        setError("This URL is already in your library");
      } else {
        setError("Failed to save URL");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleUploadPdf = async () => {
    if (!selectedFile) return;
    setSaving(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      const res = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null) as { error?: { message?: string } } | null;
        throw new Error(body?.error?.message || "Upload failed");
      }
      mutateDocumentList();
      toast("PDF uploaded");
      reset();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload PDF");
    } finally {
      setSaving(false);
    }
  };

  const handleFileSelect = (file: File | null) => {
    if (!file) return;
    if (file.type !== "application/pdf") {
      setError("Only PDF files are supported");
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setError("File too large (max 50MB)");
      return;
    }
    setError("");
    setSelectedFile(file);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Document</DialogTitle>
        </DialogHeader>

        {/* Mode toggle */}
        <div className="flex gap-1 rounded-lg bg-muted p-1">
          <button
            onClick={() => { setMode("url"); setError(""); }}
            className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              mode === "url"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            URL
          </button>
          <button
            onClick={() => { setMode("file"); setError(""); }}
            className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              mode === "file"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Upload PDF
          </button>
        </div>

        <div className="space-y-4 py-2">
          {mode === "url" ? (
            <Input
              placeholder="Paste a URL..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveUrl();
              }}
              autoFocus
            />
          ) : (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={`flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 transition-colors cursor-pointer ${
                dragOver
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25 hover:border-muted-foreground/50"
              }`}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="size-8 text-muted-foreground" />
              {selectedFile ? (
                <p className="text-sm font-medium">{selectedFile.name}</p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Drop a PDF here or click to browse
                </p>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={(e) => handleFileSelect(e.target.files?.[0] ?? null)}
              />
            </div>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          {mode === "url" ? (
            <Button onClick={handleSaveUrl} disabled={saving || !url.trim()}>
              {saving && <Loader2 className="size-4 mr-2 animate-spin" />}
              Save
            </Button>
          ) : (
            <Button onClick={handleUploadPdf} disabled={saving || !selectedFile}>
              {saving && <Loader2 className="size-4 mr-2 animate-spin" />}
              Upload
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
