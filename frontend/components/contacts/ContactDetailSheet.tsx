// ContactDetailSheet — slides up from bottom when a contact row is tapped
// • Reads ALL transactions from MMKV cache (instant, no API call)
// • Filters to only show transactions involving this specific contact (by recipientUserId)
// • Computes real "Total Sent" and "Last Transaction" stats
// • Falls back to a refresh from the API if the cache is empty
// • Send button redirects to /pay with the contact's username

import React, { useMemo } from 'react';
import {
  Modal,
  TouchableOpacity,
  View,
  Image,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { ThemedView } from '@/components/ui/ThemedView';
import { ThemedText } from '@/components/ui/ThemedText';
import { Contact } from '@/components/cards/cardsData';
import { Colors } from '@/constants/theme';
import { transactionsStore } from '@/src/store/transactionsStore';
import { TransactionRecord } from '@/src/types/api';

const DECIMALS = 1_000_000;

type Props = {
  contact: Contact;
  colors: (typeof Colors)[keyof typeof Colors];
  onClose: () => void;
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatAmount(raw: number, sent: boolean): string {
  const human = Math.abs(raw / DECIMALS).toFixed(2);
  return sent ? `-${human} USDC` : `+${human} USDC`;
}

function timeAgo(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  if (days > 0)  return days  === 1 ? '1 day ago'   : `${days} days ago`;
  if (hours > 0) return hours === 1 ? '1 hour ago'  : `${hours} hours ago`;
  if (mins > 0)  return mins  === 1 ? '1 min ago'   : `${mins} mins ago`;
  return 'Just now';
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ContactDetailSheet({ contact, colors, onClose }: Props) {
  const handleSend = () => {
    onClose();
    // Pass the saved display name (e.g. "Mom") so the chat input reads naturally.
    // The alias is intentionally omitted here — the AI resolves recipients by name.
    router.push({ pathname: '/pay', params: { to: contact.name } });
  };

  // ── Read all raw records from local MMKV cache ────────────────────────────
  const allRaw: TransactionRecord[] = transactionsStore.getAll();

  // ── Filter: only transactions that involve this contact ───────────────────
  // A transaction belongs to this contact if:
  //  • status === 'confirmed' AND (sender_id OR receiver_id) === recipientUserId
  const contactTxs: TransactionRecord[] = useMemo(() => {
    const uid = contact.recipientUserId;
    if (!uid || allRaw.length === 0) return [];

    return allRaw
      .filter((tx) => {
        if (tx.status !== 'confirmed') return false;
        return tx.sender_id === uid || tx.receiver_id === uid;
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [contact.recipientUserId, allRaw.length]);

  // ── Stats ─────────────────────────────────────────────────────────────────
  const totalSentRaw = contactTxs
    .filter((tx) => tx.receiver_id === contact.recipientUserId)   // you sent TO them
    .reduce((sum, tx) => sum + tx.amount, 0);

  const totalSent = (totalSentRaw / DECIMALS).toFixed(2);
  const lastTx = contactTxs[0];
  const lastTxLabel = lastTx ? timeAgo(lastTx.created_at) : '—';
  const hasHistory = contactTxs.length > 0;

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

          {/* Send button — violet gradient */}
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
                {hasHistory ? `$${totalSent}` : '—'}
              </ThemedText>
            </View>
            <View className="flex-row justify-between">
              <ThemedText variant="muted" className="text-xs">Last Transaction</ThemedText>
              <ThemedText variant="muted" className="text-xs">{lastTxLabel}</ThemedText>
            </View>
          </ThemedView>

          {/* Transaction History */}
          <ThemedText type="defaultSemiBold" className="text-sm mb-3">
            Transaction History
          </ThemedText>

          <ScrollView
            style={{ maxHeight: 260 }}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled
          >
            {!hasHistory ? (
              <ThemedView
                variant="elevated"
                className="rounded-2xl p-4 items-center"
                style={{ borderWidth: 1, borderColor: colors.border }}
              >
                <MaterialIcons name="receipt-long" size={28} color={colors.mutedForeground} />
                <ThemedText variant="muted" className="text-xs mt-2 text-center">
                  {contact.recipientUserId
                    ? 'No transactions with this contact yet.'
                    : 'Transaction history unavailable — contact was not synced from the server yet.'}
                </ThemedText>
              </ThemedView>
            ) : (
              contactTxs.map((tx, i) => {
                const isSent = tx.receiver_id === contact.recipientUserId;
                const amtStr = formatAmount(tx.amount, isSent);
                return (
                  <ThemedView
                    key={tx.id ?? i}
                    variant="elevated"
                    className="flex-row items-center gap-3 rounded-2xl p-3 mb-3"
                  >
                    <View
                      className="w-10 h-10 rounded-full items-center justify-center"
                      style={{ backgroundColor: isSent ? '#ede9fe' : '#dcfce7' }}
                    >
                      <MaterialIcons
                        name="send"
                        size={16}
                        color={isSent ? '#8b5cf6' : '#16a34a'}
                        style={{ transform: [{ rotate: isSent ? '0deg' : '230deg' }] }}
                      />
                    </View>
                    <View className="flex-1">
                      <ThemedText type="defaultSemiBold" className="text-sm">
                        {isSent ? 'Sent' : 'Received'}
                      </ThemedText>
                      <ThemedText variant="muted" className="text-xs mt-0.5">
                        {timeAgo(tx.created_at)}
                      </ThemedText>
                    </View>
                    <ThemedText
                      style={{
                        fontWeight: '600',
                        fontSize: 13,
                        color: isSent ? colors.text : '#16a34a',
                      }}
                    >
                      {amtStr}
                    </ThemedText>
                  </ThemedView>
                );
              })
            )}
          </ScrollView>
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
