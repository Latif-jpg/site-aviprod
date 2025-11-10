
import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '../styles/commonStyles';
import Icon from './Icon';

interface FloatingActionButtonProps {
  onPress: () => void;
  icon?: keyof typeof import('@expo/vector-icons').Ionicons.glyphMap;
  iconName?: keyof typeof import('@expo/vector-icons').Ionicons.glyphMap;
}

const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({ 
  onPress, 
  icon,
  iconName = 'add' 
}) => {
  const finalIcon = icon || iconName;
  
  return (
    <TouchableOpacity 
      style={styles.fab} 
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Icon name={finalIcon} size={28} color={colors.backgroundAlt} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    zIndex: 99,
  },
});

export default FloatingActionButton;
