/**
 * shared/TransactionRow — unified transaction list row.
 *
 * Covers both usages:
 *  • home/TransactionItem  → showBadge=false  (simple avatar + name + amount)
 *  • wallet/TransactionCard → showBadge=true  (avatar + direction badge + token/USD)
 *
 * No visual changes — exact same styles as the originals.
 */

import React from 'react';
import { useColorScheme } from 'react-native';
import { ThemedView } from '@/components/ui/ThemedView';
import { ThemedText } from '@/components/ui/ThemedText';
import { Avatar } from '@/components/ui/Avatar';
import { Colors } from '@/constants/theme';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

type Props = {
    /** Contact/sender name */
    name: string;
    /** Avatar initials, e.g. "AB" */
    initials: string;
    /** Avatar background colour */
    avatarColor: string;
    /**
     * Direction of the transaction.
     * 'sent' → red amount & outgoing badge
     * 'received' → green amount & incoming badge
     */
    type: 'sent' | 'received';
    /**
     * Formatted amount string, e.g. "-$12.50" or "+0.5 USDC"
     * The component does NOT reformat this; pass whatever you want displayed.
     */
    amount: string;
    /** Secondary label shown under the amount (USD equivalent) */
    amountSub?: string;
    /** Subtitle shown under name, e.g. "Sent · 2h ago" */
    subtitle?: string;
    /** Time string shown under name (used when subtitle is absent) */
    time?: string;
    /**
     * When true, renders a direction badge icon at bottom-right of avatar.
     * Used by wallet/TransactionCard. Defaults to false.
     */
    showBadge?: boolean;
    /**
     * When true, replaces the Avatar with a Sent/Received icon (MaterialIcons).
     */
    useIconInsteadOfAvatar?: boolean;
};

export function TransactionRow({
    name,
    initials,
    avatarColor,
    type,
    amount,
    amountSub,
    subtitle,
    time,
    showBadge = false,
    useIconInsteadOfAvatar = false,
}: Props) {
    const colorScheme = useColorScheme() ?? 'light';
    const colors = Colors[colorScheme];

    const isSent = type === 'sent';
    // Figma: received = green, sent = red
    const amountColor = isSent ? colors.error : colors.success;

    // Badge props only passed when showBadge is on
    const badgeIcon = showBadge
        ? (isSent ? 'arrow-outward' : 'arrow-downward') as React.ComponentProps<typeof Avatar>['badgeIcon']
        : undefined;
    const badgeColor = showBadge
        ? (isSent ? colors.error : colors.success)
        : undefined;

    const subtitleText = subtitle ?? (time ? time : undefined);

    const renderLeading = () => {
        if (useIconInsteadOfAvatar) {
            return (
                <ThemedView
                    variant="default"
                    className="w-10 h-10 rounded-full items-center justify-center mr-3"
                    style={{
                        backgroundColor: isSent ? '#ede9fe' : '#dcfce7',
                    }}
                >
                    <MaterialIcons
                        name="send"
                        size={16}
                        color={isSent ? '#8b5cf6' : '#16a34a'}
                        style={{
                            transform: [{ rotate: isSent ? '0deg' : '230deg' }],
                        }}
                    />
                </ThemedView>
            );
        }

        return (
            <ThemedView
                variant={showBadge ? 'default' : 'surface'}
                className="mr-3"
                style={{ backgroundColor: 'transparent' }}
            >
                <Avatar
                    initials={initials}
                    color={avatarColor}
                    size="md"
                    badgeIcon={badgeIcon}
                    badgeColor={badgeColor}
                />
            </ThemedView>
        );
    };

    return (
        <ThemedView
            variant={showBadge ? 'default' : 'surface'}
            className={`flex-row items-center ${showBadge ? 'px-0 py-3' : 'rounded-2xl p-4'}`}
            style={showBadge ? undefined : { borderWidth: 1, borderColor: colors.border }}
        >
            {/* Leading: Avatar or Icon */}
            {renderLeading()}

            {/* Name + subtitle */}
            <ThemedView
                variant={showBadge ? 'default' : 'surface'}
                className="flex-1"
            >
                <ThemedText
                    variant="default"
                    className="font-semibold text-sm"
                    type={showBadge ? 'defaultSemiBold' : undefined}
                >
                    {name}
                </ThemedText>
                {subtitleText && (
                    <ThemedText variant="muted" className="text-xs mt-0.5">
                        {subtitleText}
                    </ThemedText>
                )}
            </ThemedView>

            {/* Amount block */}
            <ThemedView
                variant={showBadge ? 'default' : 'surface'}
                className={showBadge ? 'items-end' : undefined}
                style={{ backgroundColor: 'transparent' }}
            >
                <ThemedText
                    className="font-bold text-sm"
                    type={showBadge ? 'defaultSemiBold' : undefined}
                    style={{ color: amountColor }}
                >
                    {amount}
                </ThemedText>
                {amountSub && (
                    <ThemedText variant="muted" className="text-xs mt-0.5">
                        {amountSub}
                    </ThemedText>
                )}
            </ThemedView>
        </ThemedView>
    );
}
