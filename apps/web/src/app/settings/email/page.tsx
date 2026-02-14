"use client";

import useSWR from "swr";
import { apiFetch } from "@/lib/api-client";

export default function EmailSettingsPage() {
  const { data: settings } = useSWR("/api/settings", (url: string) =>
    apiFetch<{ emailDomain: string | null }>(url)
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold mb-1">Email Ingestion</h1>
        <p className="text-sm text-muted-foreground">
          Your email ingestion settings.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-medium">Email Domain</h2>
        <p className="text-sm text-muted-foreground">
          Forward newsletters to any address at your configured email domain.
          Incoming emails will be automatically processed and added to your library.
        </p>
        <div className="rounded-lg border p-4 bg-muted/50">
          {settings?.emailDomain ? (
            <p className="text-sm">
              Configured domain:{" "}
              <span className="font-mono font-semibold">{settings.emailDomain}</span>
            </p>
          ) : (
            <p className="text-sm font-mono">
              No email domain configured. Set <code>EMAIL_DOMAIN</code> in your
              environment or configure email routing in the Cloudflare dashboard
              under{" "}
              <span className="font-semibold">Email Routing &rarr; Email Workers</span>.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
