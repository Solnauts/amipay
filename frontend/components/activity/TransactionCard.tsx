// TransactionCard — single transaction row
// Delegates UI to shared TransactionRow

import React from 'react';
import { useColorScheme } from 'react-native';
import { TransactionRow } from '@/components/shared/TransactionRow';
import { ActivityTransaction } from '@/components/activity/activityData';
import { formatTime } from '@/utils/activityUtils';
import { ThemedView } from '@/components/ui/ThemedView';
import { Colors } from '@/constants/theme';

type Props = {
  transaction: ActivityTransaction;
};

export function TransactionCard({ transaction }: Props) {
  const colors = Colors[useColorScheme() ?? 'light'];
  const isSent = transaction.type === 'sent';

  const amountStr = `${isSent ? '-' : '+'}${Math.abs(transaction.amount)} ${transaction.token}`;
  const usdStr = `$${Math.abs(transaction.amount).toFixed(2)}`;
  const timeStr = formatTime(transaction.date);

  return (
    <ThemedView
      variant="default"
      className="mx-6 mb-1 py-1"
    >
      <TransactionRow
        name={transaction.name}
        initials={transaction.initials}
        avatarColor={transaction.color}
        type={transaction.type}
        amount={amountStr}
        amountSub={usdStr}
        time={timeStr}
        showBadge
        useIconInsteadOfAvatar
      />
    </ThemedView>
  );
}