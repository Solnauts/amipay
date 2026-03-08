// ContactRow — selectable row in the Saved Contacts list
// Now delegates to shared/PersonRow

import React from 'react';
import { PersonRow } from '@/components/shared/PersonRow';
import { Contact } from '@/components/cards/cardsData';

type Props = {
  contact: Contact;
  onPress: (contact: Contact) => void;
};

export function ContactRow({ contact, onPress }: Props) {
  return (
    <PersonRow
      name={contact.name}
      subtitle={contact.shortAddress}
      avatarUri={contact.avatar}
      showSendArrow={true}
      onPress={() => onPress(contact)}
    />
  );
}
