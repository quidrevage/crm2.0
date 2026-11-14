import type { ComponentProps, ReactNode } from "react";
import { ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/cn";

/** 16px text on phones prevents iOS Safari from zooming into focused fields. */
export const controlCls =
  "w-full rounded-md border border-line-strong bg-surface px-2.5 text-base text-fg outline-none transition-colors placeholder:text-muted/70 focus:border-accent focus:ring-2 focus:ring-accent/15 disabled:bg-subtle disabled:text-muted aria-[invalid=true]:border-danger sm:text-sm";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(controlCls, "h-10 sm:h-9", className)} {...props} />;
}

export function Textarea({ className, rows = 3, ...props }: ComponentProps<"textarea">) {
  return <textarea rows={rows} className={cn(controlCls, "resize-y py-2 leading-snug", className)} {...props} />;
}

export function Select({ className, children, ...props }: ComponentProps<"select">) {
  return (
    <span className="relative block">
      <select className={cn(controlCls, "h-10 appearance-none pr-8 sm:h-9", className)} {...props}>
        {children}
      </select>
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute top-1/2 right-2.5 h-4 w-4 -translate-y-1/2 text-muted"
      />
    </span>
  );
}

export function SearchInput({ className, ...props }: ComponentProps<"input">) {
  return (
    <span className={cn("relative block", className)}>
      <Search aria-hidden className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted" />
      <input type="search" className={cn(controlCls, "h-10 pl-8 sm:h-9")} {...props} />
    </span>
  );
}

export function Checkbox({ label, className, ...props }: ComponentProps<"input"> & { label: ReactNode }) {
  return (
    <label className={cn("flex min-h-9 cursor-pointer items-center gap-2 text-sm", className)}>
      <input type="checkbox" className="h-4 w-4 rounded border-line-strong accent-accent" {...props} />
      <span>{label}</span>
    </label>
  );
}

type FieldProps = {
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  className?: string;
  children: ReactNode;
};

/** Label + control + validation message. The label wraps the control, so no ids are needed. */
export function Field({ label, error, hint, required, className, children }: FieldProps) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1 block text-[13px] font-medium text-fg">
        {label}
        {required && <span className="text-danger"> *</span>}
      </span>
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-muted">{hint}</span>}
      {error && (
        <span role="alert" className="mt-1 block text-xs text-danger">
          {error}
        </span>
      )}
    </label>
  );
}
