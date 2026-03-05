// TransactionCard — single transaction row
// Avatar with direction badge, name/time, token amount + USD value

import React from 'react';
import { View, useColorScheme } from 'react-native';
import { ThemedView } from '@/components/ui/ThemedView';
import { ThemedText } from '@/components/ui/ThemedText';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Colors } from '@/constants/theme';
import { ActivityTransaction } from '@/components/activity/activityData';
import { formatTime } from '@/utils/activityUtils';

type Props = {
  transaction: ActivityTransaction;
};

export function TransactionCard({ transaction }: Props) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const isSent = transaction.type === 'sent';
  const amountColor = isSent ? colors.error : colors.success;
  const amountStr = `${isSent ? '-' : '+'}${Math.abs(transaction.amount)} ${transaction.token}`;
  const usdStr = `$${Math.abs(transaction.amount).toFixed(2)}`;
  const timeStr = formatTime(transaction.date);

  return (
    <ThemedView
      variant="default"
      className="flex-row items-center px-6 py-3"
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

        {/* Direction badge — bottom-right corner */}
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

      {/* Name + time */}
      <ThemedView variant="default" className="flex-1">
        <ThemedText variant="default" type="defaultSemiBold" className="text-sm">
          {transaction.name}
        </ThemedText>
        <ThemedText variant="muted" className="text-xs mt-0.5">
          {timeStr}
        </ThemedText>
      </ThemedView>

      {/* Token amount + USD */}
      <ThemedView variant="default" className="items-end">
        <ThemedText
          type="defaultSemiBold"
          className="text-sm"
          style={{ color: amountColor }}
        >
          {amountStr}
        </ThemedText>
        <ThemedText variant="muted" className="text-xs mt-0.5">
          {usdStr}
        </ThemedText>
      </ThemedView>
    </ThemedView>
  );
}
