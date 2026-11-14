"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { DropdownMenu } from "radix-ui";
import { cn } from "@/lib/cn";

export type MenuItem = {
  label: string;
  icon?: ReactNode;
  onSelect?: () => void;
  href?: string;
  danger?: boolean;
  separatorBefore?: boolean;
};

type DropdownProps = {
  trigger: ReactNode;
  items: MenuItem[];
  align?: "start" | "end";
  header?: ReactNode;
};

const itemCls =
  "flex h-10 cursor-default items-center gap-2 rounded px-2 text-sm outline-none select-none data-[highlighted]:bg-subtle sm:h-8";

export function Dropdown({ trigger, items, align = "end", header }: DropdownProps) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>{trigger}</DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align={align}
          sideOffset={6}
          className="z-50 min-w-52 rounded-md bg-surface p-1 shadow-overlay"
        >
          {header && <div className="border-b border-line px-2 py-2 text-[13px]">{header}</div>}
          {items.map((item) => (
            <div key={item.label}>
              {item.separatorBefore && <DropdownMenu.Separator className="my-1 h-px bg-line" />}
              {item.href ? (
                <DropdownMenu.Item asChild className={itemCls}>
                  <Link href={item.href}>
                    <span className="text-muted">{item.icon}</span>
                    {item.label}
                  </Link>
                </DropdownMenu.Item>
              ) : (
                <DropdownMenu.Item
                  onSelect={item.onSelect}
                  className={cn(itemCls, item.danger && "text-danger")}
                >
                  <span className={item.danger ? "text-danger" : "text-muted"}>{item.icon}</span>
                  {item.label}
                </DropdownMenu.Item>
              )}
            </div>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
