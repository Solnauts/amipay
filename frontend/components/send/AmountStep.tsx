// AmountStep — Step 2: pick token, enter amount, see available balance
// Quick-amount pills + manual input

import React, { useState } from 'react';
import { TextInput, TouchableOpacity, useColorScheme } from 'react-native';
import { ThemedView } from '@/components/ui/ThemedView';
import { ThemedText } from '@/components/ui/ThemedText';
import { Colors } from '@/constants/theme';
import { Contact } from '@/components/cards/cardsData';

export type TokenType = 'SOL' | 'USDC' | 'SEEKER';

const TOKENS: { key: TokenType; icon: string }[] = [
  { key: 'SOL',    icon: '◎' },
  { key: 'USDC',   icon: '$' },
  { key: 'SEEKER', icon: '🔍' },
];

const QUICK_AMOUNTS = [50, 100, 500, 1000];

// Mock available balances per token
const AVAILABLE: Record<TokenType, string> = {
  SOL:    '12.50 SOL',
  USDC:   '44,482.45 USDC',
  SEEKER: '1,250.00 SEEKER',
};

type Props = {
  recipient: Contact;
  onContinue: (amount: number, token: TokenType) => void;
};

export function AmountStep({ recipient, onContinue }: Props) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const [token, setToken]     = useState<TokenType>('USDC');
  const [rawAmount, setRaw]   = useState('');

  const amount     = parseFloat(rawAmount) || 0;
  const canContinue = amount > 0;

  const handleQuick = (val: number) => setRaw(String(val));

  return (
    <ThemedView className="flex-1 px-6">

      {/* ── Selected recipient card ── */}
      <ThemedView
        variant="surface"
        className="flex-row items-center rounded-2xl px-4 py-3 mb-6 gap-4"
        style={{ borderWidth: 1, borderColor: colors.border }}
      >
        <ThemedView
          className="w-12 h-12 rounded-full items-center justify-center"
          style={{ backgroundColor: colors.muted }}
        >
          <ThemedText className="text-2xl">{recipient.emoji}</ThemedText>
        </ThemedView>
        <ThemedView variant="surface">
          <ThemedText type="defaultSemiBold" variant="default" className="text-base">
            {recipient.name}
          </ThemedText>
          <ThemedText variant="muted" className="text-xs mt-0.5">
            {recipient.shortAddress}
          </ThemedText>
        </ThemedView>
      </ThemedView>

      {/* ── Token selector ── */}
      <ThemedText variant="muted" className="text-sm font-semibold mb-3">
        Select Token
      </ThemedText>
      <ThemedView
        variant="surface"
        className="flex-row rounded-2xl p-1 mb-6"
        style={{ borderWidth: 1, borderColor: colors.border }}
      >
        {TOKENS.map(({ key, icon }) => {
          const isActive = token === key;
          return (
            <TouchableOpacity
              key={key}
              onPress={() => { setToken(key); setRaw(''); }}
              activeOpacity={0.75}
              className="flex-1 rounded-xl py-3 items-center gap-1"
              style={{ backgroundColor: isActive ? colors.text : 'transparent' }}
            >
              <ThemedText
                className="text-base"
                style={{ color: isActive ? colors.background : colors.mutedForeground }}
              >
                {icon}
              </ThemedText>
              <ThemedText
                type="defaultSemiBold"
                className="text-xs"
                style={{ color: isActive ? colors.background : colors.mutedForeground }}
              >
                {key}
              </ThemedText>
            </TouchableOpacity>
          );
        })}
      </ThemedView>

      {/* ── Amount input ── */}
      <ThemedText variant="muted" className="text-sm font-semibold mb-2">
        Amount
      </ThemedText>
      <ThemedView
        variant="surface"
        className="flex-row items-center rounded-2xl px-5 mb-1"
        style={{
          borderWidth: 1,
          borderColor: canContinue ? colors.primary : colors.border,
          height: 70,
        }}
      >
        <TextInput
          value={rawAmount}
          onChangeText={setRaw}
          placeholder="0.00"
          placeholderTextColor={colors.mutedForeground}
          keyboardType="decimal-pad"
          style={{
            flex: 1,
            fontSize: 36,
            fontWeight: '700',
            color: canContinue ? colors.text : colors.mutedForeground,
          }}
        />
        <ThemedText variant="muted" className="text-base font-semibold">
          {token}
        </ThemedText>
      </ThemedView>

      {/* Available balance */}
      <ThemedText variant="muted" className="text-xs mb-5">
        Available: {AVAILABLE[token]}
      </ThemedText>

      {/* ── Quick-amount pills ── */}
      <ThemedView className="flex-row gap-2 mb-8">
        {QUICK_AMOUNTS.map((val) => (
          <TouchableOpacity
            key={val}
            onPress={() => handleQuick(val)}
            activeOpacity={0.75}
            className="flex-1 rounded-xl py-2 items-center"
            style={{
              borderWidth: 1,
              borderColor: amount === val ? colors.primary : colors.border,
              backgroundColor: amount === val
                ? colorScheme === 'dark' ? '#1a2e20' : '#f0fdf4'
                : colors.surface,
            }}
          >
            <ThemedText
              type="defaultSemiBold"
              className="text-sm"
              style={{ color: amount === val ? colors.primary : colors.mutedForeground }}
            >
              ${val}
            </ThemedText>
          </TouchableOpacity>
        ))}
      </ThemedView>

      {/* ── Continue button ── */}
      <TouchableOpacity
        onPress={() => canContinue && onContinue(amount, token)}
        activeOpacity={canContinue ? 0.85 : 1}
        className="rounded-2xl py-4 items-center"
        style={{ backgroundColor: canContinue ? colors.text : colors.muted }}
      >
        <ThemedText
          type="defaultSemiBold"
          className="text-base"
          style={{ color: canContinue ? colors.background : colors.mutedForeground }}
        >
          Continue
        </ThemedText>
      </TouchableOpacity>
    </ThemedView>
  );
}
