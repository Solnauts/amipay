import React from 'react';
import { View, TouchableOpacity, useColorScheme } from 'react-native';
import { ThemedText } from '@/components/ui/ThemedText';
import { ThemedView } from '@/components/ui/ThemedView';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useWallet } from '@/context/WalletContext';

export function HomeHeader() {
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';
  const borderColor = isDark ? '#374151' : '#e5e7eb';
  const textMuted = '#9ca3af';

  const { publicKey, isConnected, connect, disconnect } = useWallet();

  const walletInitial = publicKey ? publicKey.toBase58()[0].toUpperCase() : '?';
  const displayKey = publicKey
    ? `${publicKey.toBase58().slice(0, 4)}...${publicKey.toBase58().slice(-4)}`
    : 'Not Connected';

  return (
    <ThemedView className="flex-row items-center justify-between px-6 pt-12 pb-4">
      {/* Wallet avatar + label */}
      <TouchableOpacity
        className="flex-row items-center gap-3"
        onPress={isConnected ? disconnect : connect}
      >
        <View
          className="w-10 h-10 rounded-full items-center justify-center"
          style={{ backgroundColor: isConnected ? '#22c55e' : '#9ca3af' }}
        >
          <ThemedText className="text-white font-bold text-base">{walletInitial}</ThemedText>
        </View>
        <ThemedView>
          <ThemedText variant="default" className="font-semibold text-base">
            {isConnected ? 'Main Wallet' : 'Not Connected'}
          </ThemedText>
          <ThemedText variant="muted" className="text-xs">{displayKey}</ThemedText>
        </ThemedView>
        <IconSymbol name="chevron.down" size={14} color={textMuted} />
      </TouchableOpacity>

      {/* Right icons */}
      <ThemedView className="flex-row gap-3">
        <TouchableOpacity
          className="w-9 h-9 rounded-full bg-surface dark:bg-surface-dark items-center justify-center"
          style={{ borderWidth: 1, borderColor }}
        >
          <IconSymbol name="clock" size={16} color={textMuted} />
        </TouchableOpacity>
        <TouchableOpacity
          className="w-9 h-9 rounded-full bg-surface dark:bg-surface-dark items-center justify-center"
          style={{ borderWidth: 1, borderColor }}
        >
          <IconSymbol name="qrcode.viewfinder" size={16} color={textMuted} />
        </TouchableOpacity>
      </ThemedView>
    </ThemedView>
  );
}
