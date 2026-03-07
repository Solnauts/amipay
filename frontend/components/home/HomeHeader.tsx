import React, { useState } from 'react';
import {
  View,
  TouchableOpacity,
  useColorScheme,
  Modal,
  Pressable,
  StyleSheet,
  Share,
} from 'react-native';
import { ThemedText } from '@/components/ui/ThemedText';
import { ThemedView } from '@/components/ui/ThemedView';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useWallet } from '@/context/WalletContext';
import { Colors } from '@/constants/theme';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

export function HomeHeader() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { publicKey, user, isConnected, connect, disconnect } = useWallet();

  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  const walletInitial = user?.name
    ? user.name[0].toUpperCase()
    : publicKey
    ? publicKey.toBase58()[0].toUpperCase()
    : '?';

  const displayName = user?.name ?? 'Main Account';

  // The AmiPay ID is the user's chosen username (e.g. "crustymfs@amipay")
  const amiPayId = user?.name ? `${user.name}@amipay` : null;

  const walletShort = publicKey
    ? `${publicKey.toBase58().slice(0, 6)}...${publicKey.toBase58().slice(-4)}`
    : null;

  const handleCopy = async () => {
    const textToCopy = amiPayId ?? walletShort ?? '';
    await Share.share({ message: textToCopy });
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLogout = () => {
    setDropdownVisible(false);
    disconnect();
  };

  return (
    <>
      <ThemedView
        variant="default"
        className="flex-row items-center justify-between px-6 pt-12 pb-4"
      >
        {/* ── Left: avatar + account label + chevron ── */}
        <TouchableOpacity
          className="flex-row items-center gap-3"
          activeOpacity={0.75}
          onPress={() => isConnected ? setDropdownVisible(true) : connect()}
        >
          {/* Avatar circle */}
          <View
            className="w-9 h-9 rounded-full items-center justify-center"
            style={{ backgroundColor: isConnected ? colors.violet : colors.mutedForeground }}
          >
            <ThemedText style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>
              {walletInitial}
            </ThemedText>
          </View>

          {/* Label + chevron */}
          <ThemedText variant="default" className="font-semibold text-base">
            {displayName}
          </ThemedText>
          <IconSymbol name="chevron.down" size={13} color={colors.textMuted} />
        </TouchableOpacity>

        {/* ── Right: bell + scan icons ── */}
        <ThemedView variant="default" className="flex-row gap-2">
          <TouchableOpacity
            className="w-9 h-9 rounded-full items-center justify-center"
            style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}
            activeOpacity={0.7}
          >
            <IconSymbol name="clock" size={16} color={colors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity
            className="w-9 h-9 rounded-full items-center justify-center"
            style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}
            activeOpacity={0.7}
          >
            <IconSymbol name="qrcode.viewfinder" size={16} color={colors.textMuted} />
          </TouchableOpacity>
        </ThemedView>
      </ThemedView>

      {/* ── Profile Dropdown Modal ── */}
      <Modal
        transparent
        visible={dropdownVisible}
        animationType="fade"
        onRequestClose={() => setDropdownVisible(false)}
      >
        {/* Backdrop — tap to dismiss */}
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={() => setDropdownVisible(false)}
        >
          <View style={[styles.backdrop, { backgroundColor: 'rgba(0,0,0,0.35)' }]} />
        </Pressable>

        {/* Card — positioned at top-left below the header */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: colorScheme === 'dark' ? '#1e1e2e' : '#ffffff',
              borderColor: colors.border,
            },
          ]}
        >
          {/* ── Avatar + name row ── */}
          <View style={styles.profileRow}>
            <View
              style={[styles.avatar, { backgroundColor: colors.violet }]}
            >
              <ThemedText style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>
                {walletInitial}
              </ThemedText>
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText variant="default" style={styles.nameText}>
                {displayName}
              </ThemedText>
              {walletShort && (
                <ThemedText variant="muted" style={styles.walletText}>
                  {walletShort}
                </ThemedText>
              )}
            </View>
          </View>

          {/* ── Divider ── */}
          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {/* ── AmiPay ID ── */}
          <View style={styles.section}>
            <ThemedText variant="muted" style={styles.sectionLabel}>
              AmiPay ID
            </ThemedText>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleCopy}
              style={[
                styles.idRow,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <ThemedText variant="default" style={styles.idText} numberOfLines={1}>
                {amiPayId ?? walletShort ?? '—'}
              </ThemedText>
              <MaterialIcons
                name={copied ? 'check' : 'content-copy'}
                size={16}
                color={copied ? '#22c55e' : colors.textMuted}
              />
            </TouchableOpacity>
            {copied && (
              <ThemedText style={styles.copiedText}>Copied!</ThemedText>
            )}
          </View>

          {/* ── Divider ── */}
          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {/* ── Logout button ── */}
          <TouchableOpacity
            style={styles.logoutBtn}
            activeOpacity={0.75}
            onPress={handleLogout}
          >
            <MaterialIcons name="logout" size={18} color="#ef4444" />
            <ThemedText style={styles.logoutText}>Disconnect Wallet</ThemedText>
          </TouchableOpacity>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
  },
  card: {
    position: 'absolute',
    top: 88,
    left: 20,
    width: 280,
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 12,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameText: {
    fontWeight: '700',
    fontSize: 15,
  },
  walletText: {
    fontSize: 11,
    marginTop: 2,
    letterSpacing: 0.3,
  },
  divider: {
    height: 1,
    marginHorizontal: 16,
  },
  section: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 6,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  idRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
  },
  idText: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
    letterSpacing: 0.2,
  },
  copiedText: {
    fontSize: 12,
    color: '#22c55e',
    fontWeight: '600',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  logoutText: {
    color: '#ef4444',
    fontWeight: '600',
    fontSize: 14,
  },
});
