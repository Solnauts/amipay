/**
 * shared/PersonRow — selectable (or plain) contact/member row.
 *
 * Covers both usages:
 *  • cards/MemberRow  → selectable=true, avatar via emoji/initials
 *  • send/ContactRow  → selectable=false, avatar via image URI or initials
 *
 * No visual changes — exact same styles as the originals.
 */

import React from 'react';
import { TouchableOpacity, Image, View, useColorScheme } from 'react-native';
import { ThemedView } from '@/components/ui/ThemedView';
import { ThemedText } from '@/components/ui/ThemedText';
import { Avatar } from '@/components/ui/Avatar';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Colors } from '@/constants/theme';
import { getAvatarSource } from '@/src/store/contactsStore';

type Props = {
    name: string;
    /** Short wallet address or any subtitle */
    subtitle?: string;
    /** Initials shown in the avatar circle, e.g. "JD" */
    initials?: string;
    /** Emoji shown in avatar instead of initials */
    emoji?: string;
    /** Avatar background colour */
    avatarColor?: string;
    /** Image URI — when provided, renders an Image instead of Avatar */
    avatarUri?: string;

    /** Whether the row supports a selected state (MemberRow mode) */
    selectable?: boolean;
    isSelected?: boolean;

    /**
     * When true, renders a purple send-arrow button on the right
     * (ContactRow mode).  Ignored when selectable=true.
     */
    showSendArrow?: boolean;

    onPress?: () => void;
};

export function PersonRow({
    name,
    subtitle,
    initials,
    emoji,
    avatarColor = '#aaa',
    avatarUri,
    selectable = false,
    isSelected = false,
    showSendArrow = false,
    onPress,
}: Props) {
    const colorScheme = useColorScheme() ?? 'light';
    const colors = Colors[colorScheme];

    /* ── MemberRow mode ── */
    if (selectable) {
        return (
            <TouchableOpacity
                onPress={onPress}
                activeOpacity={0.75}
                className="mx-6 mb-3"
            >
                <ThemedView
                    variant={isSelected ? 'default' : 'surface'}
                    className="flex-row items-center rounded-2xl px-5 py-4 gap-4"
                    style={{
                        borderWidth: 1.5,
                        borderColor: isSelected ? colors.primary : colors.border,
                        backgroundColor: isSelected
                            ? colorScheme === 'dark' ? '#1a2e20' : '#f0fdf4'
                            : undefined,
                    }}
                >
                    {/* Avatar */}
                    <Avatar
                        initials={initials}
                        emoji={emoji}
                        color={avatarColor}
                        size="md"
                    />

                    {/* Name + subtitle */}
                    <ThemedView
                        variant="default"
                        className="flex-1"
                        style={{ backgroundColor: 'transparent' }}
                    >
                        <ThemedText type="defaultSemiBold" variant="default" className="text-base">
                            {name}
                        </ThemedText>
                        {subtitle && (
                            <ThemedText variant="muted" className="text-xs mt-0.5">
                                {subtitle}
                            </ThemedText>
                        )}
                    </ThemedView>

                    {/* Checkmark */}
                    {isSelected && (
                        <View
                            className="w-6 h-6 rounded-full items-center justify-center"
                            style={{ backgroundColor: colors.primary }}
                        >
                            <MaterialIcons name="check" size={14} color={colors.primaryForeground} />
                        </View>
                    )}
                </ThemedView>
            </TouchableOpacity>
        );
    }

    /* ── ContactRow mode (send flow) ── */
    return (
        <TouchableOpacity
            onPress={onPress}
            activeOpacity={0.7}
            className="flex-row items-center px-5 py-3 mx-4"
        >
            {/* Avatar — image if URI provided, initials otherwise */}
            {avatarUri ? (
                <Image
                    source={getAvatarSource(avatarUri)}
                    style={{ width: 48, height: 48, borderRadius: 24, marginRight: 12 }}
                />
            ) : (
                <View className="mr-3">
                    <Avatar initials={initials} emoji={emoji} color={avatarColor} size="md" />
                </View>
            )}

            {/* Name + subtitle */}
            <ThemedView className="flex-1">
                <ThemedText type="defaultSemiBold" variant="default" className="text-sm">
                    {name}
                </ThemedText>
                {subtitle && (
                    <ThemedText variant="muted" className="text-xs mt-0.5">
                        {subtitle}
                    </ThemedText>
                )}
            </ThemedView>

            {/* Purple send arrow */}
            {showSendArrow && (
                <View
                    className="w-9 h-9 rounded-full items-center justify-center"
                    style={{ backgroundColor: '#ede9fe' }}
                >
                    <MaterialIcons name="send" size={16} color={colors.primary} />
                </View>
            )}
        </TouchableOpacity>
    );
}
