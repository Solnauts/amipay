/**
 * Avatar — circular avatar showing initials or an emoji.
 *
 * Props
 * ─────
 * initials   text to display (letter-based avatars, e.g. "JD")
 * emoji      emoji string to display instead of initials
 * color      background fill colour (hex / rgba)
 * size       preset diameter: 'sm' = 36, 'md' = 44, 'lg' = 64
 * badgeIcon  optional MaterialIcons name rendered as a small bottom-right badge
 * badgeColor background colour of the badge circle
 */

import React from 'react';
import { View } from 'react-native';
import { ThemedText } from '@/components/ui/ThemedText';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

const SIZE_MAP = {
    sm: { dim: 36, fontSize: 13 },
    md: { dim: 44, fontSize: 15 },
    lg: { dim: 64, fontSize: 18 },
} as const;

type BadgeIconName = React.ComponentProps<typeof MaterialIcons>['name'];

type Props = {
    /** Letter initials, e.g. "AB". Used when emoji is not provided. */
    initials?: string;
    /** Emoji character, e.g. "🎉". Takes precedence over initials. */
    emoji?: string;
    /** Background fill colour for the circle */
    color: string;
    /** Circle size preset */
    size?: keyof typeof SIZE_MAP;
    /** Optional MaterialIcons name displayed as a small badge at bottom-right */
    badgeIcon?: BadgeIconName;
    /** Background colour for the badge circle */
    badgeColor?: string;
};

export function Avatar({
    initials,
    emoji,
    color,
    size = 'md',
    badgeIcon,
    badgeColor,
}: Props) {
    const { dim, fontSize } = SIZE_MAP[size];
    const badgeDim = Math.round(dim * 0.45);
    const badgeIconSize = Math.round(badgeDim * 0.55);

    return (
        <View className="relative" style={{ width: dim, height: dim }}>
            {/* Main circle */}
            <View
                className="rounded-full items-center justify-center"
                style={{ width: dim, height: dim, backgroundColor: color }}
            >
                {emoji ? (
                    <ThemedText style={{ fontSize: fontSize + 2 }}>{emoji}</ThemedText>
                ) : (
                    <ThemedText
                        className="font-bold"
                        style={{ color: '#ffffff', fontSize }}
                    >
                        {initials ?? '?'}
                    </ThemedText>
                )}
            </View>

            {/* Direction / status badge */}
            {badgeIcon && badgeColor && (
                <View
                    className="absolute -bottom-0.5 -right-0.5 rounded-full items-center justify-center"
                    style={{ width: badgeDim, height: badgeDim, backgroundColor: badgeColor }}
                >
                    <MaterialIcons name={badgeIcon} size={badgeIconSize} color="#ffffff" />
                </View>
            )}
        </View>
    );
}
