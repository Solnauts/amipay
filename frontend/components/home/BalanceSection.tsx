import React, { useState } from 'react';
import { View, TouchableOpacity, useColorScheme } from 'react-native';
import { ThemedText } from '@/components/ui/ThemedText';
import { ThemedView } from '@/components/ui/ThemedView';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ButtonComponent } from '@/components/ui/ButtonComponent';
import { useWallet } from '@/context/WalletContext';
import { Colors } from '@/constants/theme';

type Props = {
  balance: number | null;
  connecting: boolean;
};

const TOKENS = ['SOL', 'USDC', 'App Wallet'];

export function BalanceSection({ balance, connecting }: Props) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const isDark = colorScheme === 'dark';
  const surfaceBg = colors.surface;
  const borderColor = colors.border;

  const { isConnected, connect } = useWallet();
  const [selectedToken, setSelectedToken] = useState('SOL');

  return (
    <>
      {/* Balance numbers */}
      <ThemedView className="px-6 pb-6">
        <ThemedText variant="secondary" className="text-sm mb-1">Total Balance</ThemedText>
        <ThemedText variant="default" className="font-bold text-5xl mb-1">
          {isConnected && balance !== null ? balance.toFixed(4) : '-.----'}
        </ThemedText>
        <ThemedView className="flex-row items-center gap-1">
          <IconSymbol name="arrow.up.right" size={12} color="#22c55e" />
          <ThemedText className="text-success text-sm font-semibold">SOL</ThemedText>
          <ThemedText variant="muted" className="text-sm"> · Devnet</ThemedText>
        </ThemedView>
      </ThemedView>

      {/* Action buttons */}
      <ThemedView className="flex-row gap-3 px-6 mb-6">
        {isConnected ? (
          <>
            <TouchableOpacity
              className="flex-1 py-3 rounded-2xl items-center justify-center"
              style={{ borderWidth: 1.5, borderColor, backgroundColor: surfaceBg }}
            >
              <ThemedText variant="default" className="font-semibold text-base">Deposit</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity className="flex-1 py-3 rounded-2xl items-center justify-center bg-primary">
              <ThemedText className="text-white font-semibold text-base">Claim</ThemedText>
            </TouchableOpacity>
          </>
        ) : (
          <ButtonComponent
            label="Connect Wallet"
            onPress={connect}
            loading={connecting}
            icon="wallet.pass.fill"
            variant="primary"
          />
        )}
      </ThemedView>

      {/* Token pills — selectedToken drives active state */}
      <ThemedView className="flex-row gap-2 px-6 mb-8">
        {TOKENS.map((token) => {
          const isActive = token === selectedToken;
          return (
            <TouchableOpacity
              key={token}
              onPress={() => setSelectedToken(token)}
              activeOpacity={0.75}
              className={`px-4 py-2 rounded-full ${isActive ? 'bg-primary' : ''}`}
              style={!isActive ? { backgroundColor: surfaceBg, borderWidth: 1, borderColor } : {}}
            >
              <ThemedText className={`text-sm font-medium ${isActive ? 'text-white' : ''}`}>
                {token}
              </ThemedText>
            </TouchableOpacity>
          );
        })}
      </ThemedView>
    </>
  );
}
