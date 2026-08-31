/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        base: {
          bg: "#090D16",
          surface: "#0b0f19",
          raised: "#10151f",
        },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      keyframes: {
        "pulse-glow-amber": {
          "0%, 100%": { opacity: "1", boxShadow: "0 0 8px 2px rgba(251,191,36,0.5)" },
          "50%": { opacity: "0.55", boxShadow: "0 0 18px 6px rgba(251,191,36,0.9)" },
        },
        "pulse-glow-green": {
          "0%, 100%": { boxShadow: "0 0 6px 1px rgba(52,211,153,0.5)" },
          "50%": { boxShadow: "0 0 16px 4px rgba(52,211,153,0.85)" },
        },
        "slide-in-right": {
          from: { transform: "translateX(100%)", opacity: "0" },
          to: { transform: "translateX(0)", opacity: "1" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
      },
      animation: {
        "glow-amber": "pulse-glow-amber 1.8s ease-in-out infinite",
        "glow-green": "pulse-glow-green 2.6s ease-in-out infinite",
        "drawer-in": "slide-in-right 0.25s ease-out",
        "fade-in": "fade-in 0.15s ease-out",
      },
    },
  },
  plugins: [],
};
