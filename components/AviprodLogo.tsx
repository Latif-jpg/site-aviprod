import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function AviprodLogo() {
  const [displayText, setDisplayText] = useState('');
  const fullText = "L'innovation au service de l'élevage";

  useEffect(() => {
    const animateText = () => {
      let currentIndex = 0;
      let isWriting = true;

      const interval = setInterval(() => {
        if (isWriting) {
          // Phase d'écriture
          if (currentIndex < fullText.length) {
            setDisplayText(fullText.slice(0, currentIndex + 1));
            currentIndex++;
          } else {
            // Fin de l'écriture, passer à l'effacement
            isWriting = false;
          }
        } else {
          // Phase d'effacement
          if (currentIndex > 0) {
            currentIndex--;
            setDisplayText(fullText.slice(0, currentIndex));
          } else {
            // Fin de l'effacement, redémarrer
            clearInterval(interval);
            setTimeout(animateText, 1000); // Pause avant de recommencer
            return;
          }
        }
      }, 100); // Vitesse d'écriture/effacement des caractères

      return () => clearInterval(interval);
    };

    // Démarrer l'animation après un petit délai
    setTimeout(animateText, 500);
  }, []);

  return (
    <View style={styles.container}>
      {/* Logo texte */}
      <View style={styles.logoContainer}>
        <Text style={styles.logoText}>
          AVIPROD
        </Text>
      </View>

      {/* Ligne décorative */}
      <View style={styles.decorativeLine} />

      {/* Animation du texte */}
      <View style={styles.textContainer}>
        <Text style={styles.animatedText}>
          {displayText}
        </Text>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    paddingTop: 8,
    paddingBottom: 8,
    paddingHorizontal: 16,
    backgroundColor: 'transparent',
    position: 'relative',
    flex: 1,
  },
  logoContainer: {
    position: 'relative',
  },
  logoText: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 2,
    color: '#2563EB', // Fallback color for React Native
    position: 'relative',
  },
  decorativeLine: {
    width: '100%',
    height: 1,
    backgroundColor: '#14B8A6',
  },
  textContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  animatedText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#D2691E', // Couleur chocolat/jaune
    textAlign: 'center',
    fontStyle: 'italic',
  },
  stage1: {
    // Animation would be handled with Animated API in React Native
  },
  stage2: {
    // Animation would be handled with Animated API in React Native
  },
  stage3: {
    // Animation would be handled with Animated API in React Native
  },
  signature: {
    position: 'absolute',
    bottom: 8,
    right: 12,
    fontSize: 10,
    fontWeight: '600',
    fontStyle: 'italic',
    color: '#3B82F6',
    opacity: 0.7,
  },
});