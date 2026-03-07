// AddContactModal — centre modal for adding a new contact
// • "Amypay ID verified" only shows once the ID field has content
// • "Add Contact" button is disabled (faded) until name is filled AND ID is verified
// • Button returns to full opacity/color once form is valid

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
import { GradientButton } from '@/components/ui/GradientButton';
import { Colors } from '@/constants/theme';

// Simulated async verify: any non-empty id with '@' is "verified"
function isValidAmypayId(id: string) {
  return id.trim().length > 3 && id.includes('@');
}

type Props = {
  isOpen: boolean;
  onClose: () => void;
  colors: (typeof Colors)[keyof typeof Colors];
};

export function AddContactModal({ isOpen, onClose, colors }: Props) {
  const [name, setName] = useState('');
  const [id, setId] = useState('');

  const isVerified = useMemo(() => isValidAmypayId(id), [id]);
  const canAdd = name.trim().length > 0 && isVerified;

  const handleClose = () => {
    setName('');
    setId('');
    onClose();
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
                onChangeText={setName}
                placeholder="Enter contact name"
                placeholderTextColor={colors.mutedForeground}
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
                onChangeText={setId}
                placeholder="e.g. Ridhi@amypay"
                placeholderTextColor={colors.mutedForeground}
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

          {/* ── Add Contact button — full color when valid, faded when not ── */}
          <View style={{ marginTop: 8 }}>
            <GradientButton
              label="Add Contact"
              onPress={handleClose}
              disabled={!canAdd}
              variant="primary"
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
