export const COLORS = {
  surface: {
    50: '#ffffff',
    100: '#fcf8ff',
    200: '#f5f2ff',
    300: '#f0ecf9',
    400: '#eae6f4',
    500: '#e4e1ee',
    600: '#dcd8e5',
    default: '#fcf8ff',
    on: '#1b1b24',
    onVariant: '#464555',
    inverse: '#302f39',
    inverseOn: '#f3effc',
    tint: '#4d44e3',
    variant: '#e4e1ee',
  },
  primary: {
    default: '#537b90', // Brand Primary (Slate Blue)
    light: '#7596a8', // Toggle/Switch light brand accent
    dark: '#496c7e', // Primary Button dark brand accent
    deep: '#47697b', // Deep components brand accent
    on: '#ffffff',
    container: '#496c7e',
    onContainer: '#ffffff',
    inverse: '#7596a8',
    fixed: '#ecf1f4',
    fixedDim: '#7596a8',
    onFixed: '#16192c',
    onFixedVariant: '#47697b',
  },
  secondary: {
    default: '#5b5b5c', // Neutral Secondary Muted
    on: '#ffffff',
    container: '#f2f3f5', // Disabled / secondary pill fill
    onContainer: '#0f0f0f',
    fixed: '#f2f3f5',
    fixedDim: '#dfe0e1',
    onFixed: '#0f0f0f',
    onFixedVariant: '#5b5b5c',
  },
  tertiary: {
    default: '#7e3000',
    on: '#ffffff',
    container: '#a44100',
    onContainer: '#ffd2be',
    fixed: '#ffdbcc',
    fixedDim: '#ffb695',
    onFixed: '#351000',
    onFixedVariant: '#7b2f00',
  },
  error: {
    default: '#dd2027', // Crimson Red (Figma "Hết hàng")
    light: '#f73131', // Figma Asterisk / error action red
    on: '#ffffff',
    container: '#fef3f2', // Light negative background
    onContainer: '#dd2027',
  },
  success: {
    default: '#00944a', // Emerald Green Price Tag
    dark: '#007d55', // Active option border green
    on: '#ffffff',
    container: '#ecf1f4', // Selection fill green
    onContainer: '#007d55',
  },
  warning: {
    default: '#fb6514', // Orange stock warning tag
    on: '#ffffff',
    container: '#fff4f2',
    onContainer: '#fb6514',
  },
  info: {
    default: '#2f6bff', // Blue info tag ("Tồn 129 sp")
    on: '#ffffff',
    container: '#dbeafe',
    onContainer: '#1e3a8a',
  },
  outline: {
    default: '#dfe0e1', // Input field outlines / Default border
    variant: '#e9eaeb', // Divider line / border variant
    light: '#d9d9db',
  },
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
    default: '#f5f8f9', // Application Main Backdrop
    on: '#0f0f0f',
  },
  muted: '#6b7280', // Gray supporting text
} as const

export const SHADOW = {
  sm: {
    shadowColor: 'rgba(15, 23, 42, 0.08)',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 1,
    shadowRadius: 2,
    elevation: 2,
  },
  default: {
    shadowColor: 'rgba(15, 23, 42, 0.08)',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 4,
  },
  lg: {
    shadowColor: 'rgba(15, 23, 42, 0.08)',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 1,
    shadowRadius: 15,
    elevation: 10,
  },
} as const
