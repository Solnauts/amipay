module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}"
  ],
  presets: [require("nativewind/preset")],
  darkMode: "media",
  theme: {
    extend: {
      colors: {
        // CHANGE COLORS HERE - edit one place, updates everywhere
        primary: {
          DEFAULT: "#22c55e",
          foreground: "#ffffff",
        },
        // Violet/purple — used for action buttons (Deposit / Withdraw)
        violet: {
          DEFAULT: "#7C3AED",
          light: "#9333EA",
          muted: "#EDE9FE",
          "muted-dark": "#4C1D95",
          foreground: "#ffffff",
        },
        background: {
          DEFAULT: "#ffffff",
          dark: "#0D0D1A",
          secondary: "#ebebf5",
          "secondary-dark": "#1a1a2e",
        },
        surface: {
          DEFAULT: "#ffffff",
          dark: "#16163a",
          elevated: "#ffffff",
          "elevated-dark": "#1f1f40",
        },
        text: {
          DEFAULT: "#111827",
          dark: "#f9fafb",
          secondary: "#4b5563",
          "secondary-dark": "#d1d5db",
          muted: "#9ca3af",
          "muted-dark": "#9ca3af",
        },
        muted: {
          DEFAULT: "#e5e7eb",
          dark: "#2a2a50",
          foreground: "#6b7280",
          "foreground-dark": "#9ca3af",
        },
        border: {
          DEFAULT: "#e2e2ee",
          dark: "#2a2a50",
        },
        success: {
          DEFAULT: "#22c55e",
          foreground: "#ffffff",
        },
        error: {
          DEFAULT: "#ef4444",
          foreground: "#ffffff",
        },
        warning: {
          DEFAULT: "#f59e0b",
          foreground: "#ffffff",
        },
      },
    },
  },
  plugins: [],
};
