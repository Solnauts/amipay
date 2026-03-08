/**
 * IconButton — small round button containing a single icon.
 *
 * Used in headers (bell, QR scan, etc.) wherever a borderless circle
 * touch target is needed.  Styling is identical to the inline
 * implementations in HomeHeader and similar screens.
 */

import React from 'react';
import { TouchableOpacity, useColorScheme } from 'react-native';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';

type SFSymbolName = React.ComponentProps<typeof IconSymbol>['name'];

type Props = {
    /** SFSymbol icon name */
    icon: SFSymbolName;
    onPress: () => void;
    /** Icon + border size. Default 'md' = 36px diameter */
    size?: 'sm' | 'md' | 'lg';
    /** Override icon colour. Defaults to theme textMuted */
    iconColor?: string;
};

const DIM_MAP = { sm: 32, md: 36, lg: 44 } as const;
const ICON_SIZE_MAP = { sm: 14, md: 16, lg: 20 } as const;

export function IconButton({ icon, onPress, size = 'md', iconColor }: Props) {
    const colorScheme = useColorScheme() ?? 'light';
    const colors = Colors[colorScheme];
    const dim = DIM_MAP[size];
    const iconSz = ICON_SIZE_MAP[size];

    return (
        <TouchableOpacity
            onPress={onPress}
            activeOpacity={0.7}
            className="rounded-full items-center justify-center"
            style={{
                width: dim,
                height: dim,
                backgroundColor: colors.surface,
                borderWidth: 1,
                borderColor: colors.border,
            }}
        >
            <IconSymbol
                name={icon}
                size={iconSz}
                color={iconColor ?? colors.textMuted}
            />
        </TouchableOpacity>
    );
}
