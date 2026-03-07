// FilterPills — All / Sent / Received toggle
// Now uses PillBadge from ui/

import React from 'react';
import { ThemedView } from '@/components/ui/ThemedView';
import { PillBadge } from '@/components/ui/PillBadge';
import { FilterType } from '@/utils/activityUtils';

const FILTERS: { key: FilterType; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'sent', label: 'Sent' },
  { key: 'received', label: 'Received' },
];

type Props = {
  active: FilterType;
  onChange: (filter: FilterType) => void;
};

export function FilterPills({ active, onChange }: Props) {
  return (
    <ThemedView className="flex-row gap-2 px-6 mb-3">
      {FILTERS.map(({ key, label }) => (
        <PillBadge
          key={key}
          label={label}
          isActive={active === key}
          onPress={() => onChange(key)}
        />
      ))}
    </ThemedView>
  );
}
