// styles/ai-dashboard-styles.ts
import { StyleSheet } from 'react-native';

// Palette de couleurs "Néon Futuriste"
export const futuristicColors = {
  background: '#0D0C1D', // Un bleu très sombre, presque noir
  glassBackground: 'rgba(23, 22, 45, 0.5)', // Fond de carte semi-transparent
  border: 'rgba(78, 78, 163, 0.4)', // Bordure pour le glassmorphism
  text: '#EFEFEF', // Texte principal clair
  textSecondary: '#A9A8B3', // Texte secondaire plus sombre

  // Couleurs d'accentuation Néon
  cyan: '#00FFFF', // Santé
  violet: '#8A2BE2', // ML / Apprentissage
  amber: '#FFBF00', // Recommandations / Avertissements

  // Couleurs de dégradé
  gradientStart: '#1D1A3D', // Bleu nuit
  gradientEnd: '#3F357A', // Indigo

  // Couleurs sémantiques basées sur la palette
  primary: '#5D5FEF', // Un violet/bleu vif pour les actions principales
  success: '#00DDAA', // Un vert-cyan pour le succès
  warning: '#FFBF00', // Ambre
  danger: '#FF4D4D', // Rouge néon

  white: '#FFFFFF',
};

export const futuristicStyles = StyleSheet.create({
  // Styles globaux si nécessaire
});
