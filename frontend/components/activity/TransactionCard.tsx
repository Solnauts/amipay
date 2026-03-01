// TransactionCard — single transaction row
// Avatar with initials + direction badge, name/description, amount + token

import React from 'react';
import { View, useColorScheme } from 'react-native';
import { ThemedView } from '@/components/ui/ThemedView';
import { ThemedText } from '@/components/ui/ThemedText';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Colors } from '@/constants/theme';
import { ActivityTransaction } from '@/components/activity/activityData';
import { formatTime, formatAmount } from '@/utils/activityUtils';

type Props = {
  transaction: ActivityTransaction;
};

export function TransactionCard({ transaction }: Props) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const isSent = transaction.type === 'sent';
  const amountColor = isSent ? colors.error : colors.success;
  const amountStr = formatAmount(transaction.amount);
  const timeStr = formatTime(transaction.date);

  return (
    <ThemedView
      variant="elevated"
      className="flex-row items-center rounded-2xl p-4 mx-6 mb-3"
      style={{ borderWidth: 1, borderColor: colors.border }}
    >
      {/* Avatar + direction badge */}
      <View className="mr-3 relative">
        <View
          className="w-11 h-11 rounded-full items-center justify-center"
          style={{ backgroundColor: transaction.color }}
        >
          <ThemedText className="text-white font-bold text-sm">
            {transaction.initials}
          </ThemedText>
        </View>

        {/* Direction badge — bottom-right corner of avatar */}
        <View
          className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full items-center justify-center"
          style={{ backgroundColor: isSent ? colors.error : colors.success }}
        >
          <MaterialIcons
            name={isSent ? 'arrow-outward' : 'arrow-downward'}
            size={11}
            color="#ffffff"
          />
        </View>
      </View>

      {/* Name + description */}
      <ThemedView variant="elevated" className="flex-1">
        <ThemedView variant="elevated" className="flex-row items-center gap-1.5">
          <ThemedText variant="default" type="defaultSemiBold" className="text-sm">
            {transaction.name}
          </ThemedText>
          {/* Online indicator dot */}
          <View className="w-1.5 h-1.5 rounded-full bg-success" />
        </ThemedView>
        <ThemedText variant="muted" className="text-xs mt-0.5">
          {transaction.description} · {timeStr}
        </ThemedText>
      </ThemedView>

      {/* Amount + token */}
      <ThemedView variant="elevated" className="items-end">
        <ThemedText
          type="defaultSemiBold"
          className="text-base"
          style={{ color: amountColor }}
        >
          {amountStr}
        </ThemedText>
        <ThemedText variant="muted" className="text-xs mt-0.5">
          {transaction.token}
        </ThemedText>
      </ThemedView>
    </ThemedView>
  );
}
