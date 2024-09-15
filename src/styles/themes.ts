// src/styles/themes.ts
import { lightThemeColors, darkThemeColors } from './colors';
import { typography } from './typography';

export const lightTheme = {
  colors: lightThemeColors,
  typography: typography,
};

export const darkTheme = {
  colors: darkThemeColors,
  typography: typography,
};

// Ensure both `lightThemeColors` and `darkThemeColors` have a `background` property defined.
