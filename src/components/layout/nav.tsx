"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Briefcase, CalendarDays, FileText, History, Landmark, LayoutDashboard, ListChecks, Menu, Scale, Settings,
  StickyNote, Users, Wallet, type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/cn";

type NavItem = { href: string; label: string; icon: LucideIcon };

const main: NavItem[] = [
  { href: "/", label: "Головна", icon: LayoutDashboard },
  { href: "/clients", label: "Клієнти", icon: Users },
  { href: "/cases", label: "Справи", icon: Briefcase },
  { href: "/calendar", label: "Календар", icon: CalendarDays },
  { href: "/tasks", label: "Завдання", icon: ListChecks },
  { href: "/documents", label: "Документи", icon: FileText },
  { href: "/finance", label: "Фінанси", icon: Wallet },
  { href: "/courts", label: "Суди", icon: Landmark },
  { href: "/notes", label: "Нотатки", icon: StickyNote },
];

const admin: NavItem[] = [
  { href: "/activity", label: "Історія дій", icon: History },
  { href: "/settings", label: "Налаштування", icon: Settings },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

export function Logo({ compact }: { compact?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
      <span className="flex h-7 w-7 items-center justify-center rounded-md bg-accent text-white">
        <Scale className="h-4 w-4" />
      </span>
      {!compact && <span>LegalDesk UA</span>}
    </Link>
  );
}

export function SidebarNav({ collapsed, onNavigate }: { collapsed?: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();

  const renderItem = (item: NavItem) => {
    const active = isActive(pathname, item.href);
    return (
      <li key={item.href}>
        <Link
          href={item.href}
          onClick={onNavigate}
          aria-current={active ? "page" : undefined}
          title={collapsed ? item.label : undefined}
          className={cn(
            "flex h-10 items-center gap-2.5 rounded-md px-2.5 text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent/35 lg:h-8",
            active ? "bg-accent-soft font-medium text-accent" : "text-fg hover:bg-subtle",
            collapsed && "justify-center px-0",
          )}
        >
          <item.icon className={cn("h-4 w-4 shrink-0", !active && "text-muted")} />
          {!collapsed && item.label}
        </Link>
      </li>
    );
  };

  return (
    <nav aria-label="Основна навігація" className="flex flex-1 flex-col gap-4 p-2">
      <ul className="space-y-0.5">{main.map(renderItem)}</ul>
      <ul className="mt-auto space-y-0.5 border-t border-line pt-2">{admin.map(renderItem)}</ul>
    </nav>
  );
}

/** Bottom bar on phones: four primary sections plus the full menu. */
export function MobileBar({ onMore }: { onMore: () => void }) {
  const pathname = usePathname();
  const items = [main[0], main[2], main[3], main[4]];
  const itemCls = "flex h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[11px]";
  return (
    <nav
      aria-label="Швидка навігація"
      className="fixed inset-x-0 bottom-0 z-30 flex border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      {items.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(itemCls, active ? "font-medium text-accent" : "text-muted")}
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </Link>
        );
      })}
      <button type="button" onClick={onMore} className={cn(itemCls, "text-muted")}>
        <Menu className="h-5 w-5" />
        Меню
      </button>
    </nav>
  );
}
