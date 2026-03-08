import React from 'react';
import { TouchableOpacity, Image } from 'react-native';
import { ThemedText } from '@/components/ui/ThemedText';
import { Avatar } from '@/components/ui/Avatar';
import type { Contact } from './homeData';
import { getAvatarSource } from '@/src/store/contactsStore';

type Props = {
  contact: Contact;
  size?: 'md' | 'sm';
  onPress?: () => void;
};

/**
 * Reusable circular avatar for a contact.
 * size="md" → 64px (People grid)
 * size="sm" → 48px (Favourite grid)
 */
export function ContactItem({ contact, size = 'md', onPress }: Props) {
  const dim = 64

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      className="items-center gap-1.5"
      style={{ width: dim + 8 }}
    >
      {contact.imageUri ? (
        <Image
          source={getAvatarSource(contact.imageUri)}
          style={{ width: dim, height: dim, borderRadius: dim / 2 }}
          resizeMode="cover"
        />
      ) : (
        <Avatar
          initials={contact.initials}
          color={contact.color}
          size="lg"
        />
      )}

      <ThemedText
        variant="secondary"
        className="text-xs text-center"
        numberOfLines={1}
      >
        {contact.name}
      </ThemedText>
    </TouchableOpacity>
  );
}