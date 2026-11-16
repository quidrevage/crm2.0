"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Select } from "@/components/ui/form";
import { Modal } from "@/components/ui/overlay";
import { useToast } from "@/components/ui/toast";
import { clearHistory } from "./actions";

const periods = [
  { value: "365", label: "Старші за 1 рік" },
  { value: "90", label: "Старші за 90 днів" },
  { value: "30", label: "Старші за 30 днів" },
  { value: "all", label: "Усі записи" },
] as const;

/** Administrator: removes old history entries of the current workspace after an explicit confirmation. */
export function ClearHistoryButton() {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [period, setPeriod] = useState<(typeof periods)[number]["value"]>("365");
  const [pending, setPending] = useState(false);

  async function confirm() {
    setPending(true);
    try {
      const result = await clearHistory(period);
      if (result.ok) {
        toast.show({ tone: "success", title: "Історію очищено", description: `Видалено записів: ${result.data.count}.` });
        setOpen(false);
      } else {
        toast.show({ tone: "error", title: "Історію не очищено", description: result.error });
      }
    } catch {
      toast.show({ tone: "error", title: "Немає зв’язку із сервером", description: "Перевірте інтернет-з’єднання і спробуйте ще раз." });
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <Button variant="danger" onClick={() => setOpen(true)}>
        <Trash2 className="h-4 w-4" />
        Очистити історію
      </Button>
      <Modal open={open} onOpenChange={setOpen} size="sm" title="Очистити історію дій?">
        <div className="space-y-3">
          <Field label="Які записи видалити">
            <Select value={period} onChange={(e) => setPeriod(e.target.value as typeof period)}>
              {periods.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </Select>
          </Field>
          <p className="text-[13px] text-muted">
            Записи історії цього робочого простору буде видалено остаточно, відновити їх неможливо. Самі клієнти, справи,
            документи та платежі не зміняться. В історії залишиться запис про те, хто й коли її очистив.
          </p>
          <div className="flex justify-end gap-2">
            <Button onClick={() => setOpen(false)}>Скасувати</Button>
            <Button variant="danger" disabled={pending} onClick={confirm}>
              {pending ? "Очищення…" : "Очистити"}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
