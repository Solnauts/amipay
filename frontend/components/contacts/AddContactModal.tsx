// AddContactModal — centre modal for adding a new contact
// Wired to POST /wallet/add-recipient via authService.addRecipient()
//
// Flow:
//  1. User enters a contact name (local label only) and Amipay ID (alias)
//  2. Press "Add Contact" → hits backend to verify the alias exists & link it
//  3. On success → shows confirmation, closes modal, notifies parent
//  4. On error → shows the backend error message inline

import React, { useState, useMemo } from 'react';
import {
  Modal,
  TouchableOpacity,
  View,
  TextInput,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { ThemedView } from '@/components/ui/ThemedView';
import { ThemedText } from '@/components/ui/ThemedText';
import { Colors } from '@/constants/theme';
import { useWallet } from '@/context/WalletContext';

// ─── Validation ──────────────────────────────────────────────────────────────

/**
 * Basic client-side check: alias must be at least 4 chars and contain '@'.
 * Example valid alias: Ridhi@amypay
 * Real validation happens on the backend.
 */
function isValidAmypayId(id: string) {
  return id.trim().length > 3 && id.includes('@');
}

// ─── Props ───────────────────────────────────────────────────────────────────

type Props = {
  isOpen: boolean;
  onClose: () => void;
  /**
   * Called with (name, alias) when the user confirms.
   * The parent handles MMKV optimistic save + API call + rollback.
   * Should throw on failure so the modal can display the error.
   */
  onAdd: (name: string, alias: string) => Promise<void>;
  colors: (typeof Colors)[keyof typeof Colors];
};

// ─── Component ───────────────────────────────────────────────────────────────

export function AddContactModal({ isOpen, onClose, onAdd, colors }: Props) {
  const { user } = useWallet();

  // Current user's own amipay ID — used not to add themselves
  const myAmiPayId = user?.name ? `${user.name}@amipay`.toLowerCase() : null;

  const [name, setName] = useState('');
  const [id, setId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isValidFormat = useMemo(() => isValidAmypayId(id), [id]);
  const isSelf = useMemo(
    () => myAmiPayId !== null && id.trim().toLowerCase() === myAmiPayId,
    [id, myAmiPayId],
  );
  const canAdd = name.trim().length > 0 && isValidFormat && !isSelf && !loading;

  // ── Reset & close ──────────────────────────────────────────────────────
  const handleClose = () => {
    setName('');
    setId('');
    setError(null);
    setLoading(false);
    onClose();
  };

  // ── Submit ─────────────────────────────────────────────────────────────
  const handleAdd = async () => {
    if (!canAdd) return;
    if (isSelf) {
      setError("You can't add yourself as a contact.");
      return;
    }
    setError(null);
    setLoading(true);

    try {
      await onAdd(name.trim(), id.trim());
      handleClose();
    } catch (err: any) {
      const msg = err?.message ?? 'Something went wrong. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal transparent visible={isOpen} animationType="fade" onRequestClose={handleClose}>
      {/* Dimmed backdrop — tap to dismiss */}
      <TouchableOpacity
        activeOpacity={1}
        onPress={handleClose}
        style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.45)' }]}
      />

      {/* Card centred on screen */}
      <ThemedView style={styles.centeredView} pointerEvents="box-none">
        <ThemedView variant="surface" style={styles.card}>
          {/* ── Header ── */}
          <View className="flex-row items-center justify-between mb-6">
            <ThemedText type="subtitle" className="text-lg">Add New Contact</ThemedText>
            <TouchableOpacity
              onPress={handleClose}
              activeOpacity={0.7}
              className="w-8 h-8 rounded-full items-center justify-center"
            >
              <MaterialIcons name="close" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* ── Contact Name ── */}
          <View className="mb-4">
            <View className="flex-row items-center gap-1.5 mb-2">
              <MaterialIcons name="person-outline" size={15} color={colors.textMuted} />
              <ThemedText variant="muted" style={{ fontSize: 12 }}>Contact Name</ThemedText>
            </View>
            <ThemedView
              className="rounded-2xl px-4 h-14 justify-center"
              style={{
                backgroundColor: colors.backgroundSecondary,
                borderWidth: name.trim().length > 0 ? 1 : 0,
                borderColor: colors.border,
              }}
            >
              <TextInput
                value={name}
                onChangeText={(v) => { setName(v); setError(null); }}
                placeholder="Enter contact name"
                placeholderTextColor={colors.mutedForeground}
                editable={!loading}
                style={{ color: colors.text, fontSize: 15, fontFamily: 'Poppins_400Regular' }}
              />
            </ThemedView>
          </View>

          {/* ── Amypay ID ── */}
          <View className="mb-1">
            <View className="flex-row items-center gap-1.5 mb-2">
              <MaterialIcons name="alternate-email" size={15} color={colors.textMuted} />
              <ThemedText variant="muted" style={{ fontSize: 13 }}>Amypay ID</ThemedText>
            </View>
            <ThemedView
              className="rounded-2xl px-4 h-14 justify-center"
              style={{
                backgroundColor: colors.backgroundSecondary,
                borderWidth: id.trim().length > 0 ? 1 : 0,
                borderColor: isValidFormat ? colors.success : colors.error,
              }}
            >
              <TextInput
                value={id}
                onChangeText={(v) => { setId(v); setError(null); }}
                placeholder="Paste amypay id  (e.g. Ridhi@amypay)"
                placeholderTextColor={colors.mutedForeground}
                editable={!loading}
                style={{ color: colors.text, fontSize: 15, fontFamily: 'Poppins_400Regular' }}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </ThemedView>
          </View>

          {/* ── Status line: format check + backend error ── */}
          <View style={{ minHeight: 22, justifyContent: 'center', marginBottom: 18 }}>
            {/* Backend error takes priority */}
            {error ? (
              <ThemedView className="flex-row items-center gap-1">
                <MaterialIcons name="error-outline" size={14} color={colors.error} />
                <ThemedText
                  style={{
                    fontSize: 12,
                    color: colors.error,
                    fontFamily: 'Poppins_400Regular',
                    flex: 1,
                  }}
                  numberOfLines={2}
                >
                  {error}
                </ThemedText>
              </ThemedView>
            ) : isSelf ? (
              // Self-add guard — visible live as the user types their own ID
              <ThemedView className="flex-row items-center gap-1">
                <MaterialIcons name="block" size={14} color={colors.error} />
                <ThemedText
                  style={{
                    fontSize: 12,
                    color: colors.error,
                    fontFamily: 'Poppins_400Regular',
                  }}
                >
                  You can't add yourself as a contact
                </ThemedText>
              </ThemedView>
            ) : id.trim().length > 0 ? (
              <ThemedView className="flex-row items-center gap-1">
                <MaterialIcons
                  name={isValidFormat ? 'check-circle' : 'cancel'}
                  size={14}
                  color={isValidFormat ? colors.success : colors.error}
                />
                <ThemedText
                  style={{
                    fontSize: 12,
                    color: isValidFormat ? colors.success : colors.error,
                    fontFamily: 'Poppins_400Regular',
                  }}
                >
                  {isValidFormat ? 'Valid Amipay ID format' : 'Invalid Amipay ID (must include @)'}
                </ThemedText>
              </ThemedView>
            ) : null}
          </View>

          {/* ── Add Contact button ── */}
          <TouchableOpacity
            onPress={handleAdd}
            activeOpacity={canAdd ? 0.88 : 1}
            disabled={!canAdd}
            style={[styles.addBtn, { opacity: canAdd ? 1 : 0.45 }]}
          >
            <LinearGradient
              colors={canAdd ? ['#A78BFA', '#8B5CF6'] : ['#D8B4FE', '#C4B5FD']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.addGradient}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <ThemedText style={styles.addBtnText}>Add Contact</ThemedText>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </ThemedView>
      </ThemedView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 32,
    padding: 24,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
  },
  addBtn: {
    borderRadius: 50,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#8B5CF6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 14,
    elevation: 5,
  },
  addGradient: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.50)',
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  addBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    letterSpacing: 0.2,
  },
});
