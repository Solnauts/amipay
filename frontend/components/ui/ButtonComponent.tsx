import React from "react";
import { TouchableOpacity, ActivityIndicator, StyleSheet, useColorScheme } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { ThemedText } from "./ThemedText";
import { IconSymbol } from "./icon-symbol";
import { Colors } from '@/constants/theme';
type Variant = "primary" | "violet" | "success" | "error";

type ButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ComponentProps<typeof IconSymbol>["name"];
  variant?: Variant;
};



/** Outline border color per variant */


export function ButtonComponent({
  label,
  onPress,
  disabled = false,
  loading = false,
  icon = "wallet.pass.fill",

}: ButtonProps) {
    const colorScheme = useColorScheme() ?? 'light';

 const colors = Colors[colorScheme];
  return (
    <TouchableOpacity
      activeOpacity={0.92}
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.actionBtn,
        { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border , opacity: disabled || loading ? 0.5 : 1 },
      ]}
    >
      <LinearGradient
         colors={['#A78BFA', '#8B5CF6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.gradient}
      >
        {loading ? (
          <ActivityIndicator color="#ffffff" size="small" />
        ) : (
          <IconSymbol name={icon} size={18} color="#ffffff" />
        )}
        <ThemedText style={styles.btnText}>{label}</ThemedText>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  /**
   * Outer touchable — carries the violet-500 outline border + triple shadow stack.
   * We can't put borderRadius on a LinearGradient child directly when overflow is
   * hidden, so we split: outline/shadow live here, gradient clips inside.
   */
  actionBtn: {
    flex: 1,
    borderRadius: 50,          // pill shape — matches rounded-[50px]
    borderWidth: 1,
    borderColor: '#8B5CF6',    // outline-violet-500 for depth
    // Bottom drop shadow (0px 1px 0px rgba(0,0,0,0.10))
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 14,          // 0px 4px 14px rgba(0,0,0,0.05)
    elevation: 5,
  },
  gradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
    borderRadius: 50,          // must match parent to clip gradient correctly
    // Inset top white highlight: simulate with a top border inside the gradient
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.50)',
    borderLeftColor:   'transparent',
    borderRightColor:  'transparent',
    borderBottomColor: 'transparent',
  },
  btnText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 15,
    fontFamily: 'System',      // matches font-['Inter'] on web
    letterSpacing: 0.2,
  },
});
