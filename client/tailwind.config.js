/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        beige: {
          50: '#FDFBF7',
          100: '#FAF6EE',
          200: '#F5ECE0',
          300: '#EBDCCE',
          400: '#DFC8B5',
          500: '#CFB19A',
          900: '#3D342C'
        },
        maroon: {
          50: '#FDF2F2',
          100: '#FDE8E8',
          600: '#A91B1B',
          700: '#8B1E1E',
          800: '#721717',
          900: '#5C1212'
        }
      }
    },
  },
  plugins: [],
}
