import { AppShell } from "@/components/layout/app-shell";
import { getLookups } from "@/features/lookups/queries";
import { requireUser } from "@/lib/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const lookups = await getLookups();
  return (
    <AppShell
      user={{
        displayName: user.displayName,
        role: user.role,
        needsName: !user.fullName.trim(),
        workspace: { id: user.workspace.id, name: user.workspace.name },
        workspaces: user.workspaces,
      }}
      lookups={lookups}
    >
      {children}
    </AppShell>
  );
}
