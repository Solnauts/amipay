import React from 'react';
import { TouchableOpacity, useColorScheme } from 'react-native';
import { ThemedText } from '@/components/ui/ThemedText';
import { ThemedView } from '@/components/ui/ThemedView';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { IconButton } from '@/components/ui/IconButton';
import { Avatar } from '@/components/ui/Avatar';
import { useWallet } from '@/context/WalletContext';
import { Colors } from '@/constants/theme';

export function HomeHeader() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const { publicKey, isConnected, connect, disconnect } = useWallet();

  const walletInitial = publicKey ? publicKey.toBase58()[0].toUpperCase() : '?';
  const displayKey = publicKey
    ? `${publicKey.toBase58().slice(0, 4)}...${publicKey.toBase58().slice(-4)}`
    : 'Not Connected';

  return (
    <ThemedView
      variant="default"
      className="flex-row items-center justify-between px-6 pt-4 pb-4"
    >
      {/* ── Left: wallet avatar + account label ── */}
      <TouchableOpacity
        className="flex-row items-center gap-3"
        activeOpacity={0.75}
        onPress={isConnected ? disconnect : connect}
      >
        <Avatar
          initials={walletInitial}
          color={isConnected ? colors.violet : colors.mutedForeground}
          size="sm"
        />
        <ThemedText variant="default" className="font-semibold text-base">
          Main Account
        </ThemedText>
        <IconSymbol name="chevron.down" size={13} color={colors.textMuted} />
      </TouchableOpacity>

      {/* ── Right: bell + scan icons ── */}
      <ThemedView variant="default" className="flex-row gap-2">
        <IconButton icon="bell.fill" onPress={() => { }} />
        <IconButton icon="qrcode.viewfinder" onPress={() => { }} />
      </ThemedView>
    </ThemedView>
  );
}
