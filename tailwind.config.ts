import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        parchment: {
          50: "#FDFAF6",
          100: "#F7F3EC",
          200: "#EDE7DB",
          300: "#DDD5C5",
        },
        ink: {
          900: "#1A1714",
          700: "#3D3830",
          500: "#6B6358",
          300: "#A89E93",
          100: "#D4CEC6",
        },
        sienna: {
          DEFAULT: "#C4846A",
          dark: "#A5694F",
          light: "#E0B09A",
        },
      },
      fontFamily: {
        serif: ["var(--font-playfair)", "Georgia", "serif"],
        sans: ["var(--font-lato)", "system-ui", "sans-serif"],
      },
      letterSpacing: {
        widest: "0.2em",
      },
      animation: {
        "fade-up": "fadeUp 0.45s ease-out both",
      },
      keyframes: {
        fadeUp: {
          "0%":   { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
