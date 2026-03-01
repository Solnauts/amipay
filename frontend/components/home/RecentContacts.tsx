import React from 'react';
import { View, ScrollView, TouchableOpacity, useColorScheme } from 'react-native';
import { router } from 'expo-router';
import { ThemedText } from '@/components/ui/ThemedText';
import { ThemedView } from '@/components/ui/ThemedView';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { CONTACTS } from './homeData';

export function RecentContacts() {
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';
  const borderColor = isDark ? '#374151' : '#e5e7eb';
  const textMuted = '#9ca3af';

  return (
    <ThemedView className="mb-6">
      <ThemedText variant="default" className="font-bold text-lg px-6 mb-4">
        Recent Contacts
      </ThemedText>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 24, gap: 16 }}
      >
        {CONTACTS.map((c) => (
          <TouchableOpacity key={c.initials} className="items-center gap-2" style={{ width: 60 }}>
            <View
              className="w-14 h-14 rounded-full items-center justify-center"
              style={{ backgroundColor: c.color }}
            >
              <ThemedText className="text-white font-bold text-base">{c.initials}</ThemedText>
            </View>
            <ThemedText variant="secondary" className="text-xs text-center">{c.name}</ThemedText>
          </TouchableOpacity>
        ))}

        {/* More button */}
        <TouchableOpacity className="items-center gap-2" style={{ width: 60 }} onPress={() => router.push('/rewards')}>
          <View
            className="w-14 h-14 rounded-full items-center justify-center"
            style={{ borderWidth: 1.5, borderColor, borderStyle: 'dashed', backgroundColor: 'transparent' }}
          >
            <IconSymbol name="person.fill" size={22} color={textMuted} />
          </View>
          <ThemedText variant="muted" className="text-xs">More</ThemedText>
        </TouchableOpacity>
      </ScrollView>
    </ThemedView>
  );
}
