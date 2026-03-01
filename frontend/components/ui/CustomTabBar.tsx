import React from 'react';
import {
  TouchableOpacity,
  StyleSheet,
  useColorScheme,
  Platform,
  View,
} from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Colors } from '@/constants/theme';
import * as Haptics from 'expo-haptics';
import { ThemedView } from './ThemedView';
import { ThemedText } from './ThemedText';

// ---------------------------------------------------------------------------
// Icon resolver — add new routes here
// ---------------------------------------------------------------------------
function TabIcon({
  routeName,
  color,
  size,
}: {
  routeName: string;
  color: string;
  size: number;
}) {
  switch (routeName) {
    case 'index':
      return <MaterialIcons name="home" size={size} color={color} />;
    case 'activities':
      return <MaterialCommunityIcons name="layers-outline" size={size} color={color} />;
    case 'cards':
      return <MaterialIcons name="credit-card" size={size} color={color} />;
    case 'rewards':
      return <MaterialCommunityIcons name="diamond-outline" size={size} color={color} />;
    default:
      return <MaterialIcons name="home" size={size} color={color} />;
  }
}

// ---------------------------------------------------------------------------
// CustomTabBar
// ---------------------------------------------------------------------------
export default function CustomTabBar({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme]; // ← single source of truth from theme.ts

  // All semantic colors from theme — change theme.ts to update everywhere
  const iconActive   = colors.primary;         // green active icon/dot
  const iconInactive = colors.mutedForeground; // muted gray for inactive
  const gradientFrom = colors.primary;         // Pay button gradient start
  const gradientTo   = colors.success;         // Pay button gradient end

  const handlePress = (routeName: string, routeKey: string, isFocused: boolean) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    const event = navigation.emit({
      type: 'tabPress',
      target: routeKey,
      canPreventDefault: true,
    });
    if (!isFocused && !event.defaultPrevented) {
      navigation.navigate(routeName);
    }
  };

  return (
    // ThemedView variant="default" → colors.background (light: #fff / dark: #111827)
    <ThemedView
      variant="default"
      className="flex-row items-center px-2"
      style={[
        styles.container,
        { borderTopColor: colors.border },
      ]}
    >
      {/* ── Tab Buttons ── */}
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;

        return (
          <TouchableOpacity
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            onPress={() => handlePress(route.name, route.key, isFocused)}
            className="flex-1 items-center justify-center"
            activeOpacity={0.7}
          >
            {/* ThemedView variant="default" so bg is transparent within the bar */}
            <ThemedView
              variant="default"
              className="items-center justify-center gap-1"
            >
              <TabIcon
                routeName={route.name}
                color={isFocused ? iconActive : iconInactive}
                size={24}
              />
              {/* Active indicator dot — uses theme primary color */}
              {isFocused && (
                <View
                  className="w-1 h-1 rounded-full mt-0.5"
                  style={{ backgroundColor: iconActive }}
                />
              )}
            </ThemedView>
          </TouchableOpacity>
        );
      })}

      {/* ── Pay (CTA) Button ── */}
      {/* ThemedView variant="default" keeps bg consistent with the bar */}
      <ThemedView variant="default" className="pl-2 pr-1">
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => {
            if (Platform.OS !== 'web') {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            }
          }}
          style={styles.payTouchable}
        >
          {/* Gradient colors come from theme primary / success tokens */}
          <LinearGradient
            colors={[gradientFrom, gradientTo]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.payGradient}
          >
            <MaterialIcons
              name="star"
              size={15}
              color={colors.primaryForeground}
            />
            {/* ThemedText with style override — text lives on a colored gradient */}
            <ThemedText
              type="defaultSemiBold"
              style={[styles.payText, { color: colors.primaryForeground }]}
            >
              Pay
            </ThemedText>
          </LinearGradient>
        </TouchableOpacity>
      </ThemedView>
    </ThemedView>
  );
}

// ---------------------------------------------------------------------------
// StyleSheet — only for things NativeWind can't express in React Native:
//   • Platform-specific height / paddingBottom
//   • Box shadows (iOS shadowXxx + Android elevation)
//   • borderTopWidth
//   • LinearGradient child-style (not a View, NativeWind can't target it)
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  container: {
    borderTopWidth: 1,
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
    paddingTop: 10,
    height: Platform.OS === 'ios' ? 82 : 66,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 12,
  },
  payTouchable: {
    borderRadius: 24,
    overflow: 'hidden',
  },
  payGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 24,
    gap: 6,
  },
  payText: {
    fontSize: 15,
    letterSpacing: 0.3,
  },
});
