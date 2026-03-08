import { useColorScheme } from 'react-native';
import { Colors } from '@/constants/theme';

/**
 * Shared hook — returns the current theme color palette.
 * Replaces the repeated pattern:
 *   const colorScheme = useColorScheme() ?? 'light';
 *   const colors = Colors[colorScheme];
 */
export function useColors() {
    const colorScheme = useColorScheme() ?? 'light';
    return Colors[colorScheme];
}
