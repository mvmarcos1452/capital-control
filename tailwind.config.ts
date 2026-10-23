import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#051424",
        "on-background": "#d4e4fa",
        surface: "#051424",
        "surface-dim": "#051424",
        "surface-bright": "#2c3a4c",
        "surface-container-lowest": "#010f1f",
        "surface-container-low": "#0d1c2d",
        "surface-container": "#122131",
        "surface-container-high": "#1c2b3c",
        "surface-container-highest": "#273647",
        "on-surface": "#d4e4fa",
        "on-surface-variant": "#bbcabf",
        outline: "#86948a",
        "outline-variant": "#3c4a42",
        primary: "#4edea3",
        "primary-container": "#10b981",
        "on-primary": "#003824",
        "on-primary-container": "#00422b",
        secondary: "#4cd7f6",
        "secondary-container": "#03b5d3",
        "on-secondary": "#003640",
        tertiary: "#d0bcff",
        "tertiary-container": "#b090ff",
        error: "#f43f5e",
        "error-container": "#93000a",
        "on-error": "#690005",
      },
      fontFamily: {
        heading: ["Space Grotesk", "sans-serif"],
        body: ["Manrope", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      borderRadius: {
        DEFAULT: "0.25rem",
        md: "0.5rem",
        lg: "0.75rem",
        xl: "1rem",
        "2xl": "1.5rem",
        full: "9999px",
      },
      boxShadow: {
        glass: "0 8px 32px 0 rgba(0, 0, 0, 0.37)",
        "glass-hover": "0 12px 40px 0 rgba(0, 0, 0, 0.45), 0 0 20px 0 rgba(16, 185, 129, 0.12)",
        "glass-modal": "0 24px 64px -12px rgba(0, 0, 0, 0.75)",
        emerald: "0 0 20px rgba(16, 185, 129, 0.35)",
      },
    },
  },
  plugins: [],
};

export default config;
