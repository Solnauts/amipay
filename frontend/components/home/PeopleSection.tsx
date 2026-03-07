import React from 'react';
import { View, TouchableOpacity, useColorScheme } from 'react-native';
import { router } from 'expo-router';
import { ThemedText } from '@/components/ui/ThemedText';
import { ThemedView } from '@/components/ui/ThemedView';
import { Colors } from '@/constants/theme';
import { ContactItem } from './ContactItem';
import { PEOPLE } from './homeData';
import type { Contact } from './homeData';
import { Feather } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';

const COLUMNS = 4;

/**
 * "People" section — shows a 2-row grid of recent contacts.
 * The last slot is always the "More" chevron button.
 */
export function PeopleSection() {
  const colors = Colors[useColorScheme() ?? 'light'];

  // Split into rows of COLUMNS
  const rows: Contact[][] = [];
  for (let i = 0; i < PEOPLE.length; i += COLUMNS) {
    rows.push(PEOPLE.slice(i, i + COLUMNS));
  }
  // Fill the last row so the More button sits in the right slot
  const lastRow = rows[rows.length - 1];
  while (lastRow.length < COLUMNS - 1) lastRow.push({ id: '', initials: '', name: '', color: 'transparent' });

  return (
    <ThemedView className="px-6 mb-6">
      <ThemedText variant="default" className="font-bold text-lg mb-4">
        People
      </ThemedText>

      {rows.map((row, rowIdx) => (
        <ThemedView key={rowIdx} className="flex-row justify-between mb-3">
          {row.map((contact, colIdx) =>
            contact.name ? (
              <ContactItem
                key={`${rowIdx}-${colIdx}`}
                contact={contact}
                size="md"
                onPress={() => router.push(`/(tabs)/rewards?contactId=${contact.id}` as any)}
              />
            ) : (
              <ThemedView key={`empty-${rowIdx}-${colIdx}`} style={{ width: 64 }} />
            )
          )}

          {/* "More" button — only on the last row */}
          {rowIdx === rows.length - 1 && (
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/contacts' as any)}
              activeOpacity={0.75}
              className="items-center gap-1.5"
              style={{ width: 64 }}
            >
              {/* Outer container — must NOT clip so the absolute SVG is visible */}
              <View style={{ width: 56, height: 56, position: 'relative', alignItems: 'center', justifyContent: 'center' }}>

                {/* Dashed ring drawn by SVG — sits below the inner circle */}
                <Svg width={56} height={56} style={{ position: 'absolute', top: 0, left: 0 }}>
                  <Circle
                    cx={28}
                    cy={28}
                    r={26}
                    stroke={colors.textMuted}
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                    fill="none"
                  />
                </Svg>

                {/* Inner circle — NO solid border so the SVG dashes show through */}
                <ThemedView
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Feather name="chevron-down" size={18} color={colors.textMuted} />
                </ThemedView>
              </View>

              <ThemedText variant="muted" className="text-xs">More</ThemedText>
            </TouchableOpacity>
          )}
        </ThemedView>
      ))}
    </ThemedView>
  );
}
