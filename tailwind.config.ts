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
        // 500/600 darkened from the original #b8935a/#9c7a47 — those failed
        // WCAG AA (white-on-500 buttons were ~2.85:1, 600-on-white text was
        // ~3.97:1, both need 4.5:1). 500 now clears 5.26:1 with white, 600
        // clears 7.8:1 with white — same gold family, readable at both uses
        // this token covers (solid button fill, and link/accent text on
        // white). 400 stays — it's only ever used on dark panels/borders.
        gold: {
          400: "#cfa96a",
          500: "#8a6534",
          600: "#6b4c29",
        },
        // Tailwind's stock gray-400/slate-400 (~2.5:1 on white) are used
        // almost entirely as text color across the app (timestamps, helper
        // text, muted labels — 269 instances) and fail WCAG AA's 4.5:1 for
        // body text. Overriding just the 400 shade to Tailwind's own
        // gray-500/slate-500 values fixes every one of those in place
        // without touching any other shade (200/300 borders, 50/100
        // backgrounds, 500+ elsewhere are untouched).
        gray: {
          400: "#6b7280",
        },
        slate: {
          400: "#64748b",
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
