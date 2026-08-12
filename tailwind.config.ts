import type { Config } from "tailwindcss";

const config: Config = {
  // lib/ is scanned too: the branch registry in lib/mt/branches.ts carries the
  // badge/dot classes, and they get purged if Tailwind can't see them.
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f7f6f1",
          100: "#e5f8e9",
          200: "#d8e7dc",
          300: "#c7d5c9",
          400: "#b7c2b5",
          500: "#8ba088",
          600: "#5c7a5f",
          700: "#2c5138",
          800: "#173224",
          900: "#132c1e",
          950: "#0c0c21",
        },
        gold: {
          400: "#cfa96a",
          500: "#b8935a",
          600: "#9c7a47",
        },
      },
      fontFamily: {
        display: ["var(--font-sans)", "sans-serif"],
        sans: ["var(--font-sans)", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
