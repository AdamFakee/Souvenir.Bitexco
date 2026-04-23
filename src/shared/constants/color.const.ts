export const COLORS = {
  text: {
    primary: {
      red: '#9B0000',
      black: '#000000',
      white: '#FFFFFF',
    },
    secondary: '#707070',
  },
  background: {
    headerGradient: {
      start: '#FFD848',
      end: '#FDAC41',
    },
    primaryGradient: {
      start: '#FFE149',
      end: '#F72B2B',
    },
    white: '#FFFFFF',
    secondary: '#D9D9D9',
    overlay: 'rgba(0, 0, 0, 0.5)',
  },
  yellow: '#FFDD00',
  primary: '#9B0000',
} as const

export const SHADOW = {
  bottom: {
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5, // for android
  },
  up: {
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: -8,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 20,
  },
} as const
