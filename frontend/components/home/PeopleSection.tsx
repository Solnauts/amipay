import React from 'react';
import { View, TouchableOpacity, useColorScheme } from 'react-native';
import { router } from 'expo-router';
import { ThemedText } from '@/components/ui/ThemedText';
import { ThemedView } from '@/components/ui/ThemedView';
import { Colors } from '@/constants/theme';
import { ContactItem } from './ContactItem';
import { StoredContact } from '@/src/store/contactsStore';
import { useContacts } from '@/hooks/useContacts';
import type { Contact } from './homeData';
import { Feather } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';

const COLUMNS = 4;

function toLegacyContact(sc: StoredContact): Contact {
  return {
    id: sc.id,
    name: sc.name,
    initials: sc.name.charAt(0).toUpperCase(),
    color: '#8B5CF6',
    imageUri: sc.avatar,
  };
}

/**
 * "People" section — shows a grid composed of actual stored contacts.
 * The last slot is always the "More" chevron button.
 */
export function PeopleSection() {
  const colors = Colors[useColorScheme() ?? 'light'];
  const { contacts: allStored } = useContacts();
  const people = allStored.map(toLegacyContact);

  // Show up to 7 contacts + 1 "More" button
  const limit = 7;
  const displayPeople = people.slice(0, limit);

  return (
    <ThemedView className="px-6 mb-6">
      <ThemedText variant="default" className="font-bold text-lg mb-4">
        People
      </ThemedText>

      {people.length === 0 ? (
        <ThemedView
          className="items-center py-6 rounded-2xl"
          style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}
        >
          <Feather name="users" size={28} color={colors.textMuted} />
          <ThemedText variant="muted" style={{ marginTop: 8, fontSize: 13 }}>
            No contacts yet
          </ThemedText>
          <ThemedText variant="muted" style={{ fontSize: 12, marginTop: 2 }}>
            Add contacts to see them here
          </ThemedText>
        </ThemedView>
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
          {displayPeople.map((contact, idx) => (
            <ContactItem
              key={contact.id}
              contact={contact}
              size="md"
              onPress={() => router.push(`/(tabs)/contacts?contactId=${contact.id}` as any)}
            />
          ))}

          {/* "More" button */}
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/contacts' as any)}
            activeOpacity={0.75}
            className="items-center gap-1.5"
            style={{ width: 72 }}
          >
            {/* Outer container — must NOT clip so the absolute SVG is visible */}
            <View style={{ width: 56, height: 56, position: 'relative', alignItems: 'center', justifyContent: 'center' }}>

              {/* Dashed ring drawn by SVG — sits below the inner circle */}
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

              {/* Inner circle — NO solid border so the SVG dashes show through */}
              <ThemedView
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Feather name="chevron-down" size={18} color={colors.textMuted} />
              </ThemedView>
            </View>

            <ThemedText variant="muted" className="text-xs">More</ThemedText>
          </TouchableOpacity>
        </View>
      )}
    </ThemedView>
  );
}
