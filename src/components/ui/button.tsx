import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

const base =
  "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent/35 disabled:pointer-events-none disabled:opacity-50";

const variants: Record<Variant, string> = {
  primary: "bg-accent text-white hover:bg-accent-hover",
  secondary: "border border-line-strong bg-surface text-fg hover:bg-subtle",
  ghost: "text-fg hover:bg-subtle",
  danger: "border border-danger/30 bg-surface text-danger hover:bg-danger-soft",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-2.5 text-[13px] sm:h-8",
  md: "h-10 px-3 text-sm sm:h-9",
};

export function buttonCls(variant: Variant = "secondary", size: Size = "md", className?: string) {
  return cn(base, variants[variant], sizes[size], className);
}

type ButtonProps = ComponentProps<"button"> & { variant?: Variant; size?: Size };

export function Button({ variant, size, className, type = "button", ...props }: ButtonProps) {
  return <button type={type} className={buttonCls(variant, size, className)} {...props} />;
}

type LinkButtonProps = { href: string; variant?: Variant; size?: Size; className?: string; children: ReactNode };

export function LinkButton({ href, variant, size, className, children }: LinkButtonProps) {
  return (
    <Link href={href} className={buttonCls(variant, size, className)}>
      {children}
    </Link>
  );
}

type IconButtonProps = Omit<ComponentProps<"button">, "aria-label"> & { label: string };

export function IconButton({ label, className, type = "button", ...props }: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-muted transition-colors outline-none hover:bg-subtle hover:text-fg focus-visible:ring-2 focus-visible:ring-accent/35 disabled:pointer-events-none disabled:opacity-50 sm:h-8 sm:w-8",
        className,
      )}
      {...props}
    />
  );
}
