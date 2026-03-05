import React from 'react';
import { View, TouchableOpacity, useColorScheme } from 'react-native';
import { ThemedText } from '@/components/ui/ThemedText';
import { ThemedView } from '@/components/ui/ThemedView';
import { Colors } from '@/constants/theme';
import { ContactItem } from './ContactItem';
import { FAVOURITES } from './homeData';
import Svg, { Circle } from 'react-native-svg';
import { Feather } from '@expo/vector-icons';

/**
 * "Favourite" section — single row of pinned contacts + an Add button.
 */
export function FavouriteSection() {
  const colors = Colors[useColorScheme() ?? 'light'];

  return (
    <ThemedView className="px-6 mb-6">
      <ThemedText variant="default" className="font-bold text-lg mb-4">
        Favourite
      </ThemedText>

      <View className="flex-row gap-4">
        {FAVOURITES.map((contact) => (
          <ContactItem key={contact.name} contact={contact} size="sm" />
        ))}

        {/* Add button */}
      <TouchableOpacity
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
                  <Feather name="plus" size={18} color={colors.textMuted} />
                </ThemedView>
              </View>

              <ThemedText variant="muted" className="text-xs">Add</ThemedText>
            </TouchableOpacity>
      </View>
    </ThemedView>
  );
}
