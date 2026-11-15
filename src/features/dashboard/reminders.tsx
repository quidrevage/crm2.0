"use client";

import { Bell, Check } from "lucide-react";
import { IconButton } from "@/components/ui/button";
import { Card } from "@/components/ui/display";
import { eventTypeLabel } from "@/i18n/uk";
import { formatDateTime } from "@/lib/dates";
import type { Reminder } from "@/types/domain";
import { CaseLink } from "../common";
import { useRunAction } from "../record-actions";
import { dismissReminder } from "../records/actions";

/** Reminders that are due for the signed-in user. Shown only when there is something to act on. */
export function RemindersCard({ reminders }: { reminders: Reminder[] }) {
  const { run, pending } = useRunAction();
  if (reminders.length === 0) return null;
  return (
    <Card title={`Нагадування (${reminders.length})`} flush className="border-warning/40">
      <ul className="divide-y divide-line">
        {reminders.map((r) => (
          <li key={r.id} className="flex items-start gap-3 px-4 py-2.5">
            <Bell className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{r.event.title}</p>
              <p className="flex flex-wrap gap-x-2 text-[13px] text-muted">
                <span>{eventTypeLabel[r.event.type]}</span>
                <span className="num">{formatDateTime(r.event.startsAt)}</span>
                {r.event.caseId && <CaseLink id={r.event.caseId} />}
              </p>
            </div>
            <IconButton label="Позначити як прочитане" disabled={pending} onClick={() => run(() => dismissReminder(r.id), "Нагадування закрито")}>
              <Check className="h-4 w-4" />
            </IconButton>
          </li>
        ))}
      </ul>
    </Card>
  );
}
