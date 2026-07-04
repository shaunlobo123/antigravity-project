import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LayoutAnimation, Platform, UIManager } from 'react-native';

// Enable LayoutAnimation on Android
if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const ThemeContext = createContext();

// ... existing code ...
export const themeColors = {
  light: {
    bg: '#fcfaf2',
    card: '#fffdf9',
    cardInner: '#ffffff',
    cardBorder: '#ebd5b0',
    border: '#e8dec9',
    borderLight: '#f3eade',
    borderMuted: '#dcd0bc',
    divider: '#f0e6d2',
    text: '#2d221a',
    textMedium: '#3b2f27',
    textMuted: '#8a7767',
    textSection: '#b59370',
    accent: '#d97706',
    accentDark: '#a75a0c',
    containerBg: '#f3eade',
    inputBg: '#fffdf9',
    white: '#ffffff',
    black: '#000000',
    cardShadow: '#3e2723',
    modalOverlay: 'rgba(0, 0, 0, 0.5)',
    modalCard: 'rgba(255, 255, 255, 0.95)',
    indicator: '#ccc',
    grassTuft: '#bda68f',
    sunBg: '#fffde7',
    sunGlow: '#fbbf24',
    badgeRed: '#ef4444',
  },
  dark: {
    bg: '#120d09',
    card: '#1a130f',
    cardInner: '#221914',
    cardBorder: '#3d2e22',
    border: '#2e2218',
    borderLight: '#241b13',
    borderMuted: '#3d2e22',
    divider: '#2d221a',
    text: '#f5eedc',
    textMedium: '#ebdcc5',
    textMuted: '#a69282',
    textSection: '#8e7a68',
    accent: '#fb923c',
    accentDark: '#ea580c',
    containerBg: '#221811',
    inputBg: '#1a130f',
    white: '#1a130f',
    black: '#fdfbf7',
    cardShadow: '#000000',
    modalOverlay: 'rgba(0, 0, 0, 0.75)',
    modalCard: 'rgba(26, 19, 15, 0.95)',
    indicator: '#4d3a2b',
    grassTuft: '#4a3d32',
    sunBg: '#fcd34d',
    sunGlow: '#f59e0b',
    badgeRed: '#ef4444',
  }
};

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState('light');

  useEffect(() => {
    async function loadTheme() {
      try {
        const storedTheme = await AsyncStorage.getItem('app_theme');
        if (storedTheme) {
          setThemeState(storedTheme);
        }
      } catch (e) {
        console.error('Error loading theme:', e);
      }
    }
    loadTheme();
  }, []);

  const setTheme = async (newTheme) => {
    try {
      setThemeState(newTheme);
      await AsyncStorage.setItem('app_theme', newTheme);
    } catch (e) {
      console.error('Error saving theme:', e);
    }
  };

  const toggleTheme = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  const isDark = theme === 'dark';
  const colors = {
    ...themeColors[theme],
    isDark,
  };

  return (
    <ThemeContext.Provider value={{ theme, isDark, colors, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
