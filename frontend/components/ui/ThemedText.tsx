import { useColorScheme, Text, TextProps, TextStyle, StyleProp } from "react-native";
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

  const typeStyles: Record<string, TextStyle> = {
    default: { fontFamily: 'Poppins_400Regular' },
    title: { fontSize: 28, fontWeight: "bold", fontFamily: 'Poppins_700Bold' },
    subtitle: { fontSize: 20, fontWeight: "600", fontFamily: 'Poppins_600SemiBold' },
    defaultSemiBold: { fontWeight: "600", fontFamily: 'Poppins_600SemiBold' },
  };

  return (
    <Text
      className={`${className || ""}`}
      style={[{ color: variantColors[variant], ...typeStyles[type] } as TextStyle, style as StyleProp<TextStyle>]}
      {...props}
    />
  );
}
