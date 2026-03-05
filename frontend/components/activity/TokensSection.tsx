// TokensSection — "Your Tokens" list on the Activities/Wallet screen
// Shows each token with icon, balance, and USD value. Reuses theme colors.

import React from 'react';
import { View, TouchableOpacity, useColorScheme } from 'react-native';
import { ThemedView } from '@/components/ui/ThemedView';
import { ThemedText } from '@/components/ui/ThemedText';
import { Colors } from '@/constants/theme';

type Token = {
  symbol: string;
  name: string;
  amount: number;
  usdValue: number;
  iconBg: string;
  iconText: string;
};

const TOKENS: Token[] = [
  { symbol: 'USDC', name: 'USD Coin',      amount: 2312.45, usdValue: 2487.50, iconBg: '#2775CA', iconText: '$'  },
  { symbol: 'SOL',  name: 'Solana',        amount: 12.5,    usdValue: 2487.50, iconBg: '#111827', iconText: '◎'  },
  { symbol: 'SEEKER', name: 'Seeker Token',amount: 1212.25, usdValue: 2487.50, iconBg: '#111827', iconText: 'S'  },
];

function formatAmount(n: number): string {
  return n % 1 === 0 ? n.toFixed(0) : n.toFixed(2);
}

export function TokensSection() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  return (
    <ThemedView className="px-6 mb-5">
      {/* Section header */}
      <ThemedView className="flex-row items-center justify-between mb-3">
        <ThemedText type="defaultSemiBold" variant="default" className="text-base">
          Your Tokens
        </ThemedText>
        <TouchableOpacity activeOpacity={0.7}>
          <ThemedText className="text-sm font-semibold" style={{ color: colors.primary }}>
            See all
          </ThemedText>
        </TouchableOpacity>
      </ThemedView>

      {/* Token rows */}
      {TOKENS.map((token, index) => (
        <TouchableOpacity
          key={token.symbol}
          activeOpacity={0.75}
          className="flex-row items-center py-3"
          style={{
            borderBottomWidth: index < TOKENS.length - 1 ? 1 : 0,
            borderBottomColor: colors.border,
          }}
        >
          {/* Token icon */}
          <View
            className="w-11 h-11 rounded-full items-center justify-center mr-3"
            style={{ backgroundColor: token.iconBg }}
          >
            <ThemedText
              style={{ color: '#ffffff', fontWeight: '700', fontSize: 16 }}
            >
              {token.iconText}
            </ThemedText>
          </View>

          {/* Symbol + name */}
          <ThemedView className="flex-1">
            <ThemedText type="defaultSemiBold" variant="default" className="text-sm">
              {token.symbol}
            </ThemedText>
            <ThemedText variant="muted" className="text-xs mt-0.5">
              {token.name}
            </ThemedText>
          </ThemedView>

          {/* Balance + USD */}
          <ThemedView className="items-end">
            <ThemedText type="defaultSemiBold" variant="default" className="text-sm">
              {formatAmount(token.amount)}
            </ThemedText>
            <ThemedText variant="muted" className="text-xs mt-0.5">
              ${token.usdValue.toFixed(2)}
            </ThemedText>
          </ThemedView>
        </TouchableOpacity>
      ))}
    </ThemedView>
  );
}
