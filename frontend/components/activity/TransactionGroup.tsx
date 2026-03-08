// TransactionGroup — date section header + transaction rows below
// Header label shown as "Today", "Yesterday", etc.

import React from 'react';
import { useColorScheme } from 'react-native';
import { ThemedView } from '@/components/ui/ThemedView';
import { ThemedText } from '@/components/ui/ThemedText';
import { TransactionCard } from './TransactionCard';
import { TransactionGroup as TxGroup } from '@/utils/activityUtils';
import { Colors } from '@/constants/theme';

type Props = {
  group: TxGroup;
};

// Convert "TODAY" → "Today", "YESTERDAY" → "Yesterday", etc.
function toTitleCase(s: string): string {
  return s.charAt(0) + s.slice(1).toLowerCase();
}

export function TransactionGroup({ group }: Props) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  return (
    <ThemedView className="mb-1">
      {/* Date label — "Today", "Yesterday", "Last Week" */}
      <ThemedText
        variant="muted"
        className="text-sm font-medium px-6 mt-5 mb-1"
      >
        {toTitleCase(group.label)}
      </ThemedText>

      {/* Transaction rows */}
      {group.data.map((tx) => (
        <TransactionCard key={tx.id} transaction={tx} />
      ))}
    </ThemedView>
  );
}
