/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#2563eb",
          muted: "#1d4ed8",
        },
        surface: "#0f172a",
        card: "#111827",
        border: "#1f2937",
        accent: {
          green: "#22c55e",
          amber: "#f59e0b",
          red: "#ef4444",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Manrope", "ui-sans-serif", "system-ui"],
      },
    },
  },
  plugins: [require("@tailwindcss/forms")],
};
