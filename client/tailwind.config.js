/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        noir: {
          darkest: '#0a0a0a',
          darker: '#1a1a1a',
          dark: '#2a2a2a',
          medium: '#3a3a3a',
          light: '#4a4a4a',
          accent: '#d4af37', // Gold
          amber: '#ffbf00',
          blood: '#8b0000',
        },
      },
      fontFamily: {
        detective: ['"Courier New"', 'monospace'],
        noir: ['"Playfair Display"', 'serif'],
      },
      animation: {
        'typewriter': 'typewriter 2s steps(40) 1s 1 normal both',
        'blink': 'blink 1s infinite',
        'fade-in': 'fadeIn 1s ease-in',
        'slide-up': 'slideUp 0.5s ease-out',
      },
      keyframes: {
        typewriter: {
          'from': { width: '0' },
          'to': { width: '100%' },
        },
        blink: {
          '50%': { opacity: '0' },
        },
        fadeIn: {
          'from': { opacity: '0' },
          'to': { opacity: '1' },
        },
        slideUp: {
          'from': { transform: 'translateY(20px)', opacity: '0' },
          'to': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
