/**
 * TokenIcon — registry-based token icon component.
 *
 * Usage:
 *   <TokenIcon symbol="USDC" size={56} />
 *   <TokenIcon symbol="SOL"  size={40} />
 *
 * For unknown symbols, renders a letter fallback circle.
 * Adding a new token = one line in REGISTRY.
 */

import React from 'react';
import { View } from 'react-native';
import { USDCIcon } from './USDCIcon';
import { SOLIcon } from './SOLIcon';
import { SeekerIcon } from './SeekerIcon';
import { ThemedText } from '@/components/ui/ThemedText';

type IconComponent = React.ComponentType<{ size?: number }>;

const REGISTRY: Record<string, IconComponent> = {
    USDC: USDCIcon,
    SOL: SOLIcon,
    SEEKER: SeekerIcon,
};

type Props = {
    symbol: string;
    size?: number;
};

export function TokenIcon({ symbol, size = 56 }: Props) {
    const Icon = REGISTRY[symbol.toUpperCase()];

    if (Icon) {
        return <Icon size={size} />;
    }

    // Fallback: grey circle with first letter
    return (
        <View
            style={{
                width: size,
                height: size,
                borderRadius: size / 2,
                backgroundColor: '#6B7280',
                alignItems: 'center',
                justifyContent: 'center',
            }}
        >
            <ThemedText
                style={{ color: '#fff', fontWeight: '700', fontSize: size * 0.32 }}
            >
                {symbol[0]?.toUpperCase() ?? '?'}
            </ThemedText>
        </View>
    );
}
