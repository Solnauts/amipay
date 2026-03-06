// Contacts Screen — composer only; all logic lives in components/contacts/
// Tapping a contact → ContactDetailSheet (Send → /pay)
// Tapping + → AddContactModal

import React, { useState, useMemo } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
 
  ScrollView,
  TouchableOpacity,
  View,
  Image,
  TextInput,
  StyleSheet,
  StatusBar,
  useColorScheme,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { ThemedView } from '@/components/ui/ThemedView';
import { ThemedText } from '@/components/ui/ThemedText';
import { ContactRow } from '@/components/send/ContactRow';
import { CONTACTS, Contact } from '@/components/cards/cardsData';
import { Colors } from '@/constants/theme';

import { ContactDetailSheet } from '@/components/contacts/ContactDetailSheet';
import { AddContactModal }    from '@/components/contacts/AddContactModal';
import { RECENT_CONTACT_IDS } from '@/components/contacts/contactsData';

export default function ContactsScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors      = Colors[colorScheme];

  const [query,           setQuery]           = useState('');
  const [selected,        setSelected]        = useState<Contact | null>(null);
  const [addContactOpen,  setAddContactOpen]  = useState(false);

  const recentContacts = useMemo(
    () => CONTACTS.filter((c) => RECENT_CONTACT_IDS.includes(c.id)),
    [],
  );

  const searchResults = useMemo(() => {
    if (!query.trim()) return null;
    const q = query.toLowerCase();
    return CONTACTS.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.username.toLowerCase().includes(q) ||
        c.shortAddress.toLowerCase().includes(q),
    );
  }, [query]);

  const listContacts = searchResults ?? CONTACTS;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background}}>
      <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />

      {/* ── Search bar + action buttons ── */}
      <ThemedView
        variant="default"
        className="flex-row items-center gap-2 px-4 py-3"
      >
        {/* Search input */}
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
            placeholder="username or amypay id"
            placeholderTextColor={colors.mutedForeground}
            style={{
              flex: 1,
              color: colors.textMuted,
              fontSize: 15,
              fontFamily: 'Poppins_400Regular',
            }}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </ThemedView>

        {/* QR scan */}
        <TouchableOpacity activeOpacity={0.8} style={styles.iconBtn}>
          <LinearGradient colors={['#A78BFA', '#8B5CF6']} style={styles.iconBtnGrad}>
            <MaterialIcons name="qr-code-scanner" size={20} color="#ffffff" />
          </LinearGradient>
        </TouchableOpacity>

        {/* Add contact */}
        <TouchableOpacity
          activeOpacity={0.8}
          style={styles.iconBtn}
          onPress={() => setAddContactOpen(true)}
        >
          <LinearGradient colors={['#A78BFA', '#8B5CF6']} style={styles.iconBtnGrad}>
            <MaterialIcons name="add" size={22} color="#ffffff" />
          </LinearGradient>
        </TouchableOpacity>
      </ThemedView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* Recent avatars row — hidden while searching */}
        {!query.trim() && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 16, paddingBottom: 12 }}
            style={{ marginBottom: 4 }}
          >
            {recentContacts.map((c) => (
              <TouchableOpacity
                key={c.id}
                onPress={() => setSelected(c)}
                activeOpacity={0.75}
                className="items-center gap-1.5"
              >
                <Image source={{ uri: c.avatar }} style={styles.recentAvatar} />
                <ThemedText className="text-xs font-medium">{c.name}</ThemedText>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Section label */}
        <ThemedText type="defaultSemiBold" className="text-sm px-4 mb-2">
          {searchResults ? 'Results' : 'Saved Contact'}
        </ThemedText>

        {/* Contact list */}
        {listContacts.length === 0 ? (
          <ThemedText variant="muted" className="px-4 text-sm mt-2">
            No contacts found.
          </ThemedText>
        ) : (
          listContacts.map((c) => (
            <ContactRow
              key={c.id}
              contact={c}
              onPress={(contact) => setSelected(contact)}
            />
          ))
        )}
      </ScrollView>

      {/* Contact detail bottom sheet */}
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
