import React, { useState } from 'react';
import { TouchableOpacity, StyleSheet, View, Text, Animated } from 'react-native';
import { colors } from '../styles/commonStyles';
import Icon from './Icon';

interface FloatingActionButtonProps {
  // Props pour le mode multi-actions (Finance)
  onAddIncome?: () => void;
  onAddExpense?: () => void;

  // Props pour le mode action simple (Lots, Stock, etc.)
  onPress?: () => void;
  icon?: string; // Icône personnalisable pour le mode simple
}

const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
  onAddIncome, onAddExpense, onPress, icon = 'add'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const animation = React.useRef(new Animated.Value(0)).current;
  // Déterminer si nous sommes en mode multi-actions (finance) ou simple
  const isMultiAction = !!onAddIncome && !!onAddExpense;

  const toggleMenu = () => {
    const toValue = isOpen ? 0 : 1;
    Animated.spring(animation, {
      toValue,
      friction: 6,
      useNativeDriver: true,
    }).start();
    setIsOpen(!isOpen);
  };

  const incomeStyle = {
    transform: [
      { scale: animation },
      { translateY: animation.interpolate({ inputRange: [0, 1], outputRange: [0, -60] }) },
    ],
  };

  const expenseStyle = {
    transform: [
      { scale: animation },
      { translateY: animation.interpolate({ inputRange: [0, 1], outputRange: [0, -120] }) },
    ],
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

  // Si ce n'est pas un bouton multi-actions, afficher un bouton simple
  if (!isMultiAction) {
    return (
      <View style={styles.container}>
        <TouchableOpacity style={[styles.fab, styles.mainFab]} onPress={onPress} activeOpacity={0.8}>
          <Icon name={icon as any} size={28} color={colors.white} />
        </TouchableOpacity>
      </View>
    );
  }

  // Sinon, afficher le bouton multi-actions pour la finance
  return (
    <View style={styles.container}>
      <TouchableOpacity style={[styles.fab, styles.secondaryFab, { backgroundColor: colors.error }, expenseStyle]} onPress={() => { onAddExpense?.(); toggleMenu(); }}>
        <Icon name="arrow-up" size={24} color={colors.white} />
      </TouchableOpacity>
      <TouchableOpacity style={[styles.fab, styles.secondaryFab, { backgroundColor: colors.success }, incomeStyle]} onPress={() => { onAddIncome?.(); toggleMenu(); }}>
        <Icon name="arrow-down" size={24} color={colors.white} />
      </TouchableOpacity>
      <TouchableOpacity style={[styles.fab, styles.mainFab]} onPress={toggleMenu} activeOpacity={0.8}>
        <Animated.View style={rotation}>
          <Icon name="add" size={28} color={colors.white} />
        </Animated.View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    alignItems: 'center',
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    zIndex: 99,
  },
  mainFab: {
    backgroundColor: colors.primary,
  },
  secondaryFab: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 24,
  },
});

export default FloatingActionButton;
