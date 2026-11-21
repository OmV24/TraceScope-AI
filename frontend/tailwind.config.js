/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        soc: {
          canvas: "#06080F",
          surface: "#0B101D",
          card: "#0F1626",
          border: "#1E293B",
          accent: "#00D2FF",
          crimson: "#FF2E55",
          amber: "#F59E0B",
          purple: "#A855F7",
          emerald: "#00F5A0"
        }
      }
    },
  },
  plugins: [],
}
