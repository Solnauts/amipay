// AddContactModal — centre modal for adding a new contact
// Wired to POST /wallet/add-recipient via parent onAdd()
// Shows validation + backend errors.

import React, { useState, useMemo } from 'react';
import {
  Modal,
  TouchableOpacity,
  View,
  TextInput,
  StyleSheet,
} from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { ThemedView } from '@/components/ui/ThemedView';
import { ThemedText } from '@/components/ui/ThemedText';
import { ActionButton } from '@/components/ui/ActionButton';
import { Colors } from '@/constants/theme';
import { useWallet } from '@/context/WalletContext';

// ─── Validation ─────────────────────────────────────────────

function isValidAmypayId(id: string) {
  return id.trim().length > 3 && id.includes('@');
}

// ─── Props ──────────────────────────────────────────────────

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (name: string, alias: string) => Promise<void>;
  colors: (typeof Colors)[keyof typeof Colors];
};

// ─── Component ──────────────────────────────────────────────

export function AddContactModal({ isOpen, onClose, onAdd, colors }: Props) {
  const { user } = useWallet();

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

  const canAdd =
    name.trim().length > 0 &&
    isValidFormat &&
    !isSelf &&
    !loading;

  const handleClose = () => {
    setName('');
    setId('');
    setError(null);
    setLoading(false);
    onClose();
  };

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
      setError(err?.message ?? 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal transparent visible={isOpen} animationType="fade" onRequestClose={handleClose}>

      {/* Backdrop */}
      <TouchableOpacity
        activeOpacity={1}
        onPress={handleClose}
        style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.45)' }]}
      />

      {/* Modal Card */}
      <View style={styles.centeredView} pointerEvents="box-none">
        <ThemedView variant="surface" style={styles.card}>

          {/* Header */}
          <View style={styles.headerRow}>
            <ThemedText type="subtitle" style={{ fontSize: 18 }}>
              Add New Contact
            </ThemedText>

            <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
              <MaterialIcons name="close" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Name */}
          <View style={styles.fieldGroup}>
            <View style={styles.fieldLabel}>
              <MaterialIcons name="person-outline" size={15} color={colors.textMuted} />
              <ThemedText variant="muted">Contact Name</ThemedText>
            </View>

            <View
              style={[
                styles.inputBox,
                {
                  backgroundColor: colors.backgroundSecondary,
                  borderWidth: name.trim() ? 1 : 0,
                  borderColor: colors.border,
                },
              ]}
            >
              <TextInput
                value={name}
                onChangeText={(v) => {
                  setName(v);
                  setError(null);
                }}
                placeholder="Enter contact name"
                placeholderTextColor={colors.mutedForeground}
                editable={!loading}
                style={[styles.input, { color: colors.text }]}
              />
            </View>
          </View>

          {/* Amypay ID */}
          <View style={styles.fieldGroup}>
            <View style={styles.fieldLabel}>
              <MaterialIcons name="alternate-email" size={15} color={colors.textMuted} />
              <ThemedText variant="muted">Amypay ID</ThemedText>
            </View>

            <View
              style={[
                styles.inputBox,
                {
                  backgroundColor: colors.backgroundSecondary,
                  borderWidth: id.trim() ? 1 : 0,
                  borderColor: isValidFormat ? colors.success : colors.error,
                },
              ]}
            >
              <TextInput
                value={id}
                onChangeText={(v) => {
                  setId(v);
                  setError(null);
                }}
                placeholder="e.g. Ridhi@amypay"
                placeholderTextColor={colors.mutedForeground}
                editable={!loading}
                autoCapitalize="none"
                autoCorrect={false}
                style={[styles.input, { color: colors.text }]}
              />
            </View>

            {/* Validation / Error */}
            <View style={{ minHeight: 22, marginTop: 6 }}>
              {error ? (
                <ThemedText style={{ fontSize: 12, color: colors.error }}>
                  {error}
                </ThemedText>
              ) : isSelf ? (
                <View style={styles.statusRow}>
                  <MaterialIcons name="block" size={14} color={colors.error} />
                  <ThemedText style={{ fontSize: 12, color: colors.error }}>
                    You can't add yourself as a contact
                  </ThemedText>
                </View>
              ) : id.trim().length > 0 ? (
                <View style={styles.statusRow}>
                  <MaterialIcons
                    name={isValidFormat ? 'check-circle' : 'cancel'}
                    size={14}
                    color={isValidFormat ? colors.success : colors.error}
                  />
                  <ThemedText
                    style={{
                      fontSize: 12,
                      color: isValidFormat ? colors.success : colors.error,
                    }}
                  >
                    {isValidFormat
                      ? 'Valid Amypay ID format'
                      : 'Invalid Amypay ID (must include @)'}
                  </ThemedText>
                </View>
              ) : null}
            </View>
          </View>

          {/* Button */}
          <View style={{ marginTop: 10 }}>
            <ActionButton
              label={loading ? 'Adding...' : 'Add Contact'}
              onPress={handleAdd}
              disabled={!canAdd}
            />
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
  },
  headerRow: {
    flexDirection: 'row',
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
  },
});