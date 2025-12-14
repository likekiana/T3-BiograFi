/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'gold-brown': '#d9b98f',
        'ink-black': '#0d0d0d',
        'neon-blue': '#5f8cff',
        'purple-light': '#ab6eff',
      },
    },
  },
  plugins: [],
}