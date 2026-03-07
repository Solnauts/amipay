// AddContactModal — centre modal for adding a new contact
// • "Amypay ID verified" only shows once the ID field has content
// • "Add Contact" button is disabled (faded) until name is filled AND ID is verified
// • Button returns to full opacity/color once form is valid
// Wired to POST /wallet/add-recipient via onAdd callback
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
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { ThemedView } from '@/components/ui/ThemedView';
import { ThemedText } from '@/components/ui/ThemedText';
import { GradientButton } from '@/components/ui/GradientButton';
import { Colors } from '@/constants/theme';

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
  const [name, setName] = useState('');
  const [id, setId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isVerified = useMemo(() => isValidAmypayId(id), [id]);
  const canAdd = name.trim().length > 0 && isVerified && !loading;

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
      <View style={styles.centeredView} pointerEvents="box-none">
        <ThemedView variant="surface" style={styles.card}>

          {/* ── Header ── */}
          <View style={styles.headerRow}>
            <ThemedText type="subtitle" style={{ fontSize: 18 }}>Add New Contact</ThemedText>
            <TouchableOpacity
              onPress={handleClose}
              activeOpacity={0.7}
              style={styles.closeBtn}
            >
              <MaterialIcons name="close" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* ── Contact Name ── */}
          <View style={styles.fieldGroup}>
            <View style={styles.fieldLabel}>
              <MaterialIcons name="person-outline" size={15} color={colors.textMuted} />
              <ThemedText variant="muted" style={styles.labelText}>Contact Name</ThemedText>
            </View>
            <View
              style={[
                styles.inputBox,
                {
                  backgroundColor: colors.backgroundSecondary,
                  borderWidth: name.trim().length > 0 ? 1 : 0,
                  borderColor: colors.border,
                },
              ]}
            >
              <TextInput
                value={name}
                onChangeText={(v) => { setName(v); setError(null); }}
                placeholder="Enter contact name"
                placeholderTextColor={colors.mutedForeground}
                editable={!loading}
                style={[styles.input, { color: colors.text }]}
              />
            </View>
          </View>

          {/* ── Amypay ID ── */}
          <View style={styles.fieldGroup}>
            <View style={styles.fieldLabel}>
              <MaterialIcons name="alternate-email" size={15} color={colors.textMuted} />
              <ThemedText variant="muted" style={styles.labelText}>Amypay ID</ThemedText>
            </View>
            <View
              style={[
                styles.inputBox,
                {
                  backgroundColor: colors.backgroundSecondary,
                  borderWidth: id.trim().length > 0 ? 1 : 0,
                  borderColor: isVerified ? colors.success : colors.error,
                },
              ]}
            >
              <TextInput
                value={id}
                onChangeText={(v) => { setId(v); setError(null); }}
                placeholder="e.g. Ridhi@amypay"
                placeholderTextColor={colors.mutedForeground}
                editable={!loading}
                style={[styles.input, { color: colors.text }]}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {/* Verified / Invalid — only shows when field has input */}
            {id.trim().length > 0 && (
              <View style={styles.statusRow}>
                <MaterialIcons
                  name={isVerified ? 'check-circle' : 'cancel'}
                  size={14}
                  color={isVerified ? colors.success : colors.error}
                />
                <ThemedText style={[styles.statusText, { color: isVerified ? colors.success : colors.error }]}>
                  {isVerified ? 'Amypay ID verified' : 'Invalid Amypay ID'}
                </ThemedText>
              </View>
            )}
          </View>

          {/* ── Error from backend ── */}
          {error && (
            <View style={{ marginBottom: 12 }}>
              <ThemedText style={{ fontSize: 12, color: colors.error, fontFamily: 'Poppins_400Regular' }}>
                {error}
              </ThemedText>
            </View>
          )}

          {/* ── Add Contact button — full color when valid, faded when not ── */}
          <View style={{ marginTop: 8 }}>
            {loading ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <GradientButton
                label="Add Contact"
                onPress={handleAdd}
                disabled={!canAdd}
                variant="primary"
              />
            )}
          </View>

        </ThemedView>
      </View>
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldGroup: {
    marginBottom: 16,
  },
  fieldLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  labelText: {
    fontSize: 13,
  },
  inputBox: {
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 56,
    justifyContent: 'center',
  },
  input: {
    fontSize: 15,
    fontFamily: 'Poppins_400Regular',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
    paddingHorizontal: 4,
  },
  statusText: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
  },
});
