// CreateGroupButton — dashed-border CTA at the top of the groups list

import React from 'react';
import { TouchableOpacity, useColorScheme } from 'react-native';
import { ThemedView } from '@/components/ui/ThemedView';
import { ThemedText } from '@/components/ui/ThemedText';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Colors } from '@/constants/theme';

type Props = {
  onPress: () => void;
};

export function CreateGroupButton({ onPress }: Props) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      className="mx-6 mb-6"
    >
      <ThemedView
        variant="surface"
        className="flex-row items-center rounded-2xl px-5 py-4 gap-4"
        style={{ borderWidth: 1.5, borderColor: colors.border, borderStyle: 'dashed' }}
      >
        <ThemedView
          className="w-10 h-10 rounded-full items-center justify-center"
          style={{ backgroundColor: colors.muted }}
        >
          <MaterialIcons name="add" size={22} color={colors.mutedForeground} />
        </ThemedView>

        <ThemedView variant="surface">
          <ThemedText type="defaultSemiBold" variant="default" className="text-base">
            Create New Group
          </ThemedText>
          <ThemedText variant="muted" className="text-xs mt-0.5">
            Add multiple recipients
          </ThemedText>
        </ThemedView>
      </ThemedView>
    </TouchableOpacity>
  );
}
