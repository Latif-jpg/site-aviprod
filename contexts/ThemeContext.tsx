import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Theme, ThemeType, ThemeColors } from '../types/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from 'react-native';

const THEME_STORAGE_KEY = 'user_theme_preference';

// Light theme colors
const lightColors: ThemeColors = {
  primary: '#2196F3',
  secondary: '#1976D2',
  accent: '#FF9800',
  accentSecondary: '#FFC107',
  orange: '#FF6B00',
  background: '#F8F9FA',
  backgroundAlt: '#FFFFFF',
  text: '#1A202C',
  textSecondary: '#666666',
  grey: '#E0E0E0',
  card: '#FFFFFF',
  success: '#4CAF50',
  warning: '#FF9800',
  error: '#F44336',
  border: '#E0E0E0',
  white: '#FFFFFF',
};

// Dark theme colors
const darkColors: ThemeColors = {
  primary: '#64B5F6',
  secondary: '#42A5F5',
  accent: '#FFB74D',
  accentSecondary: '#FFCC02',
  orange: '#FF8A65',
  background: '#121212',
  backgroundAlt: '#1E1E1E',
  text: '#FFFFFF',
  textSecondary: '#B0B0B0',
  grey: '#424242',
  card: '#2D2D2D',
  success: '#81C784',
  warning: '#FFB74D',
  error: '#EF5350',
  border: '#424242',
  white: '#FFFFFF',
};

interface ThemeContextType {
  theme: Theme;
  setThemeType: (type: ThemeType) => Promise<void>;
  toggleTheme: () => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [themeType, setThemeTypeState] = useState<ThemeType>('system');
  const [theme, setTheme] = useState<Theme>({
    type: 'system',
    colors: lightColors,
    isDark: false,
  });

  // Load saved theme preference on mount
  useEffect(() => {
    loadThemePreference();
  }, []);

  // Update theme when themeType or system preference changes
  useEffect(() => {
    updateTheme();
  }, [themeType, systemColorScheme]);

  const loadThemePreference = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
        setThemeTypeState(savedTheme as ThemeType);
      }
    } catch (error) {
      console.error('Error loading theme preference:', error);
    }
  };

  const saveThemePreference = async (type: ThemeType) => {
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, type);
    } catch (error) {
      console.error('Error saving theme preference:', error);
    }
  };

  const updateTheme = () => {
    let colors: ThemeColors;
    let isDark: boolean;

    switch (themeType) {
      case 'light':
        colors = lightColors;
        isDark = false;
        break;
      case 'dark':
        colors = darkColors;
        isDark = true;
        break;
      case 'system':
      default:
        colors = systemColorScheme === 'dark' ? darkColors : lightColors;
        isDark = systemColorScheme === 'dark';
        break;
    }

    setTheme({
      type: themeType,
      colors,
      isDark,
    });
  };

  const setThemeType = async (type: ThemeType) => {
    setThemeTypeState(type);
    await saveThemePreference(type);
  };

  const toggleTheme = async () => {
    const newType = theme.isDark ? 'light' : 'dark';
    await setThemeType(newType);
  };

  return (
    <ThemeContext.Provider value={{ theme, setThemeType, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};