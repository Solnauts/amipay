import React, { useState, useCallback } from 'react';
import {
  View,
  Image,
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
import { userAvatarStore } from '@/src/store/userAvatarStore';
import { AVATARS } from '@/assets/avatars';
import { AvatarPickerModal } from '@/components/home/AvatarPickerModal';

export function HomeHeader() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { publicKey, user, isConnected, connect, disconnect } = useWallet();

  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  // Reactive avatar index — re-reads on every render so it stays in sync
  const [avatarIndex, setAvatarIndex] = useState(() => userAvatarStore.getIndex());

  const handleSelectAvatar = useCallback((index: number) => {
    userAvatarStore.setIndex(index);
    setAvatarIndex(index);
  }, []);

  const displayName = user?.name ?? 'Main Account';
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

  // Use local avatar if available, otherwise fall back to letter initial
  const hasLocalAvatars = AVATARS.length > 0;
  const avatarSource = hasLocalAvatars ? AVATARS[avatarIndex] : null;

  return (
    <>
      <ThemedView
        variant="default"
        className="flex-row items-center justify-between px-6 pt-4 pb-4"
      >
        {/* ── Left: avatar + account label + chevron ── */}
        <TouchableOpacity
          className="flex-row items-center gap-3"
          activeOpacity={0.75}
          onPress={() => isConnected ? setDropdownVisible(true) : connect()}
        >
          {/* Avatar */}
          {avatarSource ? (
            <Image
              source={avatarSource}
              style={styles.headerAvatar}
            />
          ) : (
            <View
              className="w-9 h-9 rounded-full items-center justify-center"
              style={{ backgroundColor: isConnected ? colors.violet : colors.mutedForeground }}
            >
              <ThemedText style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>
                {user?.name?.[0]?.toUpperCase() ?? publicKey?.toBase58()[0]?.toUpperCase() ?? '?'}
              </ThemedText>
            </View>
          )}

          {/* Label + chevron */}
          <ThemedText variant="default" className="font-semibold text-base">
            {displayName}
          </ThemedText>
          <IconSymbol name="chevron.down" size={13} color={colors.textMuted} />
        </TouchableOpacity>

        {/* ── Right: bell + scan icons ── */}
        <ThemedView variant="default" className="flex-row items-center gap-2">
          <TouchableOpacity
            className="w-8 h-8 rounded-full items-center justify-center"
            style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}
            activeOpacity={0.7}
          >
            <IconSymbol name="bell.fill" size={14} color={'#000'} />
          </TouchableOpacity>
          <TouchableOpacity
            className="w-8 h-8 rounded-full items-center justify-center"
            style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}
            activeOpacity={0.7}
          >
            <IconSymbol name="qrcode.viewfinder" size={14} color={'#000'} />
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
            {/* Tappable avatar — opens picker */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                if (!hasLocalAvatars) return;
                setDropdownVisible(false);
                setTimeout(() => setPickerVisible(true), 200);
              }}
              style={{ position: 'relative' }}
            >
              {avatarSource ? (
                <Image source={avatarSource} style={styles.avatarImg} />
              ) : (
                <View style={[styles.avatarFallback, { backgroundColor: colors.violet }]}>
                  <ThemedText style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>
                    {user?.name?.[0]?.toUpperCase() ?? '?'}
                  </ThemedText>
                </View>
              )}
              {hasLocalAvatars && (
                <View style={styles.editBadge}>
                  <MaterialIcons name="edit" size={9} color="#fff" />
                </View>
              )}
            </TouchableOpacity>
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

      {/* ── Avatar Picker Modal ── */}
      <AvatarPickerModal
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        selectedIndex={avatarIndex}
        onSelect={handleSelectAvatar}
        colorScheme={colorScheme}
      />
    </>
  );
}

const styles = StyleSheet.create({
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  backdrop: {
    flex: 1,
  },
  card: {
    position: 'absolute',
    top: 88,
    left: 20,
    width: 290,
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
  avatarImg: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarFallback: {
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
  editBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#8B5CF6',
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#fff',
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