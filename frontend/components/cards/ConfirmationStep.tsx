// ConfirmationStep — Step 4: review and confirm the payment
// Shows total, per-member breakdown, network/fee info, warning, and Send button

import React from 'react';
import { TouchableOpacity, View, useColorScheme } from 'react-native';
import { ThemedView } from '@/components/ui/ThemedView';
import { ThemedText } from '@/components/ui/ThemedText';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Colors } from '@/constants/theme';
import { Contact } from '@/components/cards/cardsData';
import { MemberAmounts } from '@/components/cards/SplitAmountStep';
import { formatSplitAmount } from '@/utils/cardsUtils';

type Props = {
  members: Contact[];
  amounts: MemberAmounts;      // contactId → amount
  total: number;
  onSend: () => void;
};

export function ConfirmationStep({ members, amounts, total, onSend }: Props) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  return (
    <ThemedView className="flex-1 px-6">

      {/* ── Summary card ── */}
      <ThemedView
        variant="surface"
        className="rounded-3xl px-6 pt-6 pb-5 mb-5"
        style={{ borderWidth: 1, borderColor: colors.border }}
      >
        {/* Total header */}
        <ThemedText variant="muted" className="text-sm text-center mb-1">
          Total Amount
        </ThemedText>
        <ThemedText
          type="title"
          variant="default"
          className="text-center mb-1"
        >
          {formatSplitAmount(total)} USDC
        </ThemedText>
        <ThemedText variant="muted" className="text-sm text-center mb-5">
          to {members.length} recipient{members.length !== 1 ? 's' : ''}
        </ThemedText>

        {/* Divider */}
        <View style={{ height: 1, backgroundColor: colors.border, marginBottom: 16 }} />

        {/* Per-member rows */}
        {members.map((member) => (
          <ThemedView
            key={member.id}
            variant="surface"
            className="flex-row items-center justify-between mb-3"
          >
            <ThemedView variant="surface" className="flex-row items-center gap-3">
              <ThemedText className="text-xl">{member.emoji}</ThemedText>
              <ThemedText type="defaultSemiBold" variant="default" className="text-sm">
                {member.name}
              </ThemedText>
            </ThemedView>
            <ThemedText variant="default" className="text-sm">
              {formatSplitAmount(amounts[member.id] ?? 0)} USDC
            </ThemedText>
          </ThemedView>
        ))}

        {/* Divider */}
        <View style={{ height: 1, backgroundColor: colors.border, marginTop: 4, marginBottom: 14 }} />

        {/* Network info */}
        <ThemedView variant="surface" className="flex-row items-center justify-between mb-2">
          <ThemedText variant="muted" className="text-sm">Network</ThemedText>
          <ThemedText type="defaultSemiBold" variant="default" className="text-sm">
            Solana
          </ThemedText>
        </ThemedView>
        <ThemedView variant="surface" className="flex-row items-center justify-between">
          <ThemedText variant="muted" className="text-sm">Total Fee</ThemedText>
          <ThemedText type="defaultSemiBold" variant="default" className="text-sm">
            ~0.000015 SOL
          </ThemedText>
        </ThemedView>
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
          You're about to send {members.length} transaction{members.length !== 1 ? 's' : ''}.
          Please ensure all recipient addresses are correct.
        </ThemedText>
      </ThemedView>

      {/* ── Send to Group button (primary/blue gradient) ── */}
      <TouchableOpacity onPress={onSend} activeOpacity={0.85} style={{ borderRadius: 18, overflow: 'hidden' }}>
        <LinearGradient
          colors={[colors.primary, colors.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{
            paddingVertical: 17,
            alignItems: 'center',
            borderRadius: 18,
          }}
        >
          <ThemedText
            type="defaultSemiBold"
            className="text-base"
            style={{ color: colors.primaryForeground }}
          >
            Send to Group
          </ThemedText>
        </LinearGradient>
      </TouchableOpacity>
    </ThemedView>
  );
}
