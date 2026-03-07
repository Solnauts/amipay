import React from 'react';
import { View, TouchableOpacity, useColorScheme } from 'react-native';
import { router } from 'expo-router';
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

      <View className="flex-row justify-between">
        {FAVOURITES.map((contact) => (
          <ContactItem
            key={contact.name}
            contact={contact}
            size="sm"
            onPress={() => router.push(`/(tabs)/rewards?contactId=${contact.id}` as any)}
          />
        ))}

        {/* Add button */}
<TouchableOpacity
  onPress={() => router.push('/(tabs)/rewards' as any)}
  activeOpacity={0.75}
  className="items-center gap-1.5"
  style={{ width: 64 }} // Updated width
>
  {/* Outer container — 64x64 */}
  <View style={{ width: 64, height: 64, position: 'relative', alignItems: 'center', justifyContent: 'center' }}>

    {/* Dashed ring SVG — 64x64 */}
    <Svg width={64} height={64} style={{ position: 'absolute', top: 0, left: 0 }}>
      <Circle
        cx={32} // Center X is half of 64
        cy={32} // Center Y is half of 64
        r={30}  // Radius is 32 minus a little padding for the stroke
        stroke={colors.textMuted}
        strokeWidth={1.5}
        strokeDasharray="4 4"
        fill="none"
      />
    </Svg>

    {/* Inner circle — Scaled up from 44 to 52 to match the new proportions */}
    <ThemedView
      style={{
        width: 52,
        height: 52,
        borderRadius: 26, // Half of 52
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Feather name="plus" size={20} color={colors.textMuted} />
    </ThemedView>
  </View>

  <ThemedText variant="muted" className="text-xs">Add</ThemedText>
</TouchableOpacity>
      </View>
    </ThemedView>
  );
}
