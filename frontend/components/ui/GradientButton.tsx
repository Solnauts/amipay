/**
 * GradientButton — violet gradient pill button (NativeWind).
 *
 * Matches the Figma design:
 *   • violet-400 → violet-500 vertical gradient
 *   • h-14 (56px), rounded-[50px]
 *   • inset white top highlight (border-t rgba-white-50)
 *   • outer shadow
 *   • Inter medium, white text, capitalised
 */

import React from 'react';
import { TouchableOpacity, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/ui/icon-symbol';

type SFSymbolName = React.ComponentProps<typeof IconSymbol>['name'];
type Variant = 'primary' | 'send' | 'outline' | 'success';

type Props = {
    label: string;
    onPress: () => void;
    disabled?: boolean;
    loading?: boolean;
    icon?: SFSymbolName;
    variant?: Variant;
};

const GRADIENT_COLORS: Record<Variant, readonly [string, string]> = {
    primary: ['#A78BFA', '#8B5CF6'],   // violet-400 → violet-500
    send: ['#A583FF', '#3454F7'],
    outline: ['transparent', 'transparent'],
    success: ['#34D399', '#10B981'],   // emerald-400 → emerald-500
};

const BORDER_COLORS: Record<Variant, string> = {
    primary: '#8B5CF6',
    send: '#7d4bfe',
    outline: '#8B5CF6',
    success: '#10B981',
};

const TEXT_COLORS: Record<Variant, string> = {
    primary: '#ffffff',
    send: '#ffffff',
    outline: '#8B5CF6',
    success: '#ffffff',
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
            activeOpacity={0.88}
            onPress={onPress}
            disabled={disabled || loading}
            style={[
                styles.pill,
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
                {/* inset top-white highlight */}
                <LinearGradient
                    colors={['rgba(255,255,255,0.30)', 'transparent']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                    style={StyleSheet.absoluteFill}
                    pointerEvents="none"
                />

                {loading ? (
                    <ActivityIndicator color={TEXT_COLORS[variant]} size="small" />
                ) : icon ? (
                    <IconSymbol name={icon} size={18} color={TEXT_COLORS[variant]} />
                ) : null}

                <Text style={[styles.label, { color: TEXT_COLORS[variant] }]}>
                    {label}
                </Text>
            </LinearGradient>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    pill: {
        width: '100%',
        height: 56,           // h-14
        borderRadius: 50,     // rounded-[50px]
        borderWidth: 1,
        overflow: 'hidden',
        // outer shadows
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 14,
        elevation: 4,
    },
    gradient: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingHorizontal: 28, // px-7
    },
    label: {
        fontSize: 16,           // text-base
        fontWeight: '500',      // font-medium
        fontFamily: 'Inter',
        textTransform: 'capitalize',
        letterSpacing: 0.1,
    },
});
