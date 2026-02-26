module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}"
  ],
  presets: [require("nativewind/preset")],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // CHANGE COLORS HERE - edit one place, updates everywhere
        primary: {
          DEFAULT: "#22c55e",
          foreground: "#ffffff",
        },
        background: {
          DEFAULT: "#ffffff",
          dark: "#111827",
          secondary: "#f0fdf4",
          "secondary-dark": "#1f2937",
        },
        surface: {
          DEFAULT: "#f8fafc",
          dark: "#1f2937",
          elevated: "#ffffff",
          "elevated-dark": "#374151",
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
          dark: "#374151",
          foreground: "#6b7280",
          "foreground-dark": "#9ca3af",
        },
        border: {
          DEFAULT: "#e5e7eb",
          dark: "#374151",
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
