// MemberRow — selectable contact row for the member selection step
// Shows selected state with blue background + checkmark

import React from 'react';
import { TouchableOpacity, View, useColorScheme } from 'react-native';
import { ThemedView } from '@/components/ui/ThemedView';
import { ThemedText } from '@/components/ui/ThemedText';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
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
    <TouchableOpacity
      onPress={() => onPress(contact)}
      activeOpacity={0.75}
      className="mx-6 mb-3"
    >
      <ThemedView
        variant={isSelected ? 'default' : 'surface'}
        className="flex-row items-center rounded-2xl px-5 py-4 gap-4"
        style={{
          borderWidth: 1.5,
          borderColor: isSelected ? colors.primary : colors.border,
          backgroundColor: isSelected
            ? colorScheme === 'dark' ? '#1a2e20' : '#f0fdf4'
            : undefined,
        }}
      >
        {/* Emoji avatar */}
        <View
          className="w-11 h-11 rounded-full items-center justify-center"
          style={{ backgroundColor: colors.muted }}
        >
          <ThemedText className="text-2xl">{contact.emoji}</ThemedText>
        </View>

        {/* Name + short address */}
        <ThemedView
          variant="default"
          className="flex-1"
          style={{ backgroundColor: 'transparent' }}
        >
          <ThemedText type="defaultSemiBold" variant="default" className="text-base">
            {contact.name}
          </ThemedText>
          <ThemedText variant="muted" className="text-xs mt-0.5">
            {contact.shortAddress}
          </ThemedText>
        </ThemedView>

        {/* Checkmark when selected */}
        {isSelected && (
          <View
            className="w-6 h-6 rounded-full items-center justify-center"
            style={{ backgroundColor: colors.primary }}
          >
            <MaterialIcons name="check" size={14} color={colors.primaryForeground} />
          </View>
        )}
      </ThemedView>
    </TouchableOpacity>
  );
}
