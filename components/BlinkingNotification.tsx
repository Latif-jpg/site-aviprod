
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { colors } from '../styles/commonStyles';
import Icon from './Icon';

interface BlinkingNotificationProps {
  id: string;
  title: string;
  message: string;
  count: number;
  icon: keyof typeof import('@expo/vector-icons').Ionicons.glyphMap;
  onPress?: () => void;
  onDismiss?: (id: string) => void;
}

export default function BlinkingNotification({ 
  id,
  title, 
  message, 
  count, 
  icon, 
  onPress,
  onDismiss
}: BlinkingNotificationProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Pulsing animation
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );

    // Blinking animation
    const blink = Animated.loop(
      Animated.sequence([
        Animated.timing(opacityAnim, {
          toValue: 0.6,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ])
    );

    pulse.start();
    blink.start();

    return () => {
      pulse.stop();
      blink.stop();
    };
  }, [pulseAnim, opacityAnim]);

  const handlePress = () => {
    // Masquer immédiatement le composant
    setIsVisible(false);

    if (onPress) {
      onPress();
    }
    if (onDismiss) {
      onDismiss(id);
    }
  };

  if (!isVisible) {
    return null;
  };

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.7}>
      <Animated.View 
        style={[
          styles.container,
          { 
            borderColor: colors.error,
            transform: [{ scale: pulseAnim }],
          }
        ]}
      >
        <Animated.View 
          style={[
            styles.iconContainer,
            { 
              backgroundColor: colors.error + '20',
              opacity: opacityAnim,
            }
          ]}
        >
          <Icon name={icon as any} size={24} color={colors.error} />
        </Animated.View>
        
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <View style={[styles.badge, { backgroundColor: colors.error }]}>
              <Text style={styles.badgeText}>{count}</Text>
            </View>
          </View>
          <Text style={styles.message}>{message}</Text>
        </View>

        {/* Correction: Le bouton de fermeture doit déclencher la même action que le clic principal */}
        <TouchableOpacity 
          onPress={handlePress} 
          style={styles.dismissButton}
        >
          <Icon name="close" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundAlt,
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    gap: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
  },
  badge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.backgroundAlt,
  },
  message: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  dismissButton: {
    padding: 8,
    marginLeft: 8,
  },
});
