// SplitAmountStep — Step 3: enter total, see split breakdown
// Split Equally: one total input, auto-divided per person
// Custom Amount: each member gets their own standalone input box

import React, { useState, useCallback } from 'react';
import { TextInput, TouchableOpacity, useColorScheme } from 'react-native';
import { ThemedView } from '@/components/ui/ThemedView';
import { ThemedText } from '@/components/ui/ThemedText';
import { Colors } from '@/constants/theme';
import { Contact } from '@/components/cards/cardsData';
import { splitEqually, formatSplitAmount, parseAmount } from '@/utils/cardsUtils';

type SplitMode = 'equal' | 'custom';

export type MemberAmounts = Record<string, number>; // contactId → amount

type Props = {
  members: Contact[];
  // passes total + per-member map to parent for use in confirmation
  onContinue: (total: number, amounts: MemberAmounts) => void;
};

export function SplitAmountStep({ members, onContinue }: Props) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const [mode, setMode] = useState<SplitMode>('equal');
  const [rawTotal, setRawTotal] = useState('');
  const [customRaw, setCustomRaw] = useState<Record<string, string>>({});

  const setCustomAmount = useCallback((id: string, value: string) => {
    setCustomRaw((prev) => ({ ...prev, [id]: value }));
  }, []);

  // Derived totals
  const equalTotal = parseAmount(rawTotal);
  const perPerson  = splitEqually(equalTotal, members.length);
  const customTotal = members.reduce(
    (sum, m) => sum + parseAmount(customRaw[m.id] ?? ''),
    0,
  );
  const total       = mode === 'equal' ? equalTotal : customTotal;
  const canContinue = total > 0;

  const handleModeSwitch = (next: SplitMode) => {
    setMode(next);
    setRawTotal('');
    setCustomRaw({});
  };

  const handleContinue = () => {
    if (!canContinue) return;
    const amounts: MemberAmounts = {};
    members.forEach((m) => {
      amounts[m.id] =
        mode === 'equal' ? perPerson : parseAmount(customRaw[m.id] ?? '');
    });
    onContinue(total, amounts);
  };

  return (
    <ThemedView className="flex-1 px-6">

      {/* ── Split mode toggle ── */}
      <ThemedView
        variant="surface"
        className="flex-row rounded-2xl p-1 mb-6"
        style={{ borderWidth: 1, borderColor: colors.border }}
      >
        {(['equal', 'custom'] as SplitMode[]).map((m) => {
          const isActive = mode === m;
          return (
            <TouchableOpacity
              key={m}
              onPress={() => handleModeSwitch(m)}
              activeOpacity={0.75}
              className="flex-1 rounded-xl py-3 items-center"
              style={{ backgroundColor: isActive ? colors.text : 'transparent' }}
            >
              <ThemedText
                type="defaultSemiBold"
                className="text-sm"
                style={{ color: isActive ? colors.background : colors.mutedForeground }}
              >
                {m === 'equal' ? 'Split Equally' : 'Custom Amount'}
              </ThemedText>
            </TouchableOpacity>
          );
        })}
      </ThemedView>

      {/* ── EQUAL: single total input ── */}
      {mode === 'equal' && (
        <>
          <ThemedText variant="muted" className="text-sm font-semibold mb-2">
            Total Amount
          </ThemedText>
          <ThemedView
            variant="surface"
            className="flex-row items-center rounded-2xl px-5 mb-1"
            style={{
              borderWidth: 1,
              borderColor: canContinue ? colors.primary : colors.border,
              height: 64,
            }}
          >
            <TextInput
              value={rawTotal}
              onChangeText={setRawTotal}
              placeholder="0.00"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="decimal-pad"
              style={{
                flex: 1,
                fontSize: 32,
                fontWeight: '700',
                color: canContinue ? colors.text : colors.mutedForeground,
              }}
            />
            <ThemedText variant="muted" className="text-base font-semibold">
              USDC
            </ThemedText>
          </ThemedView>
          {canContinue && (
            <ThemedText variant="muted" className="text-xs mb-4">
              {formatSplitAmount(perPerson)} USDC per person
            </ThemedText>
          )}
          <ThemedView className="mb-3" />
        </>
      )}

      {/* ── Section label ── */}
      <ThemedText variant="muted" className="text-sm font-semibold mb-3">
        {mode === 'equal' ? 'Split Breakdown' : 'Enter Amounts'}
      </ThemedText>

      {/* ── Member rows ── */}
      {members.map((member) => {
        const rawVal     = customRaw[member.id] ?? '';
        const customAmt  = parseAmount(rawVal);
        const customActive = customAmt > 0;

        return (
          <ThemedView
            key={member.id}
            variant="surface"
            className="flex-row items-center rounded-2xl px-4 py-3 mb-2"
          >
            {/* Avatar */}
            <ThemedView
              className="w-10 h-10 rounded-full items-center justify-center mr-3"
              style={{ backgroundColor: colors.muted }}
            >
              <ThemedText className="text-xl">{member.emoji}</ThemedText>
            </ThemedView>

            {/* Name + address */}
            <ThemedView variant="surface" className="flex-1">
              <ThemedText type="defaultSemiBold" variant="default" className="text-sm">
                {member.name}
              </ThemedText>
              <ThemedText variant="muted" className="text-xs">{member.shortAddress}</ThemedText>
            </ThemedView>

            {/* Amount block */}
            {mode === 'equal' ? (
              // Read-only in equal mode
              <ThemedView
                variant="elevated"
                className="rounded-xl px-4 py-2 items-center"
                style={{ minWidth: 72, borderWidth: 1, borderColor: colors.border }}
              >
                <ThemedText type="defaultSemiBold" variant="default" className="text-sm">
                  {formatSplitAmount(perPerson)}
                </ThemedText>
              </ThemedView>
            ) : (
              // Standalone editable box per member
              <ThemedView
                variant="elevated"
                className="rounded-xl items-center"
                style={{
                  minWidth: 80,
                  borderWidth: 1.5,
                  borderColor: customActive ? colors.primary : colors.border,
                }}
              >
                <TextInput
                  value={rawVal}
                  onChangeText={(v) => setCustomAmount(member.id, v)}
                  placeholder="0.00"
                  placeholderTextColor={colors.mutedForeground}
                  keyboardType="decimal-pad"
                  style={{
                    fontSize: 15,
                    fontWeight: '600',
                    color: customActive ? colors.text : colors.mutedForeground,
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    textAlign: 'center',
                    minWidth: 80,
                  }}
                />
              </ThemedView>
            )}
          </ThemedView>
        );
      })}

      {/* ── Total row ── */}
      <ThemedView
        variant="surface"
        className="flex-row items-center justify-between rounded-2xl px-4 py-4 mt-1 mb-6"
        style={{ borderWidth: 1, borderColor: colors.border }}
      >
        <ThemedText type="defaultSemiBold" variant="default" className="text-sm">
          Total
        </ThemedText>
        <ThemedText type="defaultSemiBold" variant="default" className="text-sm">
          {formatSplitAmount(total)} USDC
        </ThemedText>
      </ThemedView>

      {/* ── Continue button ── */}
      <TouchableOpacity
        onPress={handleContinue}
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
