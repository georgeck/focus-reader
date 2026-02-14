"use client";

import { useSearchParams } from "next/navigation";
import { NavSidebar } from "./nav-sidebar";
import { RightSidebar } from "./right-sidebar";
import { ReaderContent } from "@/components/reader/reader-content";
import { ReaderToolbar } from "@/components/reader/reader-toolbar";
import { ReaderToc } from "@/components/reader/reader-toc";
import { useApp } from "@/contexts/app-context";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { useDocument } from "@/hooks/use-documents";
import { apiFetch } from "@/lib/api-client";
import { useRouter, usePathname } from "next/navigation";
import { useMemo, useCallback } from "react";
import { toast } from "sonner";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const selectedDocId = searchParams.get("doc");
  const isReadingView = !!selectedDocId;
  const {
    sidebarCollapsed,
    toggleSidebar,
    toggleRightPanel,
    toggleToc,
    toggleContentMode,
    focusMode,
    toggleFocusMode,
  } = useApp();

  const { document: currentDoc, mutate: mutateDoc } = useDocument(selectedDocId);

  const patchDoc = useCallback(
    async (updates: Record<string, unknown>) => {
      if (!selectedDocId) return;
      await apiFetch(`/api/documents/${selectedDocId}`, {
        method: "PATCH",
        body: JSON.stringify(updates),
      });
      mutateDoc();
    },
    [selectedDocId, mutateDoc]
  );

  const shortcuts = useMemo(
    () => ({
      "[": toggleSidebar,
      "]": toggleRightPanel,
      f: () => {
        if (isReadingView) toggleFocusMode();
      },
      Escape: () => {
        if (isReadingView) {
          const params = new URLSearchParams(searchParams.toString());
          params.delete("doc");
          const qs = params.toString();
          router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
        }
      },
      "Shift+H": toggleContentMode,
      s: () => {
        if (!currentDoc) return;
        const newVal = currentDoc.is_starred === 1 ? 0 : 1;
        patchDoc({ is_starred: newVal });
        toast(newVal ? "Starred" : "Unstarred");
      },
      m: () => {
        if (!currentDoc) return;
        const newVal = currentDoc.is_read === 1 ? 0 : 1;
        patchDoc({ is_read: newVal });
        toast(newVal ? "Marked as read" : "Marked as unread");
      },
      e: () => {
        if (!currentDoc) return;
        patchDoc({ location: "archive" });
        toast("Archived");
      },
    }),
    [
      toggleSidebar,
      toggleRightPanel,
      toggleContentMode,
      toggleFocusMode,
      isReadingView,
      searchParams,
      router,
      pathname,
      currentDoc,
      patchDoc,
    ]
  );

  useKeyboardShortcuts(shortcuts);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Library View */}
      {!isReadingView && (
        <>
          <NavSidebar />
          {children}
        </>
      )}

      {/* Reading View */}
      {isReadingView && (
        <>
          {!focusMode && <ReaderToc documentId={selectedDocId} />}
          <div className="flex flex-1 flex-col min-w-0">
            <ReaderToolbar documentId={selectedDocId} />
            <ReaderContent documentId={selectedDocId} />
          </div>
        </>
      )}

      {/* Right sidebar — hidden in focus mode */}
      {!focusMode && <RightSidebar />}
    </div>
  );
}
