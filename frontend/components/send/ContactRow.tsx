// ContactRow — selectable row in the Saved Contacts list
// Shows circular avatar image, name, address, and a purple send arrow

import React from 'react';
import { TouchableOpacity, Image, View, useColorScheme } from 'react-native';
import { ThemedView } from '@/components/ui/ThemedView';
import { ThemedText } from '@/components/ui/ThemedText';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
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
      activeOpacity={0.7}
      className="flex-row items-center px-5 py-3 mx-4"
    >
      {/* Avatar */}
      <Image
        source={{ uri: contact.avatar }}
        style={{ width: 48, height: 48, borderRadius: 24, marginRight: 12 }}
      />

      {/* Name + address */}
      <ThemedView className="flex-1">
        <ThemedText type="defaultSemiBold" variant="default" className="text-sm">
          {contact.name}
        </ThemedText>
        <ThemedText variant="muted" className="text-xs mt-0.5">
          {contact.shortAddress}
        </ThemedText>
      </ThemedView>

      {/* Purple send arrow */}
      <View
        className="w-9 h-9 rounded-full items-center justify-center"
        style={{ backgroundColor: '#ede9fe' }}
      >
        <MaterialIcons name="send" size={16} color={colors.primary} />
      </View>
    </TouchableOpacity>
  );
}
