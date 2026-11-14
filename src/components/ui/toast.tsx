"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import { cn } from "@/lib/cn";

type ToastTone = "info" | "success" | "error";
type ToastInput = { title: string; description?: string; tone?: ToastTone };
type ToastItem = ToastInput & { id: number };

const ToastContext = createContext<{ show: (toast: ToastInput) => void } | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}

const icons = { info: Info, success: CheckCircle2, error: AlertCircle };
const iconTone = { info: "text-accent", success: "text-success", error: "text-danger" };

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => setItems((list) => list.filter((t) => t.id !== id)), []);

  const show = useCallback(
    (toast: ToastInput) => {
      const id = nextId.current++;
      setItems((list) => [...list.slice(-2), { ...toast, id }]);
      window.setTimeout(() => dismiss(id), 6000);
    },
    [dismiss],
  );

  const value = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-3 bottom-20 z-[60] flex flex-col items-end gap-2 lg:inset-x-auto lg:right-5 lg:bottom-5"
      >
        {items.map((toast) => {
          const Icon = icons[toast.tone ?? "info"];
          return (
            <div
              key={toast.id}
              role="status"
              className="pointer-events-auto flex w-full max-w-sm items-start gap-2.5 rounded-md bg-surface p-3 shadow-overlay"
            >
              <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", iconTone[toast.tone ?? "info"])} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{toast.title}</p>
                {toast.description && <p className="mt-0.5 text-[13px] text-muted">{toast.description}</p>}
              </div>
              <button
                type="button"
                aria-label="Закрити сповіщення"
                onClick={() => dismiss(toast.id)}
                className="rounded p-1 text-muted hover:bg-subtle hover:text-fg"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
