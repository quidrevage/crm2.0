"use client";

import type { ReactNode } from "react";
import { Dialog } from "radix-ui";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";
import { Button, IconButton } from "./button";

const overlayCls = "fixed inset-0 z-40 bg-fg/30";

type ModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  size?: "sm" | "md" | "lg";
  children: ReactNode;
};

const widths = { sm: "sm:max-w-sm", md: "sm:max-w-xl", lg: "sm:max-w-3xl" };

/** Centered dialog on desktop, bottom sheet on phones. */
export function Modal({ open, onOpenChange, title, description, size = "md", children }: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className={overlayCls} />
        <Dialog.Content
          {...(description ? {} : { "aria-describedby": undefined })}
          className={cn(
            "fixed inset-x-0 bottom-0 z-50 flex max-h-[92dvh] flex-col rounded-t-xl bg-surface shadow-overlay outline-none",
            "sm:inset-x-auto sm:top-1/2 sm:bottom-auto sm:left-1/2 sm:max-h-[86dvh] sm:w-[calc(100vw-2rem)] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-lg",
            widths[size],
          )}
        >
          <div className="flex items-start justify-between gap-3 border-b border-line px-4 py-3">
            <div className="min-w-0">
              <Dialog.Title className="text-[15px] font-semibold">{title}</Dialog.Title>
              {description && (
                <Dialog.Description className="mt-0.5 text-[13px] text-muted">{description}</Dialog.Description>
              )}
            </div>
            <Dialog.Close asChild>
              <IconButton label="Закрити" className="-mt-1 -mr-2">
                <X className="h-4 w-4" />
              </IconButton>
            </Dialog.Close>
          </div>
          <div className="overflow-y-auto px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

type DrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  side?: "left" | "right";
  children: ReactNode;
};

export function Drawer({ open, onOpenChange, title, side = "left", children }: DrawerProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className={overlayCls} />
        <Dialog.Content
          aria-describedby={undefined}
          className={cn(
            "fixed inset-y-0 z-50 flex w-[min(20rem,86vw)] flex-col bg-surface shadow-overlay outline-none",
            side === "left" ? "left-0" : "right-0",
          )}
        >
          <div className="flex h-12 shrink-0 items-center justify-between border-b border-line pr-1 pl-4">
            <Dialog.Title className="text-sm font-semibold">{title}</Dialog.Title>
            <Dialog.Close asChild>
              <IconButton label="Закрити">
                <X className="h-4 w-4" />
              </IconButton>
            </Dialog.Close>
          </div>
          <div className="flex-1 overflow-y-auto pb-[env(safe-area-inset-bottom)]">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

type ConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  message: ReactNode;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void;
};

export function ConfirmDialog({ open, onOpenChange, title, message, confirmLabel, danger, onConfirm }: ConfirmDialogProps) {
  return (
    <Modal open={open} onOpenChange={onOpenChange} title={title} size="sm">
      <p className="text-sm text-muted">{message}</p>
      <div className="mt-5 flex justify-end gap-2">
        <Button onClick={() => onOpenChange(false)}>Скасувати</Button>
        <Button
          variant={danger ? "danger" : "primary"}
          onClick={() => {
            onConfirm();
            onOpenChange(false);
          }}
        >
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
