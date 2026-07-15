import type { ReactNode } from 'react';
import { Tabs } from '@heroui/react';

export interface SectionTab {
  id: string;
  label: string;
  icon?: ReactNode;
}

interface SectionTabsProps {
  ariaLabel: string;
  selectedKey: string;
  onSelectionChange: (key: string) => void;
  tabs: SectionTab[];
}

export function SectionTabs({ ariaLabel, selectedKey, onSelectionChange, tabs }: SectionTabsProps) {
  return (
    <Tabs
      variant="secondary"
      selectedKey={selectedKey}
      onSelectionChange={(key) => onSelectionChange(String(key))}
      className="w-full"
    >
      <Tabs.ListContainer className="border-b border-border">
        <Tabs.List aria-label={ariaLabel} className="gap-1">
          {tabs.map((tab) => (
            <Tabs.Tab
              key={tab.id}
              id={tab.id}
              className="h-10 gap-2 px-3 text-sm font-medium text-muted-foreground data-[selected=true]:text-primary"
            >
              {tab.icon}
              {tab.label}
              <Tabs.Indicator className="bg-primary" />
            </Tabs.Tab>
          ))}
        </Tabs.List>
      </Tabs.ListContainer>
    </Tabs>
  );
}
