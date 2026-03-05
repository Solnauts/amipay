// AddContactModal — centre modal for adding a new contact
// • "Amypay ID verified" only shows once the ID field has content
// • "Add Contact" button is disabled until name is filled AND ID is verified

import React, { useState, useMemo } from 'react';
import {
  Modal,
  TouchableOpacity,
  View,
  TextInput,
  StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { ThemedView } from '@/components/ui/ThemedView';
import { ThemedText } from '@/components/ui/ThemedText';
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
  const [id, setId]     = useState('');

  const isVerified = useMemo(() => isValidAmypayId(id), [id]);
  const canAdd     = name.trim().length > 0 && isVerified;

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
                onChangeText={setName}
                placeholder="Enter contact name"
                placeholderTextColor={colors.mutedForeground}
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
                borderColor: isVerified ? colors.success : colors.error,
              }}
            >
              <TextInput
                value={id}
                onChangeText={setId}
                placeholder="Paste amypay id  (e.g. Ridhi@amypay)"
                placeholderTextColor={colors.mutedForeground}
                style={{ color: colors.text, fontSize: 15, fontFamily: 'Poppins_400Regular' }}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </ThemedView>
          </View>

          {/* ── Verified / Invalid status — only shows when id field has input ── */}
          <View style={{ height: 22, justifyContent: 'center', marginBottom: 18 }}>
            {id.trim().length > 0 && (
              <ThemedView className="flex-row items-center gap-1">
                <MaterialIcons
                  name={isVerified ? 'check-circle' : 'cancel'}
                  size={14}
                  color={isVerified ? colors.success : colors.error}
                />
                <ThemedText
                  style={{
                    fontSize: 12,
                    color: isVerified ? colors.success : colors.error,
                    fontFamily: 'Poppins_400Regular',
                  }}
                >
                  {isVerified ? 'Amypay ID verified' : 'Invalid Amypay ID'}
                </ThemedText>
              </ThemedView>
            )}
          </View>

          {/* ── Add Contact button — disabled until name filled + ID verified ── */}
          <TouchableOpacity
            onPress={handleClose}
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
              <ThemedText style={styles.addBtnText}>Add Contact</ThemedText>
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
    borderLeftColor:   'transparent',
    borderRightColor:  'transparent',
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
