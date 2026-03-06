import { Platform } from "react-native";

// These mirror tailwind.config.js colors - edit there to change everywhere
export const lightColors = {
  primary: "#A78BFA",
  primaryForeground: "#ffffff",
  // Violet - action buttons (Deposit / Withdraw)
  violet: "#8B5CF6",
  violetLight: "#A78BFA",
  violetMuted: "#EDE9FE",
  violetForeground: "#ffffff",
  background: "#ffffff",
  backgroundSecondary: "#ebebf5",
  surface: "#ffffff",
  surfaceElevated: "#ffffff",
  text: "#111827",
  textSecondary: "#4b5563",
  textMuted: "#9ca3af",
  muted: "#e5e7eb",
  mutedForeground: "#6b7280",
  border: "#e2e2ee",
  success: "#22c55e",
  successForeground: "#ffffff",
  error: "#ef4444",
  errorForeground: "#ffffff",
  warning: "#f59e0b",
  warningForeground: "#ffffff",
} as const;

export const darkColors = {
  primary: "#A78BFA",
  primaryForeground: "#ffffff",
  // Violet - action buttons (Deposit / Withdraw)
 violet: "#8B5CF6",
  violetLight: "#A78BFA",
  violetMuted: "#4C1D95",
  violetForeground: "#ffffff",
  background: "#0D0D1A",
  backgroundSecondary: "#1a1a2e",
  surface: "#16163a",
  surfaceElevated: "#1f1f40",
  text: "#f9fafb",
  textSecondary: "#d1d5db",
  textMuted: "#9ca3af",
  muted: "#2a2a50",
  mutedForeground: "#9ca3af",
  border: "#2a2a50",
  success: "#22c55e",
  successForeground: "#ffffff",
  error: "#ef4444",
  errorForeground: "#ffffff",
  warning: "#f59e0b",
  warningForeground: "#ffffff",
} as const;

export const Colors = {
  light: lightColors,
  dark: darkColors,
} as const;

export type Colors = typeof lightColors;

export const Fonts = {
  regular:    'Poppins_400Regular',
  medium:     'Poppins_500Medium',
  semiBold:   'Poppins_600SemiBold',
  bold:       'Poppins_700Bold',
} as const;
