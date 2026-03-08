// SelectedMembersBar — chip tray showing selected members above the list
// Only rendered when at least 1 member is selected

import React from 'react';
import { ScrollView, TouchableOpacity, View, useColorScheme } from 'react-native';
import { ThemedView } from '@/components/ui/ThemedView';
import { ThemedText } from '@/components/ui/ThemedText';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Colors } from '@/constants/theme';
import { Contact } from '@/components/cards/cardsData';

type Props = {
  selected: Contact[];
  onRemove: (contact: Contact) => void;
};

export function SelectedMembersBar({ selected, onRemove }: Props) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  if (selected.length === 0) return null;

  return (
    <ThemedView
      variant="surface"
      className="mx-6 mb-4 rounded-2xl px-4 pt-3 pb-2"
      style={{ borderWidth: 1, borderColor: colors.border }}
    >
      <ThemedText variant="muted" className="text-xs font-semibold mb-2">
        Selected ({selected.length})
      </ThemedText>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <ThemedView variant="surface" className="flex-row gap-2">
          {selected.map((contact) => (
            <ThemedView
              key={contact.id}
              variant="default"
              className="flex-row items-center rounded-full px-3 py-1.5 gap-1.5"
              style={{ backgroundColor: colors.muted }}
            >
              <ThemedText className="text-base leading-none">{contact.emoji}</ThemedText>
              <ThemedText
                type="defaultSemiBold"
                variant="default"
                className="text-sm"
              >
                {contact.name}
              </ThemedText>
              <TouchableOpacity
                onPress={() => onRemove(contact)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <MaterialIcons name="close" size={14} color={colors.mutedForeground} />
              </TouchableOpacity>
            </ThemedView>
          ))}
        </ThemedView>
      </ScrollView>
    </ThemedView>
  );
}
