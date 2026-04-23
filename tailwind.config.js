/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        text: {
          primary: {
            red: '#9B0000',
            black: '#000000',
            white: '#FFFFFF',
          },
          secondary: '#707070',
        },
        background: {
          white: '#FFFFFF',
          secondary: '#D9D9D9',
          overlay: 'rgba(0, 0, 0, 0.5)',
        },
        yellow: '#FFDD00',
        primary: '#9B0000',
      },
      spacing: {
        xs: '5px',
        sm: '10px',
        md: '16px',
        header: '64px',
      },
      fontFamily: {
        sans: ['BeVietnamPro_400Regular'],
        regular: ['BeVietnamPro_400Regular'],
        medium: ['BeVietnamPro_500Medium'],
        semibold: ['BeVietnamPro_600SemiBold'],
        bold: ['BeVietnamPro_700Bold'],
        extralight: ['BeVietnamPro_200ExtraLight'],
        light: ['BeVietnamPro_300Light'],
      },
      fontSize: {
        screenName: ['28px', { fontFamily: 'BeVietnamPro_600SemiBold' }],
        pageTitle: ['30px', { fontFamily: 'BeVietnamPro_600SemiBold' }],
        sectionTitle: ['24px', { fontFamily: 'BeVietnamPro_700Bold' }],
        mainContent: ['20px', { fontFamily: 'BeVietnamPro_400Regular' }],
        blogContent: ['16px', { fontFamily: 'BeVietnamPro_400Regular' }],
        shortDesc: ['18px', { fontFamily: 'BeVietnamPro_400Regular' }],
        note1: ['15px', { fontFamily: 'BeVietnamPro_400Regular' }],
        note: ['12px', { fontFamily: 'BeVietnamPro_400Regular' }],
        button: ['18px', { fontFamily: 'BeVietnamPro_500Medium' }],
        medium: ['18px', { fontFamily: 'BeVietnamPro_500Medium' }],
      },
      borderRadius: {
        sm: '4px',
        md: '8px',
        lg: '12px',
        xl: '16px',
        '2xl': '20px',
        input: '12px',
        'card-lg': '16px',
        'card-md': '12px',
        'card-sm': '10px',
        'card-xs': '6px',
        button: '12px',
      },
    },
  },
  plugins: [],
}
