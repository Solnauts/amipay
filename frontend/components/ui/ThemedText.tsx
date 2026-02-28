import { useColorScheme, Text, TextProps } from "react-native";
import { Colors } from "@/constants/theme";

interface ThemedTextProps extends TextProps {
  variant?: "default" | "secondary" | "muted";
  type?: "default" | "title" | "subtitle" | "defaultSemiBold";
}

export function ThemedText({ className, variant = "default", type = "default", style, ...props }: ThemedTextProps) {
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];

  const variantColors: Record<string, string> = {
    default: colors.text,
    secondary: colors.textSecondary,
    muted: colors.textMuted,
  };

  const typeStyles: Record<string, object> = {
    default: {},
    title: { fontSize: 28, fontWeight: "bold" },
    subtitle: { fontSize: 20, fontWeight: "600" },
    defaultSemiBold: { fontWeight: "600" },
  };

  return (
    <Text
      className={`${className || ""}`}
      style={[{ color: variantColors[variant], ...typeStyles[type] }, style as object]}
      {...props}
    />
  );
}
