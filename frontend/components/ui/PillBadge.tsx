/**
 * PillBadge — a small rounded pill used as filter toggle or currency selector.
 *
 * active=true  → fills with theme primary colour
 * active=false → surface background with border
 *
 * Used in FilterPills (All / Sent / Received) and the currency selector
 * in BalanceSection.  Exact same visual as the existing inline implementations.
 */

import React from 'react';
import { TouchableOpacity, useColorScheme } from 'react-native';
import { ThemedText } from '@/components/ui/ThemedText';
import { Colors } from '@/constants/theme';

type Props = {
    label: string;
    isActive?: boolean;
    onPress?: () => void;
    /** Append a chevron-down icon after the label (used for currency selector) */
    showChevron?: boolean;
};

export function PillBadge({ label, isActive = false, onPress, showChevron = false }: Props) {
    const colorScheme = useColorScheme() ?? 'light';
    const colors = Colors[colorScheme];

    return (
        <TouchableOpacity
            onPress={onPress}
            activeOpacity={0.75}
            className="flex-row items-center gap-1 rounded-full px-5 py-2"
            style={{
                backgroundColor: isActive ? colors.primary : colors.surface,
                borderWidth: 1,
                borderColor: isActive ? colors.primary : colors.border,
            }}
        >
            <ThemedText
                type="defaultSemiBold"
                className="text-sm"
                style={{ color: isActive ? colors.primaryForeground : colors.mutedForeground }}
            >
                {label}
            </ThemedText>
        </TouchableOpacity>
    );
}
