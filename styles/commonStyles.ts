
import { StyleSheet, ViewStyle, TextStyle, Platform } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

// Legacy colors for backward compatibility - will be replaced by theme
export const colors = {
  primary: '#2196F3',      // Un bleu vif et moderne
  secondary: '#1976D2',    // Un bleu plus foncé
  accent: '#FF9800',       // Orange accent
  accentSecondary: '#FFC107', // Yellow accent
  orange: '#FF6B00',       // Orange for navigation selection
  background: '#F8F9FA',   // Un gris très clair, "blanc sale"
  backgroundAlt: '#FFFFFF', // White background
  text: '#1A202C',         // Un gris très foncé, presque noir
  textSecondary: '#666666', // Gray text
  grey: '#E0E0E0',         // Light grey
  card: '#FFFFFF',         // White card background
  success: '#4CAF50',      // Success green
  warning: '#FF9800',      // Warning orange
  error: '#F44336',        // Error red
  border: '#E0E0E0',       // Border color
  white: '#FFFFFF',        // White color
};

// Hook to get theme colors
export const useThemeColors = () => {
  const { theme } = useTheme();
  return theme.colors;
};

export const buttonStyles = StyleSheet.create({
  primary: {
    backgroundColor: colors.primary,
    alignSelf: 'center',
    width: '100%',
  },
  secondary: {
    backgroundColor: colors.secondary,
    alignSelf: 'center',
    width: '100%',
  },
  accent: {
    backgroundColor: colors.accent,
    alignSelf: 'center',
    width: '100%',
  },
});

const shadowStyle = Platform.select({
  ios: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  android: {
    elevation: 3,
  },
  default: {},
});

export const commonStyles = StyleSheet.create({
  wrapper: {
    backgroundColor: colors.background,
    width: '100%',
    height: '100%',
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
    width: '100%',
    height: '100%',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: 800,
    width: '100%',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    color: colors.text,
    marginBottom: 10
  },
  subtitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  text: {
    fontSize: 16,
    fontWeight: '400',
    color: colors.textSecondary,
    marginBottom: 8,
    lineHeight: 24,
    textAlign: 'center',
  },
  section: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  card: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    width: '100%',
    ...shadowStyle,
  },
  dashboardCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    marginVertical: 8,
    marginHorizontal: 16,
    ...shadowStyle,
  },
  shadow: shadowStyle,
  icon: {
    width: 60,
    height: 60,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: colors.backgroundAlt,
    color: colors.text,
    marginBottom: 16,
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: colors.backgroundAlt,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  bottomNavItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  bottomNavText: {
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
});
