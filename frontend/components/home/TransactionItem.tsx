import React from 'react';
import { useColorScheme } from 'react-native';
import { ThemedView } from '@/components/ui/ThemedView';
import { Colors } from '@/constants/theme';
import { TransactionRow } from '@/components/shared/TransactionRow';
import type { Transaction } from './homeData';

type Props = { transaction: Transaction };

/**
 * A single transaction row card.
 * Receives a Transaction and renders it using TransactionRow.
 */
export function TransactionItem({ transaction: tx }: Props) {
  const colors = Colors[useColorScheme() ?? 'light'];

  const amountStr = tx.amount; // already formatted in homeData

  return (
    <TransactionRow
      name={tx.name}
      initials={tx.initials}
      avatarColor={tx.color}
      type={tx.isDebit ? 'sent' : 'received'}
      amount={amountStr}
      subtitle={`${tx.subtitle} · ${tx.time}`}
      showBadge={false}
    />
  );
}
