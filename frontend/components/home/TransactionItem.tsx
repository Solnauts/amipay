import React from 'react';
import { View, useColorScheme } from 'react-native';
import { ThemedText } from '@/components/ui/ThemedText';
import { ThemedView } from '@/components/ui/ThemedView';
import { Colors } from '@/constants/theme';
import type { Transaction } from './homeData';

type Props = { transaction: Transaction };

/**
 * A single transaction row card.
 * Receives a Transaction and renders it using fully themed colours.
 */
export function TransactionItem({ transaction: tx }: Props) {
  const colors = Colors[useColorScheme() ?? 'light'];

  return (
    <ThemedView
      variant="surface"
      className="flex-row items-center rounded-2xl p-4"
      style={{ borderWidth: 1, borderColor: colors.border }}
    >
      {/* Avatar */}
      <View
        className="w-11 h-11 rounded-full items-center justify-center mr-3"
        style={{ backgroundColor: tx.color }}
      >
        <ThemedText style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>
          {tx.initials}
        </ThemedText>
      </View>

      {/* Labels */}
      <ThemedView variant="surface" className="flex-1">
        <ThemedText variant="default" className="font-semibold text-sm">{tx.name}</ThemedText>
        <ThemedText variant="muted" className="text-xs">{tx.subtitle} · {tx.time}</ThemedText>
      </ThemedView>

      {/* Amount */}
      <ThemedText
        className="font-bold text-sm"
        style={{ color: tx.isDebit ? colors.error : colors.success }}
      >
        {tx.amount}
      </ThemedText>
    </ThemedView>
  );
}
