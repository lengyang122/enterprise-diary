/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', '"Noto Sans SC"', 'Roboto', 'sans-serif'],
      },
      colors: {
        notion: {
          bg: '#f7f6f3',
          sidebar: '#f7f6f3',
          card: '#ffffff',
          text: '#37352f',
          'text-secondary': '#9b9a97',
          border: '#e9e9e7',
          accent: '#2383e2',
          hover: '#efefef',
        }
      }
    },
  },
  plugins: [],
}
