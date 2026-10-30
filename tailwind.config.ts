import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        surface: "rgb(var(--c-surface) / <alpha-value>)",
        "surface-low": "rgb(var(--c-surface-low) / <alpha-value>)",
        "surface-container": "rgb(var(--c-surface-container) / <alpha-value>)",
        "surface-high": "rgb(var(--c-surface-high) / <alpha-value>)",
        card: "rgb(var(--c-card) / <alpha-value>)",
        ink: "rgb(var(--c-ink) / <alpha-value>)",
        muted: "rgb(var(--c-muted) / <alpha-value>)",
        line: "rgb(var(--c-line) / <alpha-value>)",
        primary: { DEFAULT: "#2563eb", dark: "#1d4ed8", soft: "rgb(var(--c-primary-soft) / <alpha-value>)" },
        violet: { DEFAULT: "#7c3aed", dark: "#6d28d9", soft: "rgb(var(--c-violet-soft) / <alpha-value>)" },
        teal: { DEFAULT: "#0d9488", soft: "rgb(var(--c-teal-soft) / <alpha-value>)" },
        danger: { DEFAULT: "#ba1a1a", soft: "rgb(var(--c-danger-soft) / <alpha-value>)" },
        warn: { DEFAULT: "#d97706", soft: "rgb(var(--c-warn-soft) / <alpha-value>)" },
      },
      fontFamily: {
        display: ["var(--font-jakarta)", "system-ui", "sans-serif"],
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 3px rgba(15,23,42,0.04), 0 1px 2px rgba(15,23,42,0.02)",
        pop: "0 10px 15px -3px rgba(15,23,42,0.08), 0 4px 6px -4px rgba(15,23,42,0.04)",
      },
    },
  },
  plugins: [],
};
export default config;
