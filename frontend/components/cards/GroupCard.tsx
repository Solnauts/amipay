// GroupCard — single row in the saved groups list

import React from 'react';
import { TouchableOpacity, View, useColorScheme } from 'react-native';
import { ThemedView } from '@/components/ui/ThemedView';
import { ThemedText } from '@/components/ui/ThemedText';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Colors } from '@/constants/theme';
import { Group } from '@/components/cards/cardsData';

type Props = {
  group: Group;
  onPress: (group: Group) => void;
};

export function GroupCard({ group, onPress }: Props) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  return (
    <TouchableOpacity
      onPress={() => onPress(group)}
      activeOpacity={0.75}
      className="mx-6 mb-3"
    >
      <ThemedView
        variant="surface"
        className="flex-row items-center rounded-2xl px-5 py-4 gap-4"
        style={{ borderWidth: 1, borderColor: colors.border }}
      >
        {/* Icon avatar */}
        <View
          className="w-11 h-11 rounded-2xl items-center justify-center"
          style={{ backgroundColor: colors.muted }}
        >
          <MaterialIcons name="group" size={22} color={colors.mutedForeground} />
        </View>

        {/* Group info */}
        <ThemedView variant="surface" className="flex-1">
          <ThemedText type="defaultSemiBold" variant="default" className="text-base">
            {group.name}
          </ThemedText>
          <ThemedText variant="muted" className="text-xs mt-0.5">
            {group.memberCount} members · Last used {group.lastUsedLabel}
          </ThemedText>
        </ThemedView>

        <MaterialIcons name="chevron-right" size={20} color={colors.mutedForeground} />
      </ThemedView>
    </TouchableOpacity>
  );
}
