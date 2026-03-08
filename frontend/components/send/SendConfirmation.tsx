// SendConfirmation — Step 3 of Send Payment
// Shows "You're sending X TOKEN ≈ $Y USD", To/Wallet/Network/Fee rows,
// warning banner, and Confirm & Send button

import React from 'react';
import { TouchableOpacity, View, useColorScheme } from 'react-native';
import { ThemedView } from '@/components/ui/ThemedView';
import { ThemedText } from '@/components/ui/ThemedText';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Colors } from '@/constants/theme';
import { Contact } from '@/components/cards/cardsData';
import { TokenType } from '@/components/send/AmountStep';

type Props = {
  recipient: Contact;
  amount: number;
  token: TokenType;
  onSend: () => void;
};

export function SendConfirmation({ recipient, amount, token, onSend }: Props) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  // Simplified USD equiv (1:1 for USDC, mock rate for others)
  const usdEquiv =
    token === 'USDC'
      ? amount
      : token === 'SOL'
      ? amount * 130
      : amount * 0.05;

  const rows = [
    { label: 'To',      value: recipient.name },
    { label: 'Wallet',  value: recipient.shortAddress },
    { label: 'Network', value: 'Solana' },
    { label: 'Fee',     value: '~0.000005 SOL' },
  ];

  return (
    <ThemedView className="flex-1 px-6">

      {/* ── Summary card ── */}
      <ThemedView
        variant="surface"
        className="rounded-3xl px-6 pt-7 pb-6 mb-5"
        style={{ borderWidth: 1, borderColor: colors.border }}
      >
        {/* Header text */}
        <ThemedText variant="muted" className="text-sm text-center mb-2">
          You're sending
        </ThemedText>
        <ThemedText type="title" variant="default" className="text-center mb-1">
          {amount} {token}
        </ThemedText>
        <ThemedText variant="muted" className="text-sm text-center mb-6">
          ≈ ${usdEquiv.toFixed(2)} USD
        </ThemedText>

        {/* Divider */}
        <View style={{ height: 1, backgroundColor: colors.border, marginBottom: 16 }} />

        {/* Info rows */}
        {rows.map(({ label, value }) => (
          <ThemedView
            key={label}
            variant="surface"
            className="flex-row items-center justify-between mb-3"
          >
            <ThemedText variant="muted" className="text-sm">{label}</ThemedText>
            <ThemedText type="defaultSemiBold" variant="default" className="text-sm">
              {value}
            </ThemedText>
          </ThemedView>
        ))}
      </ThemedView>

      {/* ── Warning banner ── */}
      <ThemedView
        className="flex-row items-start rounded-2xl px-4 py-4 mb-6 gap-3"
        style={{
          backgroundColor: colorScheme === 'dark' ? '#2d2306' : '#fffbeb',
          borderWidth: 1,
          borderColor: colorScheme === 'dark' ? '#78350f' : '#fde68a',
        }}
      >
        <MaterialIcons name="warning-amber" size={18} color={colors.warning} style={{ marginTop: 1 }} />
        <ThemedText
          variant="default"
          className="flex-1 text-sm leading-5"
          style={{ color: colors.warning }}
        >
          Please double-check the recipient address.{'\n'}
          Cryptocurrency transactions are irreversible.
        </ThemedText>
      </ThemedView>

      {/* ── Confirm & Send button ── */}
      <TouchableOpacity
        onPress={onSend}
        activeOpacity={0.85}
        style={{ borderRadius: 18, overflow: 'hidden' }}
      >
        <LinearGradient
          colors={[colors.primary, colors.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ paddingVertical: 17, alignItems: 'center', borderRadius: 18 }}
        >
          <ThemedText
            type="defaultSemiBold"
            className="text-base"
            style={{ color: colors.primaryForeground }}
          >
            Confirm & Send
          </ThemedText>
        </LinearGradient>
      </TouchableOpacity>
    </ThemedView>
  );
}
