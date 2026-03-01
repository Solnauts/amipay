// GroupPaymentHeader — shared header for all 3 steps
// Subtitle changes per step to guide the user

import React from 'react';
import { TouchableOpacity, useColorScheme } from 'react-native';
import { ThemedView } from '@/components/ui/ThemedView';
import { ThemedText } from '@/components/ui/ThemedText';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Colors } from '@/constants/theme';

type Props = {
  subtitle: string;
  showBack: boolean;
  onBack?: () => void;
};

export function GroupPaymentHeader({ subtitle, showBack, onBack }: Props) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  return (
    <>
      <ThemedView className="flex-row items-center justify-between px-6 pt-14 pb-4">
        {/* Back button or placeholder */}
        <TouchableOpacity
          onPress={onBack}
          disabled={!showBack}
          className="w-9 h-9 rounded-full items-center justify-center"
          style={{
            backgroundColor: showBack ? colors.surface : 'transparent',
            borderWidth: showBack ? 1 : 0,
            borderColor: colors.border,
          }}
          activeOpacity={0.7}
        >
          {showBack && (
            <MaterialIcons name="arrow-back" size={18} color={colors.text} />
          )}
        </TouchableOpacity>

        {/* Title block — centred */}
        <ThemedView className="items-center">
          <ThemedText type="subtitle" variant="default">
            Group Payment
          </ThemedText>
          <ThemedText variant="muted" className="text-xs mt-0.5">
            {subtitle}
          </ThemedText>
        </ThemedView>

        {/* Spacer to balance back button */}
        <ThemedView className="w-9" />
      </ThemedView>

      {/* Divider */}
      <ThemedView
        className="mx-6 mb-5"
        style={{ height: 1, backgroundColor: colors.border }}
      />
    </>
  );
}
