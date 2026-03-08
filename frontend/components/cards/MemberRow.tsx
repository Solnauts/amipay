// MemberRow — selectable contact row for the member selection step
// Now delegates to shared/PersonRow

import React from 'react';
import { useColorScheme } from 'react-native';
import { PersonRow } from '@/components/shared/PersonRow';
import { Colors } from '@/constants/theme';
import { Contact } from '@/components/cards/cardsData';

type Props = {
  contact: Contact;
  isSelected: boolean;
  onPress: (contact: Contact) => void;
};

export function MemberRow({ contact, isSelected, onPress }: Props) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  return (
    <PersonRow
      name={contact.name}
      subtitle={contact.shortAddress}
      emoji={contact.emoji}
      avatarColor={colors.muted}   // original used colors.muted as bg for emoji avatars
      selectable={true}
      isSelected={isSelected}
      onPress={() => onPress(contact)}
    />
  );
}
