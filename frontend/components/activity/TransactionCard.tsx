// TransactionCard — single transaction row
// Delegates UI to shared TransactionRow

import React from 'react';
import { TransactionRow } from '@/components/shared/TransactionRow';
import { ActivityTransaction } from '@/components/activity/activityData';
import { formatTime } from '@/utils/activityUtils';

type Props = {
  transaction: ActivityTransaction;
};

export function TransactionCard({ transaction }: Props) {
  const isSent = transaction.type === 'sent';

  const amountStr = `${isSent ? '-' : '+'}${Math.abs(transaction.amount)} ${transaction.token}`;
  const usdStr = `$${Math.abs(transaction.amount).toFixed(2)}`;
  const timeStr = formatTime(transaction.date);

  return (
    <TransactionRow
      name={transaction.name}
      initials={transaction.initials}
      avatarColor={transaction.color}
      type={transaction.type}
      amount={amountStr}
      amountSub={usdStr}
      time={timeStr}
      showBadge
    />
  );
}