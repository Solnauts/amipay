/**
 * TransactionModal — Reusable bottom-sheet for Deposit & Withdraw
 *
 * Props:
 *  • mode      — 'deposit' | 'withdraw'   (controls title, icon, chip label)
 *  • visible   — controls Modal visibility
 *  • onClose   — called when sheet should close
 *  • onConfirm — async callback receiving the numeric amount; throw to show error
 *  • loading   — external loading state (e.g. from parent while tx is pending)
 */

import React, { useState, useCallback } from 'react';
import {
  Modal,
  View,
  TouchableOpacity,
  StyleSheet,
  useColorScheme,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { ThemedText } from '@/components/ui/ThemedText';
import { ThemedView } from '@/components/ui/ThemedView';
import { Colors } from '@/constants/theme';
import { useWallet } from '@/context/WalletContext';

// ─── Keypad layout ────────────────────────────────────────────────────────────
const KEYPAD: (string | null)[][] = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['.', '0', 'del'],
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function abbreviate(address: string | null): string {
  if (!address) return '—';
  return `${address.slice(0, 4)}…${address.slice(-4)}`;
}

const USDC_PER_USD = 1;

// ─── Types ────────────────────────────────────────────────────────────────────
export type TransactionMode = 'deposit' | 'withdraw';

type Props = {
  mode: TransactionMode;
  visible: boolean;
  onClose: () => void;
  /** Called with the numeric dollar amount when user taps Confirm.
   *  Throw inside to show an error (parent handles Alert). */
  onConfirm: (amount: number) => Promise<void>;
  loading?: boolean;
};

// ─── Component ────────────────────────────────────────────────────────────────
export function TransactionModal({
  mode,
  visible,
  onClose,
  onConfirm,
  loading = false,
}: Props) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const isDark = colorScheme === 'dark';

  const { walletAddress } = useWallet();

  const [amount, setAmount] = useState('0');
  const [internalLoading, setInternalLoading] = useState(false);

  const isLoading = loading || internalLoading;

  // ── Derived labels based on mode ─────────────────────────────────────────
  const title = mode === 'deposit' ? 'Deposit' : 'Withdraw';
  const chipLabel = mode === 'deposit' ? 'From' : 'To';
  const confirmIcon: 'add-circle-outline' | 'arrow-upward' =
    mode === 'deposit' ? 'add-circle-outline' : 'arrow-upward';

  // ── Keypad handler ────────────────────────────────────────────────────────
  const handleKey = useCallback((key: string) => {
    setAmount((prev) => {
      if (key === 'del') {
        const next = prev.slice(0, -1);
        return next === '' || next === '-' ? '0' : next;
      }
      if (key === '.' && prev.includes('.')) return prev;
      if (key === '.' && prev === '0') return '0.';
      if (prev === '0' && key !== '.') return key;
      if (prev.replace('.', '').length >= 7) return prev;
      return prev + key;
    });
  }, []);

  const numericAmount = parseFloat(amount) || 0;
  const usdcAmount = (numericAmount * USDC_PER_USD).toFixed(2);
  const canConfirm = numericAmount > 0;

  // ── Confirm ───────────────────────────────────────────────────────────────
  const handleConfirm = useCallback(async () => {
    if (!canConfirm || isLoading) return;
    setInternalLoading(true);
    try {
      await onConfirm(numericAmount);
    } finally {
      setInternalLoading(false);
    }
  }, [canConfirm, isLoading, numericAmount, onConfirm]);

  // ── Reset + close ─────────────────────────────────────────────────────────
  const handleClose = () => {
    setAmount('0');
    onClose();
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      statusBarTranslucent={true}
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        {/* Tap backdrop to dismiss */}
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={handleClose}
        />

        {/* ── Sheet ── */}
        <ThemedView
          variant="surface"
          style={[
            styles.sheet,
            {
              borderTopColor: colors.border,
              shadowColor: isDark ? '#8B5CF6' : '#000',
            },
          ]}
        >
          {/* ── Header ── */}
          <View style={styles.header}>
            <ThemedText
              type="defaultSemiBold"
              style={{ fontSize: 17, fontFamily: 'Poppins_600SemiBold' }}
            >
              {title}
            </ThemedText>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
              <MaterialIcons name="close" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* ── Amount display ── */}
          <View style={styles.amountSection}>
            <ThemedText
              style={[
                styles.amountText,
                {
                  color: numericAmount > 0 ? colors.text : colors.textMuted,
                },
              ]}
            >
              ${amount}
            </ThemedText>
            <ThemedText variant="muted" style={styles.usdcLabel}>
              ≈ {usdcAmount} USDC
            </ThemedText>
          </View>

          {/* ── Wallet chip ── */}
          <View style={styles.chipRow}>
            <ThemedText variant="muted" style={styles.chipLabel}>
              {chipLabel}
            </ThemedText>

            <View
              style={[
                styles.walletChip,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              {/* Gradient wallet avatar */}
              <LinearGradient
                colors={['#A78BFA', '#8B5CF6']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.walletAvatar}
              >
                <MaterialIcons
                  name="account-balance-wallet"
                  size={13}
                  color="#fff"
                />
              </LinearGradient>

              <ThemedText
                variant="default"
                style={{ fontSize: 13, fontFamily: 'Poppins_500Medium' }}
              >
                Phantom
              </ThemedText>

              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              <ThemedText
                variant="muted"
                style={{ fontSize: 12, fontFamily: 'Poppins_400Regular' }}
              >
                {abbreviate(walletAddress)}
              </ThemedText>

              <MaterialIcons
                name="keyboard-arrow-down"
                size={16}
                color={colors.textMuted}
              />
            </View>
          </View>

          {/* ── Numeric keypad ── */}
          <View style={styles.keypad}>
            {KEYPAD.map((row, ri) => (
              <View key={ri} style={styles.keyRow}>
                {row.map((key) =>
                  key === null ? (
                    <View key="empty" style={styles.keyCell} />
                  ) : (
                    <TouchableOpacity
                      key={key}
                      style={[
                        styles.keyCell,
                        {
                          backgroundColor:
                            key === 'del'
                              ? colors.backgroundSecondary
                              : colors.surface,
                          borderColor: colors.border,
                        },
                      ]}
                      activeOpacity={0.65}
                      onPress={() => handleKey(key)}
                    >
                      {key === 'del' ? (
                        <MaterialIcons
                          name="backspace"
                          size={20}
                          color={colors.textSecondary}
                        />
                      ) : (
                        <ThemedText style={styles.keyText}>{key}</ThemedText>
                      )}
                    </TouchableOpacity>
                  ),
                )}
              </View>
            ))}
          </View>

          {/* ── Confirm button ── */}
          <View style={styles.confirmSection}>
            <TouchableOpacity
              onPress={handleConfirm}
              disabled={!canConfirm || isLoading}
              activeOpacity={0.88}
              style={[
                styles.confirmBtn,
                {
                  opacity: canConfirm && !isLoading ? 1 : 0.45,
                  borderColor: '#8B5CF6',
                },
              ]}
            >
              <LinearGradient
                colors={['#A78BFA', '#8B5CF6']}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={styles.confirmGradient}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <MaterialIcons name={confirmIcon} size={18} color="#fff" />
                    <ThemedText style={styles.confirmText}>Confirm</ThemedText>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </ThemedView>
      </View>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.50)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 20,
  },

  // ── Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 4,
    position: 'relative',
  },
  closeBtn: {
    position: 'absolute',
    right: 20,
    top: 18,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Amount
  amountSection: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  amountText: {
    fontSize: 52,
    fontWeight: '800',
    fontFamily: 'Poppins_700Bold',
    letterSpacing: -1,
    lineHeight: 60,
  },
  usdcLabel: {
    fontSize: 14,
    marginTop: 4,
    fontFamily: 'Poppins_400Regular',
  },

  // ── Chip row
  chipRow: {
    alignItems: 'center',
    marginBottom: 20,
    gap: 10,
  },
  chipLabel: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  walletChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderRadius: 20,
    borderWidth: 1,
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
  walletAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    width: 1,
    height: 14,
    marginHorizontal: 2,
  },

  // ── Keypad
  keypad: {
    paddingHorizontal: 20,
    gap: 10,
  },
  keyRow: {
    flexDirection: 'row',
    gap: 10,
  },
  keyCell: {
    flex: 1,
    height: 58,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyText: {
    fontSize: 22,
    fontFamily: 'Poppins_500Medium',
    lineHeight: 28,
  },

  // ── Confirm
  confirmSection: {
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  confirmBtn: {
    borderRadius: 50,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 7,
  },
  confirmGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.45)',
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  confirmText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Poppins_600SemiBold',
    letterSpacing: 0.3,
  },
});
