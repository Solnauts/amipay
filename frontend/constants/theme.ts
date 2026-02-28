import { Platform } from "react-native";

// These mirror tailwind.config.js colors - edit there to change everywhere
export const lightColors = {
  primary: "#22c55e",
  primaryForeground: "#ffffff",
  background: "#ffffff",
  backgroundSecondary: "#f0fdf4",
  surface: "#f8fafc",
  surfaceElevated: "#ffffff",
  text: "#111827",
  textSecondary: "#4b5563",
  textMuted: "#9ca3af",
  muted: "#e5e7eb",
  mutedForeground: "#6b7280",
  border: "#e5e7eb",
  success: "#22c55e",
  successForeground: "#ffffff",
  error: "#ef4444",
  errorForeground: "#ffffff",
  warning: "#f59e0b",
  warningForeground: "#ffffff",
} as const;

export const darkColors = {
  primary: "#22c55e",
  primaryForeground: "#ffffff",
  background: "#111827",
  backgroundSecondary: "#1f2937",
  surface: "#1f2937",
  surfaceElevated: "#374151",
  text: "#f9fafb",
  textSecondary: "#d1d5db",
  textMuted: "#9ca3af",
  muted: "#374151",
  mutedForeground: "#9ca3af",
  border: "#374151",
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

export const Fonts = Platform.select({
  ios: {
    sans: "system-ui",
    serif: "ui-serif",
    rounded: "ui-rounded",
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
