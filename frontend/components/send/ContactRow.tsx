// ContactRow — selectable recipient in the contact picker
// Used for both Recent and All Contacts sections

import React from 'react';
import { TouchableOpacity, useColorScheme } from 'react-native';
import { ThemedView } from '@/components/ui/ThemedView';
import { ThemedText } from '@/components/ui/ThemedText';
import { Colors } from '@/constants/theme';
import { Contact } from '@/components/cards/cardsData';

type Props = {
  contact: Contact;
  onPress: (contact: Contact) => void;
};

export function ContactRow({ contact, onPress }: Props) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  return (
    <TouchableOpacity
      onPress={() => onPress(contact)}
      activeOpacity={0.75}
      className="mx-6 mb-2"
    >
      <ThemedView
        variant="surface"
        className="flex-row items-center rounded-2xl px-4 py-3 gap-4"
        style={{ borderWidth: 1, borderColor: colors.border }}
      >
        {/* Emoji avatar */}
        <ThemedView
          className="w-12 h-12 rounded-full items-center justify-center"
          style={{ backgroundColor: colors.muted }}
        >
          <ThemedText className="text-2xl">{contact.emoji}</ThemedText>
        </ThemedView>

        {/* Name + address */}
        <ThemedView variant="surface">
          <ThemedText type="defaultSemiBold" variant="default" className="text-base">
            {contact.name}
          </ThemedText>
          <ThemedText variant="muted" className="text-xs mt-0.5">
            {contact.shortAddress}
          </ThemedText>
        </ThemedView>
      </ThemedView>
    </TouchableOpacity>
  );
}
