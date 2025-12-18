import React from 'react';
import clsx from 'clsx';

export interface TabItem {
  id: string;
  label: string;
  count?: number;
}

interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (id: string) => void;
}

export const Tabs: React.FC<TabsProps> = ({ tabs, activeTab, onChange }) => {
  return (
    <div className="border-b border-[var(--border-subtle)]">
      <nav className="-mb-px flex gap-6 overflow-x-auto text-sm">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={clsx(
              'whitespace-nowrap border-b-2 pb-3 font-medium transition-colors',
              activeTab === tab.id
                ? 'border-[var(--primary)] text-[var(--text)]'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text)]'
            )}
            onClick={() => onChange(tab.id)}
          >
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span
                className={clsx(
                  'ml-2 rounded-full px-2 py-0.5 text-xs',
                  activeTab === tab.id
                    ? 'bg-[color-mix(in_oklab,var(--primary)_18%,var(--background)_82%)] text-[var(--text)]'
                    : 'bg-[color-mix(in_oklab,var(--background)_90%,var(--light)_10%)] text-[var(--text-secondary)]'
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </nav>
    </div>
  );
};
