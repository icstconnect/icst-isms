/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#2563EB", // Trust Blue
          dark: "#1D4ED8",
          light: "#EFF6FF",
        },
        secondary: {
          DEFAULT: "#3B82F6", // Accent Blue
          dark: "#2563EB",
          light: "#F0F9FF",
        },
        accent: {
          DEFAULT: "#F97316", // CTA Orange
          dark: "#EA580C",
        },
        background: {
          DEFAULT: "#F8FAFC", // Light gray
          paper: "#FFFFFF",
        },
        text: {
          primary: "#0F172A", // Slate 900
          secondary: "#475569", // Slate 600
          muted: "#94A3B8", // Slate 400
        }
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
        mono: ["Fira Code", "monospace"],
      },
    },
  },
  plugins: [],
}
