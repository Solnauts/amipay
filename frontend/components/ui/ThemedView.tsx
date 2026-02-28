import { useColorScheme, View, ViewProps, StyleSheet } from "react-native";
import { Colors } from "@/constants/theme";

interface ThemedViewProps extends ViewProps {
  variant?: "default" | "secondary" | "surface" | "elevated";
}

export function ThemedView({ className, variant = "default", style, ...props }: ThemedViewProps) {
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];

  const variantBackgrounds: Record<string, string> = {
    default: colors.background,
    secondary: colors.backgroundSecondary,
    surface: colors.surface,
    elevated: colors.surfaceElevated,
  };

  return (
    <View
      className={`${className || ""}`}
      style={[{ backgroundColor: variantBackgrounds[variant] }, style as object]}
      {...props}
    />
  );
}
