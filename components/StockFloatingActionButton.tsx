import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import Icon from './Icon';
import { colors } from '../styles/commonStyles';

interface StockFloatingActionButtonProps {
  onAddEntry: () => void;
  onAddExit: () => void;
}

export default function StockFloatingActionButton({ onAddEntry, onAddExit }: StockFloatingActionButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const animation = useState(new Animated.Value(0))[0];

  const toggleMenu = () => {
    const toValue = isOpen ? 0 : 1;
    Animated.spring(animation, {
      toValue,
      friction: 6,
      useNativeDriver: true,
    }).start();
    setIsOpen(!isOpen);
  };

  const rotation = {
    transform: [
      {
        rotate: animation.interpolate({
          inputRange: [0, 1],
          outputRange: ['0deg', '45deg'],
        }),
      },
    ],
  };

  const entryStyle = {
    transform: [
      { scale: animation },
      {
        translateY: animation.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -60],
        }),
      },
    ],
  };

  const exitStyle = {
    transform: [
      { scale: animation },
      {
        translateY: animation.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -120],
        }),
      },
    ],
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.button, styles.secondary]}
        onPress={() => { onAddExit(); toggleMenu(); }}
      >
        <Animated.View style={exitStyle}>
          <Icon name="arrow-up-circle-outline" size={24} color={colors.white} />
        </Animated.View>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.secondary]}
        onPress={() => { onAddEntry(); toggleMenu(); }}
      >
        <Animated.View style={entryStyle}>
          <Icon name="arrow-down-circle-outline" size={24} color={colors.white} />
        </Animated.View>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.button, styles.menu]} onPress={toggleMenu}>
        <Animated.View style={rotation}>
          <Icon name="add" size={30} color={colors.white} />
        </Animated.View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    alignItems: 'center',
    bottom: 80,
    right: 20,
  },
  button: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    shadowRadius: 10,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowOffset: { height: 5, width: 0 },
    elevation: 5,
  },
  menu: {
    backgroundColor: colors.primary,
  },
  secondary: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.accent,
  },
});