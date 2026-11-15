import Link from "next/link";
import type { ReactNode } from "react";
import { AlertTriangle, ChevronRight, Loader2 } from "lucide-react";
import type { Tone } from "@/types/domain";
import { cn } from "@/lib/cn";
import { initials } from "@/lib/format";
import { Button } from "./button";

const badgeTones: Record<Tone, string> = {
  neutral: "bg-subtle text-muted",
  accent: "bg-accent-soft text-accent",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
};

export function Badge({ tone = "neutral", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center rounded px-1.5 text-xs font-medium whitespace-nowrap",
        badgeTones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

type CardProps = { title?: string; action?: ReactNode; children: ReactNode; className?: string; flush?: boolean };

/** A bordered surface. `flush` removes body padding for tables and lists. */
export function Card({ title, action, children, className, flush }: CardProps) {
  return (
    <section className={cn("min-w-0 rounded-lg border border-line bg-surface", className)}>
      {(title || action) && (
        <header className="flex min-h-11 items-center justify-between gap-3 border-b border-line px-4 py-1.5">
          {title && <h2 className="text-sm font-semibold">{title}</h2>}
          {action}
        </header>
      )}
      <div className={flush ? "" : "p-4"}>{children}</div>
    </section>
  );
}

export type Crumb = { label: string; href?: string };

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Навігаційний ланцюжок" className="mb-2 flex flex-wrap items-center gap-1 text-[13px] text-muted">
      {items.map((item, i) => (
        <span key={item.label} className="flex min-w-0 items-center gap-1">
          {i > 0 && <ChevronRight aria-hidden className="h-3.5 w-3.5 shrink-0" />}
          {item.href ? (
            <Link href={item.href} className="hover:text-fg hover:underline">
              {item.label}
            </Link>
          ) : (
            <span className="truncate text-fg">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

type PageHeaderProps = { title: string; meta?: ReactNode; actions?: ReactNode; crumbs?: Crumb[] };

export function PageHeader({ title, meta, actions, crumbs }: PageHeaderProps) {
  return (
    <div className="mb-4">
      {crumbs && <Breadcrumbs items={crumbs} />}
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <div className="min-w-0">
          <h1 className="text-xl leading-tight font-semibold tracking-tight">{title}</h1>
          {meta && <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-muted">{meta}</div>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}

type EmptyStateProps = { icon?: ReactNode; title: string; hint?: string; action?: ReactNode };

export function EmptyState({ icon, title, hint, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center px-4 py-10 text-center">
      {icon && <div className="mb-3 text-muted">{icon}</div>}
      <p className="text-sm font-medium">{title}</p>
      {hint && <p className="mt-1 max-w-sm text-[13px] text-muted">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function LoadingState({ label = "Завантаження…" }: { label?: string }) {
  return (
    <div role="status" className="flex items-center justify-center gap-2 py-16 text-sm text-muted">
      <Loader2 className="h-4 w-4 animate-spin" />
      {label}
    </div>
  );
}

type ErrorStateProps = { title?: string; message?: string; onRetry?: () => void };

export function ErrorState({
  title = "Не вдалося завантажити дані",
  message = "Перевірте з’єднання з інтернетом і спробуйте ще раз.",
  onRetry,
}: ErrorStateProps) {
  return (
    <div role="alert" className="flex flex-col items-center px-4 py-14 text-center">
      <AlertTriangle className="mb-3 h-6 w-6 text-danger" />
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-1 max-w-sm text-[13px] text-muted">{message}</p>
      {onRetry && (
        <Button className="mt-4" onClick={onRetry}>
          Спробувати ще раз
        </Button>
      )}
    </div>
  );
}

export function Avatar({ name, className }: { name: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[10px] font-semibold text-accent",
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}

export type Detail = { label: string; value: ReactNode };

/** Label/value grid for record overviews. */
export function DetailList({ items, columns = 2 }: { items: Detail[]; columns?: 1 | 2 }) {
  return (
    <dl className={cn("grid gap-x-8 gap-y-3", columns === 2 && "sm:grid-cols-2")}>
      {items.map((item) => (
        <div key={item.label} className="min-w-0">
          <dt className="text-[13px] text-muted">{item.label}</dt>
          <dd className="mt-0.5 text-sm break-words">{item.value || "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Stat({ label, value, href, tone }: { label: string; value: ReactNode; href?: string; tone?: "danger" | "warning" }) {
  const body = (
    <>
      <span className="text-[13px] text-muted">{label}</span>
      <span className={cn("num mt-1 block text-2xl leading-none font-semibold", tone === "danger" && "text-danger", tone === "warning" && "text-warning")}>
        {value}
      </span>
    </>
  );
  const cls = "block rounded-lg border border-line bg-surface px-4 py-3";
  return href ? (
    <Link href={href} className={cn(cls, "transition-colors hover:border-line-strong")}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}
