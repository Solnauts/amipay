// TransactionGroup — date section header + cards below it

import React from 'react';
import { ThemedView } from '@/components/ui/ThemedView';
import { ThemedText } from '@/components/ui/ThemedText';
import { TransactionCard } from './TransactionCard';
import { TransactionGroup as TxGroup } from '@/utils/activityUtils';

type Props = {
  group: TxGroup;
};

export function TransactionGroup({ group }: Props) {
  return (
    <ThemedView className="mb-2">
      {/* Date label header */}
      <ThemedText
        variant="muted"
        className="text-xs font-semibold tracking-widest px-6 mb-3"
      >
        {group.label}
      </ThemedText>

      {/* Transaction cards */}
      {group.data.map((tx) => (
        <TransactionCard key={tx.id} transaction={tx} />
      ))}
    </ThemedView>
  );
}
