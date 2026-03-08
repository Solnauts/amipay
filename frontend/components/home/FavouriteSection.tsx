import React, { useState } from 'react';
import { View, TouchableOpacity, useColorScheme, ScrollView, Modal, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { ThemedText } from '@/components/ui/ThemedText';
import { ThemedView } from '@/components/ui/ThemedView';
import { Colors } from '@/constants/theme';
import { ContactItem } from './ContactItem';
import { StoredContact } from '@/src/store/contactsStore';
import { useContacts } from '@/hooks/useContacts';
import type { Contact } from './homeData';
import Svg, { Circle } from 'react-native-svg';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import { AddContactModal } from '@/components/contacts/AddContactModal';

function toLegacyContact(sc: StoredContact): Contact {
  return {
    id: sc.id,
    name: sc.name,
    initials: (sc.name.charAt(0) || '?').toUpperCase(),
    color: '#8B5CF6',
    imageUri: sc.avatar,
  };
}

/**
 * "Favourite" section — single row of Pinned contacts + an Add button.
 * Users can pick from existing contacts to pin them.
 */
export function FavouriteSection() {
  const colors = Colors[useColorScheme() ?? 'light'];
  const { contacts: allStored, toggleFavorite, addContact } = useContacts();
  
  // Filter favorites
  const favourites = allStored.filter(c => c.isFavorite).map(toLegacyContact);
  
  const [pickerOpen, setPickerOpen] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);

  return (
    <ThemedView className="px-6 mb-6">
      <ThemedText variant="default" className="font-bold text-lg mb-4">
        Favourite
      </ThemedText>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
        <View className="flex-row gap-4">
          {favourites.map((contact) => (
            <ContactItem
              key={contact.id}
              contact={contact}
              size="sm"
              onPress={() => router.push(`/(tabs)/contacts?contactId=${contact.id}` as any)}
            />
          ))}

          {/* Add button */}
          <TouchableOpacity
            onPress={() => setPickerOpen(true)}
            activeOpacity={0.75}
            className="items-center gap-1.5"
            style={{ width: 64 }}
          >
            <View style={{ width: 56, height: 56, position: 'relative', alignItems: 'center', justifyContent: 'center' }}>
              <Svg width={56} height={56} style={{ position: 'absolute', top: 0, left: 0 }}>
                <Circle
                  cx={28}
                  cy={28}
                  r={26}
                  stroke={colors.textMuted}
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  fill="none"
                />
              </Svg>
              <ThemedView
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Feather name="plus" size={18} color={colors.textMuted} />
              </ThemedView>
            </View>
            <ThemedText variant="muted" style={{ fontSize: 12 }}>Add</ThemedText>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Picker Modal for existing contacts */}
      <Modal visible={pickerOpen} transparent animationType="slide">
        <ThemedView className="flex-1 justify-end">
          <TouchableOpacity 
            activeOpacity={1} 
            onPress={() => setPickerOpen(false)} 
            style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.5)' }]} 
          />
          <ThemedView variant="surface" style={{ height: '70%', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24 }}>
            <View className="flex-row justify-between items-center mb-6">
              <View>
                <ThemedText type="subtitle">Add to Favourites</ThemedText>
                <ThemedText variant="muted" style={{ fontSize: 13 }}>Pick from your saved contacts</ThemedText>
              </View>
              <TouchableOpacity onPress={() => setPickerOpen(false)}>
                <MaterialIcons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              onPress={() => {
                setPickerOpen(false);
                setAddModalOpen(true);
              }}
              className="flex-row items-center p-4 mb-4 rounded-2xl border-dashed border-2"
              style={{ borderColor: colors.primary, backgroundColor: colors.surface }}
            >
              <View className="w-10 h-10 rounded-full items-center justify-center mr-3" style={{ backgroundColor: colors.violet }}>
                <MaterialIcons name="person-add" size={20} color="#fff" />
              </View>
              <ThemedText className="font-bold flex-1" style={{ color: colors.primary }}>Add New Recipient</ThemedText>
              <MaterialIcons name="chevron-right" size={20} color={colors.primary} />
            </TouchableOpacity>

            <ScrollView showsVerticalScrollIndicator={false}>
              {allStored.length === 0 ? (
                <View className="items-center py-8">
                   <ThemedText variant="muted">No contacts found yet.</ThemedText>
                </View>
              ) : (
                allStored.map((c: StoredContact) => (
                  <TouchableOpacity 
                    key={c.id} 
                    onPress={() => {
                      toggleFavorite(c.id);
                      setPickerOpen(false);
                    }}
                    className="flex-row items-center py-3 border-b"
                    style={{ borderColor: colors.border }}
                  >
                    <ThemedView className="w-10 h-10 rounded-full items-center justify-center mr-3" style={{ backgroundColor: colors.muted }}>
                       <ThemedText className="font-bold">{(c.name.charAt(0) ?? '?').toUpperCase()}</ThemedText>
                    </ThemedView>
                    <View className="flex-1">
                      <ThemedText className="font-semibold">{c.name}</ThemedText>
                      <ThemedText variant="muted" className="text-xs">{c.alias}</ThemedText>
                    </View>
                    <MaterialIcons 
                      name={c.isFavorite ? "star" : "star-border"} 
                      size={24} 
                      color={c.isFavorite ? "#EAB308" : colors.textMuted} 
                    />
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </ThemedView>
        </ThemedView>
      </Modal>

      <AddContactModal 
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onAdd={async (name, id) => {
           // For a seamless "add to favorite" flow, we can mark it as favorite immediately
           // but the existing logic in addContact doesn't support an extra param easily.
           // So we'll just add it normally and the user can pick it as favorite.
           await addContact(name, id);
           setAddModalOpen(false);
        }}
        colors={colors}
      />
    </ThemedView>
  );
}
