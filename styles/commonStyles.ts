import { StyleSheet } from 'react-native';

export const colors = {
  primary: '#10996E', // Vert principal
  primaryDark: '#0D7A57',
  secondary: '#FF9800', // Orange pour les accents
  accent: '#3B82F6', // Bleu pour les actions secondaires
  accentSecondary: '#8B5CF6', // Violet pour d'autres accents
  
  background: '#f8fafc', // Fond très clair, presque blanc
  backgroundAlt: '#ffffff', // Fond alternatif (cartes, etc.)
  surface: '#ffffff', // Surface des cartes

  text: '#1e293b', // Texte principal (gris très foncé)
  textSecondary: '#64748b', // Texte secondaire (gris moyen)
  
  border: '#e2e8f0', // Bordures (gris clair)
  
  success: '#10b981', // Vert pour succès
  warning: '#f59e0b', // Jaune/Orange pour avertissements
  error: '#ef4444', // Rouge pour erreurs
  
  white: '#ffffff',
  black: '#000000',
  orange: '#FF9800',
};

export const commonStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  input: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
  },
  button: {
    backgroundColor: colors.primary,
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
});

// Hook pour une utilisation future avec des thèmes (clair/sombre)
export const useThemeColors = () => {
  return colors;
};