// ContactDetailSheet — slides up from bottom when a contact row is tapped
// Send button redirects to /pay with the contact's username

import React from 'react';
import {
  Modal,
  TouchableOpacity,
  View,
  Image,
  StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { ThemedView } from '@/components/ui/ThemedView';
import { ThemedText } from '@/components/ui/ThemedText';
import { Contact } from '@/components/cards/cardsData';
import { Colors } from '@/constants/theme';
import { MOCK_TXS } from './contactsData';

type Props = {
  contact: Contact;
  colors: (typeof Colors)[keyof typeof Colors];
  onClose: () => void;
};

export function ContactDetailSheet({ contact, colors, onClose }: Props) {
  const handleSend = () => {
    onClose();
    router.push({ pathname: '/pay', params: { to: contact.username } });
  };

  return (
    <Modal transparent animationType="slide" onRequestClose={onClose}>
      {/* Frosted backdrop — tap to dismiss */}
      <TouchableOpacity
        activeOpacity={1}
        onPress={onClose}
        style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.45)' }]}
      />

      {/* Sheet anchored to bottom */}
      <View style={styles.sheetWrapper} pointerEvents="box-none">
        <ThemedView variant="surface" style={styles.sheet}>
          {/* Handle bar */}
          <View style={[styles.handle, { backgroundColor: colors.border }]} />

          {/* Avatar + Name + Close */}
          <View className="flex-row items-center gap-3 mb-5">
            <Image source={{ uri: contact.avatar }} style={styles.avatar} />
            <View className="flex-1">
              <ThemedText type="defaultSemiBold" className="text-base">
                {contact.name}
              </ThemedText>
              <ThemedText variant="muted" className="text-xs mt-0.5">
                {contact.username}
              </ThemedText>
            </View>
            <TouchableOpacity
              onPress={onClose}
              activeOpacity={0.7}
              className="w-8 h-8 rounded-full items-center justify-center"
              style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}
            >
              <MaterialIcons name="close" size={16} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Send button — violet gradient, identical to Deposit/Withdraw */}
          <TouchableOpacity onPress={handleSend} activeOpacity={0.88} style={styles.sendBtn}>
            <LinearGradient
              colors={['#A78BFA', '#8B5CF6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.sendGradient}
            >
              <MaterialIcons name="send" size={18} color="#ffffff" />
              <ThemedText style={styles.sendBtnText}>Send</ThemedText>
            </LinearGradient>
          </TouchableOpacity>

          {/* Total Sent summary card */}
          <ThemedView
            variant="elevated"
            className="rounded-2xl p-3.5 mb-5"
            style={{ borderWidth: 1, borderColor: colors.border }}
          >
            <View className="flex-row justify-between mb-1">
              <ThemedText type="defaultSemiBold" className="text-sm">Total Sent</ThemedText>
              <ThemedText style={{ fontWeight: '700', fontSize: 14, color: colors.primary }}>
                $2312.45
              </ThemedText>
            </View>
            <View className="flex-row justify-between">
              <ThemedText variant="muted" className="text-xs">Last Transaction</ThemedText>
              <ThemedText variant="muted" className="text-xs">2 week ago</ThemedText>
            </View>
          </ThemedView>

          {/* Transaction History */}
          <ThemedText type="defaultSemiBold" className="text-sm mb-3">
            Transaction History
          </ThemedText>

          {MOCK_TXS.map((tx, i) => (
            <ThemedView
              key={i}
              variant="elevated"
              className="flex-row items-center gap-3 rounded-2xl p-3 mb-3"
            >
              <View
                className="w-10 h-10 rounded-full items-center justify-center"
                style={{ backgroundColor: tx.received ? '#dcfce7' : '#ede9fe' }}
              >
                <MaterialIcons
                  name="send"
                  size={16}
                  color={tx.received ? '#16a34a' : '#8b5cf6'}
                  style={{ transform: [{ rotate: tx.received ? '230deg' : '0deg' }] }}
                />
              </View>
              <View className="flex-1">
                <ThemedText type="defaultSemiBold" className="text-sm">{tx.type}</ThemedText>
                <ThemedText variant="muted" className="text-xs mt-0.5">{tx.time}</ThemedText>
              </View>
              <ThemedText
                style={{
                  fontWeight: '600',
                  fontSize: 13,
                  color: tx.received ? '#16a34a' : colors.text,
                }}
              >
                {tx.amount}
              </ThemedText>
            </ThemedView>
          ))}
        </ThemedView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheetWrapper: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 12,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: 20,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  sendBtn: {
    borderRadius: 50,
    borderWidth: 1,
    borderColor: '#8B5CF6',
    marginBottom: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 14,
    elevation: 5,
  },
  sendGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.50)',
    borderLeftColor:   'transparent',
    borderRightColor:  'transparent',
    borderBottomColor: 'transparent',
  },
  sendBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 15,
    fontFamily: 'Poppins_600SemiBold',
    letterSpacing: 0.2,
  },
});
