// SearchBar — controlled text input for filtering transactions
// Uses ThemedView for the container and ThemedText-style color from theme

import React from 'react';
import { TextInput, useColorScheme } from 'react-native';
import { ThemedView } from '@/components/ui/ThemedView';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Colors } from '@/constants/theme';

type Props = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
};

export function SearchBar({ value, onChangeText, placeholder = 'Search transaction...' }: Props) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  return (
    <ThemedView className="mx-6 mb-4">
      <ThemedView
        variant="surface"
        className="flex-row items-center rounded-full px-4 gap-3"
        style={{ height: 52, borderWidth: 1, borderColor: colors.border }}
      >
        <MaterialIcons name="search" size={20} color={colors.mutedForeground} />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.mutedForeground}
          style={{
            flex: 1,
            color: colors.text,
            fontSize: 14,
            paddingVertical: 0, // prevents Android extra padding
          }}
          returnKeyType="search"
          clearButtonMode="while-editing" // iOS clear button
          autoCorrect={false}
          autoCapitalize="none"
        />
      </ThemedView>
    </ThemedView>
  );
}
