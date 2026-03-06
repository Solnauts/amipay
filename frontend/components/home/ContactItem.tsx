import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import { ThemedText } from '@/components/ui/ThemedText';
import { ThemedView } from '@/components/ui/ThemedView';
import type { Contact } from './homeData';

type Props = {
  contact: Contact;
  size?: 'md' | 'sm';
  onPress?: () => void;
};

/**
 * Reusable circular avatar for a contact.
 * size="md"  → 56px (People grid)
 * size="sm"  → 48px (Favourite grid)
 */
export function ContactItem({ contact, size = 'md', onPress }: Props) {
  const dim = 64;
  const fontSize = 18;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      className="items-center gap-1.5"
      style={{ width: dim + 8 }}
    >
      <ThemedView
        className="rounded-full items-center justify-center"
        style={{ width: dim, height: dim, backgroundColor: contact.color }}
      >
        <ThemedText
          className="font-bold text-white"
          style={{ fontSize, color: '#ffffff' }}
        >
          {contact.initials}
        </ThemedText>
      </ThemedView>
      <ThemedText variant="secondary" className="text-xs text-center" numberOfLines={1}>
        {contact.name}
      </ThemedText>
    </TouchableOpacity>
  );
}
