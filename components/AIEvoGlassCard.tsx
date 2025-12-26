// components/AIEvoGlassCard.tsx
import React, { ReactNode } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { futuristicColors } from '../styles/ai-dashboard-styles';

interface AIEvoGlassCardProps {
  children: ReactNode;
  style?: object;
}

const AIEvoGlassCard: React.FC<AIEvoGlassCardProps> = ({ children, style }) => {
  const cardContent = (
    <LinearGradient
      colors={[futuristicColors.gradientStart, futuristicColors.gradientEnd]}
      style={styles.gradient}
    >
      <View style={styles.contentContainer}>
        {children}
      </View>
    </LinearGradient>
  );

  return (
    <View style={[styles.container, style]}>
      {Platform.OS === 'ios' ? (
        <BlurView intensity={20} tint="dark" style={styles.blurView}>
          {cardContent}
        </BlurView>
      ) : (
        // BlurView sur Android est moins performant et a des bugs visuels.
        // On utilise une couleur de fond semi-transparente comme alternative.
        <View style={styles.androidFallback}>
          {cardContent}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: futuristicColors.border,
  },
  blurView: {
    flex: 1,
  },
  androidFallback: {
    flex: 1,
    backgroundColor: futuristicColors.glassBackground,
  },
  gradient: {
    flex: 1,
    padding: 16,
  },
  contentContainer: {
    backgroundColor: 'transparent',
  },
});

export default AIEvoGlassCard;
