// ActivityHeader — title + subtitle + filter icon
// Follows same pattern as HomeHeader.tsx

import React from 'react';
import { TouchableOpacity, useColorScheme } from 'react-native';
import { ThemedView } from '@/components/ui/ThemedView';
import { ThemedText } from '@/components/ui/ThemedText';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Colors } from '@/constants/theme';

type Props = {
  onFilterPress?: () => void;
};

export function ActivityHeader({ onFilterPress }: Props) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  return (
    <ThemedView className="flex-row items-center justify-between px-6 pt-14 pb-4">
      {/* Title block */}
      <ThemedView>
        <ThemedText type="subtitle" variant="default">
          Activities
        </ThemedText>
        <ThemedText variant="muted" className="text-xs mt-0.5">
          All transactions
        </ThemedText>
      </ThemedView>

      {/* Filter icon button */}
      <TouchableOpacity
        onPress={onFilterPress}
        className="w-9 h-9 rounded-full items-center justify-center"
        style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}
        activeOpacity={0.7}
      >
        <MaterialIcons name="tune" size={18} color={colors.mutedForeground} />
      </TouchableOpacity>
    </ThemedView>
  );
}
