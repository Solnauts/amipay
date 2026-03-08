/**
 * GradientButton — purple gradient pill button used throughout the app.
 *
 * Variants
 * ────────
 * 'primary'   violet gradient (#A78BFA → #8B5CF6), violet border
 * 'send'      violet→blue gradient (#A583FF → #3454F7), violet border
 * 'outline'   transparent fill, theme border, themed text
 *
 * The visual appearance is identical to the existing inline implementations
 * in BalanceSection and ButtonComponent.
 */

import React from 'react';
import { TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemedText } from '@/components/ui/ThemedText';
import { IconSymbol } from '@/components/ui/icon-symbol';

type SFSymbolName = React.ComponentProps<typeof IconSymbol>['name'];

type Variant = 'primary' | 'send' | 'outline';

type Props = {
    label: string;
    onPress: () => void;
    disabled?: boolean;
    loading?: boolean;
    /** SFSymbol icon name */
    icon?: SFSymbolName;
    variant?: Variant;
};

const GRADIENT_COLORS: Record<Variant, readonly [string, string]> = {
    primary: ['#A78BFA', '#8B5CF6'],
    send: ['#A583FF', '#3454F7'],
    outline: ['transparent', 'transparent'],
};

const BORDER_COLORS: Record<Variant, string> = {
    primary: '#8B5CF6',
    send: '#7d4bfe',
    outline: '#8B5CF6',
};

export function GradientButton({
    label,
    onPress,
    disabled = false,
    loading = false,
    icon,
    variant = 'primary',
}: Props) {
    return (
        <TouchableOpacity
            activeOpacity={0.92}
            onPress={onPress}
            disabled={disabled || loading}
            style={[
                styles.actionBtn,
                {
                    borderColor: BORDER_COLORS[variant],
                    opacity: disabled || loading ? 0.5 : 1,
                },
            ]}
        >
            <LinearGradient
                colors={GRADIENT_COLORS[variant]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={styles.gradient}
            >
                {loading ? (
                    <ActivityIndicator color="#ffffff" size="small" />
                ) : icon ? (
                    <IconSymbol name={icon} size={16} color="#ffffff" />
                ) : null}
                <ThemedText style={styles.btnText}>{label}</ThemedText>
            </LinearGradient>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    actionBtn: {
        width: '100%',
        borderRadius: 50,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.10,
        shadowRadius: 14,
        elevation: 5,
        overflow: 'hidden',
    },
    gradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        gap: 8,
        borderRadius: 50,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.50)',
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        borderBottomColor: 'transparent',
    },
    btnText: {
        color: '#ffffff',
        fontWeight: '600',
        fontSize: 15,
        fontFamily: 'System',
        letterSpacing: 0.2,
    },
});
