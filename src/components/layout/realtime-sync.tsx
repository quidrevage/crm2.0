"use client";

import { startTransition, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getBrowserClient } from "@/lib/supabase/browser";
import { cn } from "@/lib/cn";

const TABLES = [
  "clients", "client_contacts", "cases", "case_parties", "courts", "documents", "document_versions", "tasks", "events",
  "event_reminders", "fee_agreements", "payments", "expenses", "notes", "profiles", "workspaces", "workspace_members",
] as const;

type Status = "connecting" | "live" | "offline";

/**
 * Listens for changes made by the other user and refreshes the current screen.
 * Bursts of changes (and duplicate notifications) are merged into a single refresh.
 * Row-level security also applies to these notifications.
 * Open forms keep their contents; a save over someone else's change is caught as a conflict.
 */
type ChangePayload = { new?: Record<string, unknown> | null };

/**
 * Who made the change, when the row says so. The person's own saves already refresh the page
 * through the server action, so refreshing again here would only race with that update
 * (React then warns "called use() to suspend… but did not call use() when it finished").
 */
function authorOf(payload: ChangePayload): unknown {
  const row = payload.new ?? {};
  return row.updated_by ?? row.created_by ?? row.uploaded_by ?? null;
}

export function useRealtimeSync(userId: string): Status {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("connecting");
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    const supabase = getBrowserClient();
    // A refresh is deferred while the tab is hidden and runs once when it becomes visible again,
    // and always as a transition so it never interrupts a navigation that is still loading.
    let stale = false;
    const run = () => {
      if (document.visibilityState === "hidden") {
        stale = true;
        return;
      }
      stale = false;
      startTransition(() => router.refresh());
    };
    const refresh = () => {
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(run, 600);
    };
    const onVisible = () => {
      if (stale && document.visibilityState === "visible") run();
    };
    document.addEventListener("visibilitychange", onVisible);

    let channel = supabase.channel("shared-records");
    for (const table of TABLES) {
      channel = channel.on("postgres_changes", { event: "*", schema: "public", table }, (payload: ChangePayload) => {
        if (authorOf(payload) === userId) return;
        refresh();
      });
    }
    let wasOffline = false;
    channel.subscribe((state) => {
      if (state === "SUBSCRIBED") {
        setStatus("live");
        // Catch up on anything missed while disconnected.
        if (wasOffline) refresh();
        wasOffline = false;
      } else if (state === "CHANNEL_ERROR" || state === "TIMED_OUT" || state === "CLOSED") {
        setStatus("offline");
        wasOffline = true;
      }
    });

    const onOnline = () => refresh();
    window.addEventListener("online", onOnline);
    return () => {
      window.clearTimeout(timer.current);
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onVisible);
      void supabase.removeChannel(channel);
    };
  }, [router, userId]);

  return status;
}

export function SyncIndicator({ status }: { status: Status }) {
  const label =
    status === "live" ? "Зміни синхронізуються" : status === "offline" ? "Немає з’єднання для оновлень. Оновіть сторінку." : "Підключення…";
  return (
    <span title={label} aria-label={label} role="status" className="hidden items-center gap-1.5 text-xs text-muted sm:flex">
      <span
        className={cn(
          "h-2 w-2 rounded-full",
          status === "live" ? "bg-success" : status === "offline" ? "bg-danger" : "bg-line-strong",
        )}
      />
      {status === "offline" && "Офлайн"}
    </span>
  );
}
