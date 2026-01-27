/**
 * Global Theme Colors and Styles
 * 
 * This file contains all color constants and theme values used throughout the app.
 * Update colors here to change the app's appearance globally.
 */

export const Colors = {
  // Primary Colors
  primary: '#007AFF',
  primaryDark: '#0051D5',
  primaryLight: '#5AC8FA',
  
  // Shuffle Colors
  shuffleActive: '#4CD964', // Vibrant green when shuffle is active (more visible)
  shuffleActiveBorder: '#2E7D32', // Dark green for prominent border accent
  shuffleInactive: '#E5E5EA', // Grey when shuffle is inactive
  shuffleInactiveBorder: 'transparent', // No border when inactive
  
  // Success/Green Colors
  success: '#34C759',
  successDark: '#2FB04A',
  successLight: '#6FD96F',
  
  // Background Colors
  background: '#f8f9fa',
  backgroundSecondary: '#ffffff',
  backgroundTertiary: '#f0f0f0',
  
  // Text Colors
  textPrimary: '#333333',
  textSecondary: '#666666',
  textTertiary: '#999999',
  textInactive: '#8E8E93',
  textWhite: '#ffffff',
  
  // Border Colors
  borderLight: '#E5E5EA',
  borderMedium: '#D1D1D6',
  borderDark: '#C7C7CC',
  
  // Shadow Colors
  shadowColor: '#000000',
  shadowColorPrimary: '#007AFF',
  shadowColorSuccess: '#34C759',
  shadowColorShuffle: '#6FD96F',
  
  // Accent Colors
  accent: '#007AFF',
  accentBlue: '#007AFF',
  accentGreen: '#34C759',
  
  // Status Colors
  error: '#FF3B30',
  warning: '#FF9500',
  info: '#007AFF',
} as const;

export const Shadows = {
  small: {
    shadowColor: Colors.shadowColor,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  medium: {
    shadowColor: Colors.shadowColor,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  large: {
    shadowColor: Colors.shadowColor,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  primary: {
    shadowColor: Colors.shadowColorPrimary,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  shuffle: {
    shadowColor: Colors.shadowColorShuffle,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 6,
  },
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const BorderRadius = {
  small: 8,
  medium: 12,
  large: 16,
  xl: 20,
  full: 9999,
} as const;

export const Typography = {
  sizes: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 28,
    '4xl': 32,
  },
  weights: {
    normal: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
} as const;

// Export theme object for easy access
export const Theme = {
  colors: Colors,
  shadows: Shadows,
  spacing: Spacing,
  borderRadius: BorderRadius,
  typography: Typography,
} as const;
