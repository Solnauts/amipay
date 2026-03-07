import React, { useState } from 'react';
import { TouchableOpacity, useColorScheme } from 'react-native';
import { ThemedText } from '@/components/ui/ThemedText';
import { ThemedView } from '@/components/ui/ThemedView';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { GradientButton } from '@/components/ui/GradientButton';
import { useWallet } from '@/context/WalletContext';
import { Colors } from '@/constants/theme';
import { DepositModal } from '@/components/home/DepositModal';
import { WithdrawModal } from '@/components/home/WithdrawModal';

type Props = {
  balance: number | null;
  connecting: boolean;
};

export function BalanceSection({ balance, connecting }: Props) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { isConnected, connect } = useWallet();
  const [depositVisible, setDepositVisible] = useState(false);
  const [withdrawVisible, setWithdrawVisible] = useState(false);

  // Real USDC balance from platform API, formatted to 2 dp
  // Guard against undefined (API may not return 'balance' field yet)
  const safeBalance = (typeof balance === 'number' && !isNaN(balance)) ? balance : null;

  const usdcDisplay = safeBalance !== null
    ? safeBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '—';

  const [whole, cents] = usdcDisplay.includes('.')
    ? usdcDisplay.split('.')
    : [usdcDisplay, '00'];

  return (
    <>
      {/* ── Currency selector pill ── */}
      <ThemedView variant="default" className="flex-row justify-between items-center px-6 mb-2">
        <ThemedText variant="muted" className="text-sm">Total Balance</ThemedText>
        <TouchableOpacity
          activeOpacity={0.75}
          className="flex-row items-center gap-1 px-3 py-1 rounded-full"
          style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}
        >
          <ThemedText variant="secondary" className="text-sm font-medium">USDC</ThemedText>
          <IconSymbol name="chevron.down" size={11} color={colors.textMuted} />
        </TouchableOpacity>
      </ThemedView>

      {/* ── Large balance ── */}
      <ThemedView variant="default" className="px-6 pb-3">
        <ThemedView variant="default" className="flex-row items-end">
          <ThemedText variant="default" style={{ fontSize: 42, fontWeight: '800', lineHeight: 50 }}>
            {whole}
          </ThemedText>
          <ThemedText variant="default" style={{ fontSize: 26, fontWeight: '700', lineHeight: 44 }}>
            .{cents}
          </ThemedText>
        </ThemedView>
      </ThemedView>

      {/* ── Action buttons (Deposit / Withdraw or Connect Wallet) ── */}
      <ThemedView variant="default" className="flex-row gap-3 px-6 mb-6">
        {isConnected ? (
          <>
            <GradientButton
              label="Deposit"
              onPress={() => setDepositVisible(true)}
              icon="plus"
              variant="primary"
            />
            <GradientButton
              label="Withdraw"
              onPress={() => setWithdrawVisible(true)}
              icon="arrow.up.right"
              variant="primary"
            />
          </>
        ) : (
          <GradientButton
            label="Connect Wallet"
            onPress={connect}
            loading={connecting}
            icon="wallet.pass.fill"
            variant="primary"
          />
        )}
      </ThemedView>

      {/* ── Deposit modal ── */}
      <DepositModal
        visible={depositVisible}
        onClose={() => setDepositVisible(false)}
      />

      {/* ── Withdraw modal ── */}
      <WithdrawModal
        visible={withdrawVisible}
        onClose={() => setWithdrawVisible(false)}
      />
    </>
  );
}
