import React, { useState, useMemo } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  FlatList,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  StyleSheet,
  StatusBar,
  useColorScheme,
  ActivityIndicator,
  RefreshControl,
  View,
} from "react-native";

import { LinearGradient } from "expo-linear-gradient";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

import { ThemedView } from "@/components/ui/ThemedView";
import { ThemedText } from "@/components/ui/ThemedText";
import { ContactRow } from "@/components/send/ContactRow";

import { Colors } from "@/constants/theme";

import { ContactDetailSheet } from "@/components/contacts/ContactDetailSheet";
import { AddContactModal } from "@/components/contacts/AddContactModal";

import { Contact } from "@/components/cards/cardsData";
import { StoredContact, getAvatarSource } from "@/src/store/contactsStore";
import { useContacts } from "@/hooks/useContacts";

function toContact(sc: StoredContact): Contact {
  const displayName = sc.name || sc.alias || "Unknown";

  return {
    id: sc.id,
    name: displayName,
    emoji: (displayName.charAt(0) ?? "?").toUpperCase(),
    avatar: sc.avatar,
    username: sc.alias,
    shortAddress: "",
    recipientUserId: sc.recipientUserId,
  };
}

export default function ContactsScreen() {
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];

  const { contacts, syncing, addContact, refresh } = useContacts();

  const [query, setQuery] = useState("");
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

  const renderHeader = () => (
    <>
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
          {recentContacts.map((c) => (
            <TouchableOpacity
              key={c.id}
              onPress={() => setSelected(c)}
              className="items-center"
            >
              <Image source={getAvatarSource(c.avatar)} style={styles.recentAvatar} />
              <ThemedText className="text-xs font-medium mt-1.5">
                {c.name}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <View style={styles.sectionHeader}>
        <ThemedText type="defaultSemiBold" style={{ fontSize: 14 }}>
          {searchResults ? "Results" : "Saved Contacts"}
        </ThemedText>
      </View>
    </>
  );

  return (
    <SafeAreaView
      edges={["top"]}
      className="flex-1 bg-background dark:bg-background-dark"
    >
      <StatusBar
        barStyle={
          colorScheme === "dark" ? "light-content" : "dark-content"
        }
      />

      {/* Search Bar & Actions */}
      <ThemedView className="flex-row items-center gap-2 px-4 pt-4 pb-3 bg-white dark:bg-background-dark">
        {/* Search Input Container */}
        <View
          className="flex-1 h-12 px-4 bg-gray-100 dark:bg-zinc-800 rounded-full flex-row items-center border border-gray-100 dark:border-zinc-700 overflow-hidden"
        >
          <MaterialIcons name="search" size={20} color="#888" />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Name or amypayid"
            placeholderTextColor="#999"
            className="flex-1 ml-2 text-sm font-medium"
            style={{
              color: colorScheme === 'dark' ? '#fff' : '#444',
              fontFamily: 'Poppins_500Medium',
              height: 48,
              textAlignVertical: 'center',
            }}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery("")} className="ml-2">
              <MaterialIcons name="close" size={18} color="#999" />
            </TouchableOpacity>
          )}
        </View>

        {/* QR Scan pill button */}
        <TouchableOpacity
          activeOpacity={0.85}
          style={[styles.pillBtn, styles.violetBtnShadow]}
        >
          <LinearGradient
            colors={['#A78BFA', '#8B5CF6']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <LinearGradient
            colors={['rgba(255,255,255,0.28)', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
          <MaterialIcons name="qr-code-scanner" size={18} color="white" />
        </TouchableOpacity>

        {/* Add Contact pill button */}
        <TouchableOpacity
          onPress={() => setAddContactOpen(true)}
          activeOpacity={0.85}
          style={[styles.pillBtn, styles.violetBtnShadow]}
        >
          <LinearGradient
            colors={['#A78BFA', '#8B5CF6']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <LinearGradient
            colors={['rgba(255,255,255,0.28)', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
          <MaterialIcons name="person-add" size={18} color="white" />
        </TouchableOpacity>
      </ThemedView>

      {/* Contacts List */}
      <FlatList
        data={listContacts}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <ContactRow
            contact={item}
            onPress={(contact) => setSelected(contact)}
          />
        )}
        ListHeaderComponent={renderHeader}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={
          <RefreshControl
            refreshing={syncing}
            onRefresh={refresh}
            tintColor="#8B5CF6"
            colors={['#8B5CF6']}
          />
        }
        ListEmptyComponent={
          <ThemedText variant="muted" className="px-4 text-sm mt-2">
            {syncing
              ? "Loading contacts…"
              : "No contacts yet. Tap + to add one."}
          </ThemedText>
        }
      />

      {/* Contact detail sheet */}
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
  recentAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 8,
    gap: 8,
  },
  pillBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#7d4bfe',
  },
  violetBtnShadow: {
    shadowColor: "#8B5CF6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
});