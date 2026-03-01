import React from 'react';
import { View, TouchableOpacity, useColorScheme } from 'react-native';
import { router } from 'expo-router';
import { ThemedText } from '@/components/ui/ThemedText';
import { ThemedView } from '@/components/ui/ThemedView';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { TRANSACTIONS } from './homeData';

type Props = {
  isConnected: boolean;
  onConnect: () => void;
};

export function RecentTransactions({ isConnected, onConnect }: Props) {
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';
  const surfaceBg = isDark ? '#1f2937' : '#ffffff';
  const borderColor = isDark ? '#374151' : '#e5e7eb';
  const textMuted = '#9ca3af';

  return (
    <ThemedView className="px-6">
      <ThemedView className="flex-row items-center justify-between mb-4">
        <ThemedText variant="default" className="font-bold text-lg">Recent Transactions</ThemedText>
        <TouchableOpacity onPress={() => router.push('/activities')}>
          <ThemedText className="text-primary text-sm font-semibold">View All →</ThemedText>
        </TouchableOpacity>
      </ThemedView>

      {isConnected ? (
        <ThemedView className="gap-3">
          {TRANSACTIONS.map((tx, idx) => (
            <ThemedView
              key={idx}
              className="flex-row items-center rounded-2xl p-4"
              style={{ backgroundColor: surfaceBg, borderWidth: 1, borderColor }}
            >
              <View
                className="w-11 h-11 rounded-full items-center justify-center mr-3"
                style={{ backgroundColor: tx.color }}
              >
                <ThemedText className="text-white font-bold text-sm">{tx.initials}</ThemedText>
              </View>
              <ThemedView className="flex-1">
                <ThemedText variant="default" className="font-semibold text-sm">{tx.name}</ThemedText>
                <ThemedText variant="muted" className="text-xs">{tx.subtitle} · {tx.time}</ThemedText>
              </ThemedView>
              <ThemedText className={`font-bold text-sm ${tx.isDebit ? 'text-error' : 'text-success'}`}>
                {tx.amount}
              </ThemedText>
            </ThemedView>
          ))}
        </ThemedView>
      ) : (
        /* Not connected empty state */
        <ThemedView
          className="rounded-2xl p-6 items-center"
          style={{ backgroundColor: surfaceBg, borderWidth: 1, borderColor }}
        >
          <IconSymbol name="lock.fill" size={28} color={textMuted} />
          <ThemedText variant="muted" className="text-sm mt-3 text-center">
            Connect your wallet{'\n'}to see your transactions.
          </ThemedText>
          <TouchableOpacity onPress={onConnect} className="mt-4">
            <ThemedText className="text-primary text-sm font-semibold">Connect Wallet →</ThemedText>
          </TouchableOpacity>
        </ThemedView>
      )}
    </ThemedView>
  );
}
