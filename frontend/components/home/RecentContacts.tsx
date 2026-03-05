import React from 'react';
import { ScrollView, TouchableOpacity, View, useColorScheme } from 'react-native';
import { router } from 'expo-router';
import { ThemedText } from '@/components/ui/ThemedText';
import { ThemedView } from '@/components/ui/ThemedView';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ContactItem } from './ContactItem';
import { PEOPLE } from './homeData';
import { Colors } from '@/constants/theme';

export function RecentContacts() {
  const colors = Colors[useColorScheme() ?? 'light'];

  return (
    <ThemedView variant="default" className="mb-6">
      <ThemedText variant="default" className="font-bold text-lg px-6 mb-4">
        Recent Contacts
      </ThemedText>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 24, gap: 14 }}
      >
        {PEOPLE.map((c) => (
          <ContactItem key={c.name} contact={c} size="md" />
        ))}

        {/* More button */}
        <TouchableOpacity
          className="items-center gap-1.5"
          style={{ width: 64 }}
          onPress={() => router.push('/rewards')}
          activeOpacity={0.75}
        >
          <View
            className="w-14 h-14 rounded-full items-center justify-center"
            style={{ borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface }}
          >
            <IconSymbol name="person.fill" size={22} color={colors.textMuted} />
          </View>
          <ThemedText variant="muted" className="text-xs">More</ThemedText>
        </TouchableOpacity>
      </ScrollView>
    </ThemedView>
  );
}
