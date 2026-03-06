// FilterPills — All / Sent / Received toggle
// Active pill uses theme primary color with primaryForeground text

import React from 'react';
import { TouchableOpacity, useColorScheme } from 'react-native';
import { ThemedView } from '@/components/ui/ThemedView';
import { ThemedText } from '@/components/ui/ThemedText';
import { Colors } from '@/constants/theme';
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
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  return (
    <ThemedView className="flex-row gap-2 px-6 mb-5">
      {FILTERS.map(({ key, label }) => {
        const isActive = active === key;
        return (
          <TouchableOpacity
            key={key}
            onPress={() => onChange(key)}
            activeOpacity={0.75}
            className="rounded-full px-5 py-2"
            style={{
              backgroundColor: isActive ? colors.primary : colors.surface,
              borderWidth: 1,
              borderColor: isActive ? colors.primary : colors.border,
            }}
          >
            <ThemedText
              type="defaultSemiBold"
              className="text-sm"
              style={{ color: isActive ? colors.primaryForeground : colors.mutedForeground }}
            >
              {label}
            </ThemedText>
          </TouchableOpacity>
        );
      })}
    </ThemedView>
  );
}
