"use client";

import type { ReactNode } from "react";
import { Tabs as RadixTabs } from "radix-ui";

export type TabItem = { id: string; label: string; count?: number; content: ReactNode };

export function Tabs({ tabs, defaultTab }: { tabs: TabItem[]; defaultTab?: string }) {
  return (
    <RadixTabs.Root defaultValue={defaultTab ?? tabs[0]?.id}>
      <RadixTabs.List className="-mx-4 flex gap-1 overflow-x-auto border-b border-line px-4 [scrollbar-width:none] lg:mx-0 lg:px-0">
        {tabs.map((tab) => (
          <RadixTabs.Trigger
            key={tab.id}
            value={tab.id}
            className="-mb-px flex h-10 shrink-0 items-center gap-1.5 border-b-2 border-transparent px-2.5 text-sm text-muted outline-none hover:text-fg focus-visible:bg-subtle data-[state=active]:border-accent data-[state=active]:font-medium data-[state=active]:text-fg"
          >
            {tab.label}
            {tab.count !== undefined && <span className="num text-xs text-muted">{tab.count}</span>}
          </RadixTabs.Trigger>
        ))}
      </RadixTabs.List>
      {tabs.map((tab) => (
        <RadixTabs.Content key={tab.id} value={tab.id} className="pt-4 outline-none">
          {tab.content}
        </RadixTabs.Content>
      ))}
    </RadixTabs.Root>
  );
}
