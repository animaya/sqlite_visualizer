/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Primary Colors
        primary: {
          DEFAULT: '#2563EB', // blue-600
          dark: '#1E40AF',    // blue-800
          light: '#DBEAFE',   // blue-100
        },
        // Semantic Colors
        success: {
          DEFAULT: '#10B981', // emerald-500
        },
        warning: {
          DEFAULT: '#F59E0B', // amber-500
        },
        error: {
          DEFAULT: '#EF4444', // red-500
        },
        info: {
          DEFAULT: '#0EA5E9', // sky-500
        },
        // Chart Colors
        chart: {
          1: '#2563EB', // blue-600
          2: '#D946EF', // fuchsia-500
          3: '#F59E0B', // amber-500
          4: '#10B981', // emerald-500
          5: '#6366F1', // indigo-500
          6: '#EF4444', // red-500
          7: '#8B5CF6', // violet-500
          8: '#EC4899', // pink-500
          9: '#06B6D4', // cyan-500
          10: '#84CC16', // lime-500
        }
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
      boxShadow: {
        'focus': '0 0 0 2px rgba(37, 99, 235, 0.5)', // Custom focus shadow for primary color
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms')
  ],
}
