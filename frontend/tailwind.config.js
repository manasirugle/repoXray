/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        accent: "#c1440e",
        "accent-soft": "#fff7ed",
        "demo-bg": "#f6f1e7",
        "demo-panel": "#faf7f0",
        "demo-border": "#e5e5e5",
        "dim-1": "#737373",
        "dim-2": "#a3a3a3",
        emerald: { DEFAULT: "#059669", 50: "#ecfdf5" },
      },
      borderRadius: {
        "4xl": "2rem",
      },
      keyframes: {
        ping2: {
          "75%, 100%": { transform: "scale(2)", opacity: "0" },
        },
        fadeIn: {
          from: { opacity: "0", transform: "scale(0.95)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        fadeUp: {
          from: { opacity: "0", transform: "translateY(6px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        bounce3: {
          "0%, 80%, 100%": { transform: "scale(0)" },
          "40%": { transform: "scale(1)" },
        },
        crossFadeIn: {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        ping2: "ping2 1.4s cubic-bezier(0, 0, 0.2, 1) infinite",
        "fade-in": "fadeIn 0.35s ease forwards",
        "fade-up": "fadeUp 0.3s ease forwards",
        bounce3: "bounce3 1.4s infinite ease-in-out",
        "cross-fade": "crossFadeIn 0.25s ease forwards",
      },
    },
  },
  plugins: [],
};
