import React, { useState } from 'react';
import { View, TouchableOpacity, useColorScheme } from 'react-native';
import { router } from 'expo-router';
import { ThemedText } from '@/components/ui/ThemedText';
import { ThemedView } from '@/components/ui/ThemedView';
import { Colors } from '@/constants/theme';
import { ContactItem } from './ContactItem';
import { FAVOURITES } from './homeData';
import Svg, { Circle } from 'react-native-svg';
import { Feather } from '@expo/vector-icons';
import { AddContactModal } from '@/components/contacts/AddContactModal';
import { useContacts } from '@/hooks/useContacts';

/**
 * "Favourite" section — single row of pinned contacts + an Add button.
 */
export function FavouriteSection() {
  const isDark = useColorScheme() === 'dark';
  const colors = Colors[useColorScheme() ?? 'light'];
  const { addContact } = useContacts();
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <ThemedView className="px-6 mb-6">
      <ThemedText variant="default" className="font-bold text-lg mb-4">
        Favourite
      </ThemedText>

      <View className="flex-row gap-4">
        {FAVOURITES.map((contact) => (
          <ContactItem
            key={contact.name}
            contact={contact}
            size="sm"
            onPress={() => router.push(`/(tabs)/contacts?contactId=${contact.id}` as any)}
          />
        ))}

        {/* Add button */}
        <TouchableOpacity
          onPress={() => setModalOpen(true)}
          activeOpacity={0.75}
          className="items-center gap-1.5"
          style={{ width: 64 }}
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
              <Feather name="plus" size={18} color={colors.textMuted} />
            </ThemedView>
          </View>

          <ThemedText variant="muted" style={{ fontSize: 12 }}>Add</ThemedText>
        </TouchableOpacity>
      </View>

      <AddContactModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onAdd={addContact}
        colors={colors}
      />
    </ThemedView>
  );
}
