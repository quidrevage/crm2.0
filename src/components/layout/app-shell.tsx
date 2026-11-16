"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  Briefcase, CalendarPlus, FileUp, ListPlus, LogOut, PanelLeftClose, PanelLeftOpen, Plus, UserPlus, UserRound,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { roleLabel } from "@/i18n/uk";
import { signOut } from "@/features/auth/actions";
import type { Role } from "@/types/domain";
import { RecordFormProvider, useRecordForm } from "@/features/quick-create";
import { Button, IconButton } from "@/components/ui/button";
import { Avatar } from "@/components/ui/display";
import { Dropdown } from "@/components/ui/dropdown";
import { Drawer, Modal } from "@/components/ui/overlay";
import { ProfileForm } from "@/features/auth/forms";
import { WorkspaceSwitcher, type WorkspaceOption } from "@/features/workspaces/workspace-ui";
import { ToastProvider } from "@/components/ui/toast";
import { GlobalSearch } from "./global-search";
import { SyncIndicator, useRealtimeSync } from "./realtime-sync";
import { LookupsProvider } from "@/features/lookups/context";
import type { Lookups } from "@/features/lookups/queries";
import { Logo, MobileBar, SidebarNav } from "./nav";

export type ShellUser = {
  displayName: string;
  role: Role;
  /** The person has not entered their name yet: ask once, so colleagues see a name rather than an e-mail. */
  needsName: boolean;
  workspace: { id: string; name: string };
  workspaces: WorkspaceOption[];
};

const NAME_PROMPT_KEY = "legaldesk:name-prompt-dismissed";

function NamePrompt() {
  // Once dismissed, the prompt stays away for this browser session.
  const [open, setOpen] = useState(false);
  useEffect(() => {
    let dismissed = false;
    try {
      dismissed = window.sessionStorage.getItem(NAME_PROMPT_KEY) === "1";
    } catch {
      // Storage unavailable: show the prompt.
    }
    if (!dismissed) setOpen(true);
  }, []);
  const close = (next: boolean) => {
    setOpen(next);
    if (!next) {
      try {
        window.sessionStorage.setItem(NAME_PROMPT_KEY, "1");
      } catch {
        // Storage unavailable (private mode): the prompt simply shows again next time.
      }
    }
  };
  return (
    <Modal
      open={open}
      onOpenChange={close}
      size="sm"
      title="Як вас звати?"
      description="Ім’я бачитимуть колеги у завданнях, документах та історії дій замість адреси електронної пошти."
    >
      <ProfileForm fullName="" isAdvocate={false} certificateNo="" onSaved={() => close(false)} />
    </Modal>
  );
}

function Header({ user }: { user: ShellUser }) {
  const form = useRecordForm();
  const syncStatus = useRealtimeSync();
  const icon = "h-4 w-4";
  return (
    <header className="sticky top-0 z-30 flex h-12 items-center gap-2 border-b border-line bg-surface px-3 lg:px-6">
      <div className="lg:hidden">
        <Logo compact />
      </div>
      <GlobalSearch />
      <div className="ml-auto flex items-center gap-2">
        <SyncIndicator status={syncStatus} />
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
              <Avatar name={user.displayName} className="h-8 w-8 text-xs" />
            </button>
          }
          header={
            <>
              <p className="font-medium break-all">{user.displayName}</p>
              <p className="text-muted">
                {roleLabel[user.role]} · {user.workspace.name}
              </p>
            </>
          }
          items={[
            { label: "Профіль і налаштування", icon: <UserRound className={icon} />, href: "/settings" },
            { label: "Вийти", icon: <LogOut className={icon} />, onSelect: () => void signOut(), separatorBefore: true },
          ]}
        />
      </div>
    </header>
  );
}

export function AppShell({ children, user, lookups }: { children: ReactNode; user: ShellUser; lookups: Lookups }) {
  const [collapsed, setCollapsed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <LookupsProvider value={lookups}>
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
            <div className={cn("border-b border-line p-2", collapsed && "px-1")}>
              <WorkspaceSwitcher current={user.workspace} workspaces={user.workspaces} collapsed={collapsed} />
            </div>
            <SidebarNav collapsed={collapsed} />
          </aside>

          <div className="flex min-w-0 flex-1 flex-col">
            <Header user={user} />
            <main className="flex-1 px-4 pt-4 pb-24 lg:px-6 lg:pt-5 lg:pb-10">
              <div className="mx-auto max-w-[1180px]">{children}</div>
            </main>
          </div>

          <MobileBar onMore={() => setMenuOpen(true)} />
          {user.needsName && <NamePrompt />}
          <Drawer open={menuOpen} onOpenChange={setMenuOpen} title="LegalDesk UA">
            <div className="flex min-h-full flex-col">
              <div className="border-b border-line p-2">
                <WorkspaceSwitcher current={user.workspace} workspaces={user.workspaces} />
              </div>
              <SidebarNav onNavigate={() => setMenuOpen(false)} />
            </div>
          </Drawer>
        </div>
      </RecordFormProvider>
    </ToastProvider>
    </LookupsProvider>
  );
}
