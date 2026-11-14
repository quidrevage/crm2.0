"use client";

import { useState, type ReactNode } from "react";
import {
  Briefcase, CalendarPlus, FileUp, ListPlus, LogOut, PanelLeftClose, PanelLeftOpen, Plus, UserPlus, UserRound,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { roleLabel } from "@/i18n/uk";
import { currentUser } from "@/mocks/data";
import { RecordFormProvider, useRecordForm } from "@/features/quick-create";
import { Button, IconButton } from "@/components/ui/button";
import { Avatar, Badge } from "@/components/ui/display";
import { Dropdown } from "@/components/ui/dropdown";
import { Drawer } from "@/components/ui/overlay";
import { ToastProvider } from "@/components/ui/toast";
import { GlobalSearch } from "./global-search";
import { Logo, MobileBar, SidebarNav } from "./nav";

function Header() {
  const form = useRecordForm();
  const icon = "h-4 w-4";
  return (
    <header className="sticky top-0 z-30 flex h-12 items-center gap-2 border-b border-line bg-surface px-3 lg:px-6">
      <div className="lg:hidden">
        <Logo compact />
      </div>
      <GlobalSearch />
      <div className="ml-auto flex items-center gap-2">
        <span className="hidden md:block">
          <Badge tone="warning">Демонстраційні дані</Badge>
        </span>
        <Dropdown
          trigger={
            <Button variant="primary" size="sm" aria-label="Створити запис">
              <Plus className={icon} />
              <span className="hidden sm:inline">Створити</span>
            </Button>
          }
          items={[
            { label: "Клієнт", icon: <UserPlus className={icon} />, onSelect: () => form.open("client") },
            { label: "Справа", icon: <Briefcase className={icon} />, onSelect: () => form.open("case") },
            { label: "Завдання", icon: <ListPlus className={icon} />, onSelect: () => form.open("task") },
            { label: "Подія в календарі", icon: <CalendarPlus className={icon} />, onSelect: () => form.open("event") },
            { label: "Документ", icon: <FileUp className={icon} />, onSelect: () => form.open("document") },
          ]}
        />
        <Dropdown
          trigger={
            <button
              type="button"
              aria-label="Меню користувача"
              className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-accent/35"
            >
              <Avatar name={currentUser.fullName} className="h-8 w-8 text-xs" />
            </button>
          }
          header={
            <>
              <p className="font-medium">{currentUser.fullName}</p>
              <p className="text-muted">{roleLabel[currentUser.role]}</p>
            </>
          }
          items={[
            { label: "Профіль і налаштування", icon: <UserRound className={icon} />, href: "/settings" },
            { label: "Вийти", icon: <LogOut className={icon} />, href: "/login", separatorBefore: true },
          ]}
        />
      </div>
    </header>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <ToastProvider>
      <RecordFormProvider>
        <div className="flex min-h-dvh">
          <aside
            className={cn(
              "sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-line bg-surface lg:flex",
              collapsed ? "w-14" : "w-56",
            )}
          >
            <div className={cn("flex h-12 shrink-0 items-center border-b border-line", collapsed ? "justify-center" : "justify-between pr-1 pl-3")}>
              {!collapsed && <Logo />}
              <IconButton
                label={collapsed ? "Розгорнути меню" : "Згорнути меню"}
                onClick={() => setCollapsed((v) => !v)}
              >
                {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
              </IconButton>
            </div>
            <SidebarNav collapsed={collapsed} />
          </aside>

          <div className="flex min-w-0 flex-1 flex-col">
            <Header />
            <main className="flex-1 px-4 pt-4 pb-24 lg:px-6 lg:pt-5 lg:pb-10">
              <div className="mx-auto max-w-[1180px]">{children}</div>
            </main>
          </div>

          <MobileBar onMore={() => setMenuOpen(true)} />
          <Drawer open={menuOpen} onOpenChange={setMenuOpen} title="LegalDesk UA">
            <div className="flex min-h-full flex-col">
              <SidebarNav onNavigate={() => setMenuOpen(false)} />
            </div>
          </Drawer>
        </div>
      </RecordFormProvider>
    </ToastProvider>
  );
}
