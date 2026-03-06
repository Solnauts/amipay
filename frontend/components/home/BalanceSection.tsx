import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet, useColorScheme } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemedText } from '@/components/ui/ThemedText';
import { ThemedView } from '@/components/ui/ThemedView';
import { IconSymbol } from '@/components/ui/icon-symbol';
import ButtonComponent from "@/components/ui/ButtonComponent"
import { useWallet } from '@/context/WalletContext';
import { Colors } from '@/constants/theme';
import { DepositModal } from '@/components/home/DepositModal';
import { WithdrawModal } from '@/components/home/WithdrawModal';

type Props = {
  balance: number | null;
  connecting: boolean;
};

const TOKENS = ['SOL', 'USDC', 'App Wallet'];
// Fake USD balance for display purposes
const FAKE_USD_BALANCE = 0.00;

export function BalanceSection({ balance, connecting }: Props) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { isConnected, connect } = useWallet();
  const [depositVisible, setDepositVisible] = useState(false);
  const [withdrawVisible, setWithdrawVisible] = useState(false);


  const displayBalance = isConnected && balance !== null
    ? `$${(balance * FAKE_USD_BALANCE).toFixed(2)}`   
    : `$${FAKE_USD_BALANCE.toFixed(2)}`;

  const [whole, cents] = displayBalance.split('.');

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
          <ThemedText variant="secondary" className="text-sm font-medium">$ USD</ThemedText>
          <IconSymbol name="chevron.down" size={11} color={colors.textMuted} />
        </TouchableOpacity>
      </ThemedView>

      {/* ── Large balance ── */}
      <ThemedView variant="default" className="px-6 pb-3">
        <View className="flex-row items-end">
          <ThemedText variant="default" style={{ fontSize: 42, fontWeight: '800', lineHeight: 50 }}>
            {whole}
          </ThemedText>
          <ThemedText variant="default" style={{ fontSize: 26, fontWeight: '700', lineHeight: 44 }}>
            .{cents}
          </ThemedText>
        </View>

        {/* Gain pill */}
        {/* <ThemedView
          className="self-start flex-row items-center px-3 py-1 rounded-full mt-2 mb-1"
          style={{ backgroundColor: '#c3f53c' }}
        >
          <ThemedText style={{ color: '#1a2e05', fontWeight: '700', fontSize: 12, fontFamily: 'Poppins_700Bold' }}>
            ${FAKE_GAIN_USD.toFixed(2)} ({FAKE_GAIN_PCT}%)
          </ThemedText>
        </ThemedView> */}
      </ThemedView>

      {/* ── Action buttons (Deposit / Withdraw or Connect Wallet) ── */}
      <ThemedView variant="default" className="flex-row gap-3 px-6 mb-6">
        {isConnected ? (
          <>
            {/* Deposit */}
            <TouchableOpacity
              style={styles.actionBtn}
              activeOpacity={0.92}
              onPress={() => setDepositVisible(true)}
            >
              <LinearGradient
                colors={['#A78BFA', '#8B5CF6']}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={styles.gradient}
              >
                <IconSymbol name="plus" size={16} color="#fff" />
                <ThemedText style={styles.btnText}>Deposit</ThemedText>
              </LinearGradient>
            </TouchableOpacity>

            {/* Withdraw */}
            <TouchableOpacity
              style={styles.actionBtn}
              activeOpacity={0.92}
              onPress={() => setWithdrawVisible(true)}
            >
              <LinearGradient
                colors={['#A78BFA', '#8B5CF6']}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={styles.gradient}
              >
                <IconSymbol name="arrow.up.right" size={16} color="#fff" />
                <ThemedText style={styles.btnText}>Withdraw</ThemedText>
              </LinearGradient>
            </TouchableOpacity>
          </>
        ) : (
          <ButtonComponent
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

const styles = StyleSheet.create({
  /**
   * Outer touchable — carries the violet-500 outline border + triple shadow stack.
   * We can't put borderRadius on a LinearGradient child directly when overflow is
   * hidden, so we split: outline/shadow live here, gradient clips inside.
   */
  actionBtn: {
    flex: 1,
    borderRadius: 50,          // pill shape — matches rounded-[50px]
    borderWidth: 1,
    borderColor: '#8B5CF6',    // outline-violet-500 for depth
    // Bottom drop shadow (0px 1px 0px rgba(0,0,0,0.10))
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 14,          // 0px 4px 14px rgba(0,0,0,0.05)
    elevation: 5,
  },
  gradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
    borderRadius: 50,          // must match parent to clip gradient correctly
    // Inset top white highlight: simulate with a top border inside the gradient
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.50)',
    borderLeftColor:   'transparent',
    borderRightColor:  'transparent',
    borderBottomColor: 'transparent',
  },
  btnText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 15,
    fontFamily: 'System',      // matches font-['Inter'] on web
    letterSpacing: 0.2,
  },
});
