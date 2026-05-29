/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // --- Retained template surface theme tokens ---
        surface: {
          50: '#ffffff',
          100: '#fcf8ff',
          200: '#f5f2ff',
          300: '#f0ecf9',
          400: '#eae6f4',
          500: '#e4e1ee',
          600: '#dcd8e5',
          DEFAULT: '#fcf8ff',
          on: '#1b1b24',
          'on-variant': '#464555',
          inverse: '#302f39',
          'inverse-on': '#f3effc',
          tint: '#4d44e3',
          variant: '#e4e1ee',
        },

        // --- Figma Brand Slate/Steel Blue Theme ---
        primary: {
          DEFAULT: '#1c4e68', // Brand Primary (Slate Blue)
          light: '#7596a8', // Toggle/Switch light brand accent
          dark: '#496c7e', // Primary Button dark brand accent
          deep: '#47697b', // Deep components brand accent
          on: '#ffffff',
          container: '#496c7e',
          'on-container': '#ffffff',
          inverse: '#7596a8',
          fixed: '#ecf1f4',
          'fixed-dim': '#7596a8',
          'on-fixed': '#16192c',
          'on-fixed-variant': '#47697b',
        },
        secondary: {
          DEFAULT: '#5b5b5c', // Neutral Secondary Muted
          on: '#ffffff',
          container: '#f2f3f5', // Disabled / secondary pill fill
          'on-container': '#0f0f0f',
          fixed: '#f2f3f5',
          'fixed-dim': '#dfe0e1',
          'on-fixed': '#0f0f0f',
          'on-fixed-variant': '#5b5b5c',
        },
        tertiary: {
          DEFAULT: '#7e3000',
          on: '#ffffff',
          container: '#a44100',
          'on-container': '#ffd2be',
          fixed: '#ffdbcc',
          'fixed-dim': '#ffb695',
          'on-fixed': '#351000',
          'on-fixed-variant': '#7b2f00',
        },
        error: {
          DEFAULT: '#dd2027', // Crimson Red (Figma "Hết hàng")
          light: '#f73131', // Figma Asterisk / error action red
          on: '#ffffff',
          container: '#fef3f2', // Light negative background
          'on-container': '#dd2027',
        },
        success: {
          DEFAULT: '#00944a', // Emerald Green Price Tag
          dark: '#007d55', // Active option border green
          on: '#ffffff',
          container: '#ecf1f4', // Selection fill green
          'on-container': '#007d55',
        },
        warning: {
          DEFAULT: '#fb6514', // Orange stock warning tag
          on: '#ffffff',
          container: '#fff4f2',
          'on-container': '#fb6514',
        },
        info: {
          DEFAULT: '#2f6bff', // Blue info tag ("Tồn 129 sp")
          on: '#ffffff',
          container: '#dbeafe',
          'on-container': '#1e3a8a',
        },
        outline: {
          DEFAULT: '#dfe0e1', // Input field outlines / Default border
          variant: '#e9eaeb', // Divider line / border variant
          light: '#d9d9db',
        },

        // --- Extracted Neutral Palette ---
        neutral: {
          900: '#0f0f0f', // Text Primary Dark
          800: '#16192c', // Label text dark
          700: '#282829', // Text Secondary options
          600: '#334155', // Slate text
          500: '#5b5b5c', // Muted slate gray
          400: '#747475', // Inactive tabs gray
          300: '#8d8e8f', // Placeholder text
          200: '#dfe0e1', // Border Default
          100: '#e9eaeb', // Divider Line
          50: '#f9fafb', // Content Card background
        },

        background: {
          DEFAULT: '#f5f8f9', // Application Main Backdrop
          on: '#0f0f0f',
        },
        muted: '#6b7280', // Gray supporting text
      },
      spacing: {
        none: '0px',
        xs: '4px',
        sm: '8px',
        md: '16px',
        lg: '24px',
        xl: '32px',
        '2xl': '48px',
        sidebar_width: '280px',
        cart_panel_width: '400px',
      },
      fontFamily: {
        sans: ['Manrope-Regular', 'system-ui'],
        manrope: ['Manrope-Regular'],
        'manrope-medium': ['Manrope-Medium'],
        'manrope-semibold': ['Manrope-SemiBold'],
        'manrope-bold': ['Manrope-Bold'],
        'manrope-extrabold': ['Manrope-ExtraBold'],
        inter: ['Inter'],
      },
      fontSize: {
        // --- Backwards compatible template mapping ---
        'display-lg': ['32px', { lineHeight: '45px', fontWeight: '700' }],
        'headline-md': ['24px', { lineHeight: '34px', fontWeight: '700' }],
        'title-sm': ['18px', { lineHeight: '25px', fontWeight: '700' }],
        'body-base': ['16px', { lineHeight: '24px', fontWeight: '400' }],
        'body-sm': ['14px', { lineHeight: '20px', fontWeight: '400' }],
        'label-caps': ['12px', { lineHeight: '17px', fontWeight: '700' }],
        'numeral-lg': ['28px', { lineHeight: '32px', fontWeight: '600' }],

        // --- Extracted Figma Design Tokens ---
        'display-xl': ['32px', { lineHeight: '45px', fontWeight: '700' }], // Display Totals
        'title-xl': ['20px', { lineHeight: '28px', fontWeight: '700' }], // Action buttons / headers
        'title-lg': ['18px', { lineHeight: '25px', fontWeight: '700' }], // Product Card Titles
        'body-lg': ['16px', { lineHeight: '24px', fontWeight: '600' }], // Active tab / SemiBold content
        'body-md': ['14px', { lineHeight: '20px', fontWeight: '400' }], // Secondary helper / normal labels
        'body-xs': ['12px', { lineHeight: '18px', fontWeight: '400' }], // Captions / Small text
      },
      borderRadius: {
        xs: '5px', // Option frames specific
        sm: '8px', // Small buttons
        md: '10px', // Active action cards / inputs
        lg: '12px', // Layout components
        xl: '14px', // Payment Option panels
        '2xl': '16px', // Product cards / dialog panels
        '3xl': '24px', // Large panels
        full: '9999px',
      },
      boxShadow: {
        sm: '0 1px 2px 0 rgba(15, 23, 42, 0.08)',
        DEFAULT: '0 4px 6px -1px rgba(15, 23, 42, 0.08), 0 2px 4px -2px rgba(15, 23, 42, 0.08)',
        lg: '0 10px 15px -3px rgba(15, 23, 42, 0.08), 0 4px 6px -4px rgba(15, 23, 42, 0.08)',
      },
    },
  },
  plugins: [],
}
