import React from 'react';
import { router } from 'expo-router';
import { TouchableOpacity, View } from 'react-native';
import { ThemedText } from '@/components/ui/ThemedText';
import { ThemedView } from '@/components/ui/ThemedView';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { TransactionItem } from './TransactionItem';
import { useWallet } from '@/context/WalletContext';
import { Colors } from '@/constants/theme';
import { TRANSACTIONS } from './homeData';
import { useColorScheme } from 'react-native';

type Props = {
  isConnected: boolean;
  onConnect: () => void;
};

export function RecentTransactions({ isConnected, onConnect }: Props) {
  const colors = Colors[useColorScheme() ?? 'light'];

  return (
    <ThemedView variant="default" className="px-6 mb-8">
      {/* Header row */}
      <ThemedView variant="default" className="flex-row items-center justify-between mb-4">
        <ThemedText variant="default" className="font-bold text-lg">Recent Transactions</ThemedText>
        <TouchableOpacity onPress={() => router.push('/activities')} activeOpacity={0.7}>
          <ThemedText style={{ color: colors.violet, fontSize: 13, fontWeight: '600' }}>
            View All →
          </ThemedText>
        </TouchableOpacity>
      </ThemedView>

      {isConnected ? (
        <ThemedView variant="default" className="gap-3">
          {TRANSACTIONS.map((tx, idx) => (
            <TransactionItem key={idx} transaction={tx} />
          ))}
        </ThemedView>
      ) : (
        /* Empty / locked state */
        <ThemedView
          variant="surface"
          className="rounded-2xl p-6 items-center"
          style={{ borderWidth: 1, borderColor: colors.border }}
        >
          <IconSymbol name="lock.fill" size={28} color={colors.textMuted} />
          <ThemedText variant="muted" className="text-sm mt-3 text-center">
            Connect your wallet{'\n'}to see your transactions.
          </ThemedText>
          <TouchableOpacity onPress={onConnect} className="mt-4" activeOpacity={0.7}>
            <ThemedText style={{ color: colors.violet, fontSize: 13, fontWeight: '600' }}>
              Connect Wallet →
            </ThemedText>
          </TouchableOpacity>
        </ThemedView>
      )}
    </ThemedView>
  );
}
