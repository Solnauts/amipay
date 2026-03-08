import React, { useState, useMemo } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  StyleSheet,
  StatusBar,
  useColorScheme,
  ActivityIndicator,
  View,
} from 'react-native';

import { LinearGradient } from 'expo-linear-gradient';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { ThemedView } from '@/components/ui/ThemedView';
import { ThemedText } from '@/components/ui/ThemedText';
import { ContactRow } from '@/components/send/ContactRow';

import { Colors } from '@/constants/theme';

import { ContactDetailSheet } from '@/components/contacts/ContactDetailSheet';
import { AddContactModal } from '@/components/contacts/AddContactModal';

import { Contact } from '@/components/cards/cardsData';
import { StoredContact } from '@/src/store/contactsStore';
import { useContacts } from '@/hooks/useContacts';

function toContact(sc: StoredContact): Contact {
  const displayName = sc.name || sc.alias || 'Unknown';

  return {
    id: sc.id,
    name: displayName,
    emoji: (displayName.charAt(0) ?? '?').toUpperCase(),
    avatar: sc.avatar,
    username: sc.alias,
    shortAddress: '',
    recipientUserId: sc.recipientUserId,
  };
}

export default function ContactsScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const { contacts, syncing, addContact } = useContacts();

  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Contact | null>(null);
  const [addContactOpen, setAddContactOpen] = useState(false);

  const recentContacts = useMemo(() => {
    const sorted = [...contacts].sort((a, b) => b.savedAt - a.savedAt);
    return sorted.slice(0, 4).map(toContact);
  }, [contacts]);

  const mappedContacts = useMemo(() => contacts.map(toContact), [contacts]);

  const searchResults = useMemo(() => {
    if (!query.trim()) return null;

    const q = query.toLowerCase();

    return mappedContacts.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.username.toLowerCase().includes(q)
    );
  }, [query, mappedContacts]);

  const listContacts = searchResults ?? mappedContacts;

  return (
    <SafeAreaView className="flex-1 bg-background dark:bg-background-dark">
      <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />

      {/* Search */}
      <ThemedView className="flex-row items-center gap-2 px-4 py-3">
        <ThemedView
          className="flex-1 flex-row items-center rounded-full px-3.5 h-14 gap-2"
          style={{
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <MaterialIcons name="search" size={20} color={colors.mutedForeground} />

          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Name or amypayid"
            placeholderTextColor={colors.mutedForeground}
            style={{
              flex: 1,
              color: colors.textMuted,
              fontSize: 15,
              fontFamily: 'Poppins_400Regular',
            }}
          />
        </ThemedView>

        {/* QR */}
        <TouchableOpacity style={styles.iconBtn}>
          <LinearGradient colors={['#A78BFA', '#8B5CF6']} style={styles.iconBtnGrad}>
            <MaterialIcons name="qr-code-scanner" size={20} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>

        {/* Add */}
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => setAddContactOpen(true)}
        >
          <LinearGradient colors={['#A78BFA', '#8B5CF6']} style={styles.iconBtnGrad}>
            <MaterialIcons name="add" size={22} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      </ThemedView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* Recent */}
        {!query.trim() && recentContacts.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{
              paddingHorizontal: 16,
              gap: 16,
              paddingBottom: 12,
            }}
          >
            {recentContacts.map((c, i) => (
              <TouchableOpacity
                key={i}
                onPress={() => setSelected(c)}
                className="items-center gap-1.5"
              >
                <Image source={{ uri: c.avatar }} style={styles.recentAvatar} />
                <ThemedText className="text-xs font-medium">{c.name}</ThemedText>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Section label */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 16,
            marginBottom: 8,
            gap: 8,
          }}
        >
          <ThemedText type="defaultSemiBold" style={{ fontSize: 14 }}>
            {searchResults ? 'Results' : 'Saved Contacts'}
          </ThemedText>

          {syncing && <ActivityIndicator size="small" color={colors.primary} />}
        </View>

        {/* Contact list */}
        {listContacts.length === 0 ? (
          <ThemedText variant="muted" className="px-4 text-sm mt-2">
            {syncing ? 'Loading contacts…' : 'No contacts yet. Tap + to add one.'}
          </ThemedText>
        ) : (
          listContacts.map((c, i) => (
            <ContactRow
              key={i}
              contact={c}
              onPress={(contact) => setSelected(contact)}
            />
          ))
        )}
      </ScrollView>

      {/* Contact detail */}
      {selected && (
        <ContactDetailSheet
          contact={selected}
          colors={colors}
          onClose={() => setSelected(null)}
        />
      )}

      {/* Add contact modal */}
      <AddContactModal
        isOpen={addContactOpen}
        onClose={() => setAddContactOpen(false)}
        onAdd={addContact}
        colors={colors}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
  },
  iconBtnGrad: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recentAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
});