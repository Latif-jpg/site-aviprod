
import React from 'react';
import { Text, TouchableOpacity, StyleSheet, ViewStyle, TextStyle, ActivityIndicator } from 'react-native';
import { colors } from '../styles/commonStyles';

interface ButtonProps {
  title?: string;
  text?: string;
  onPress: () => void;
  style?: ViewStyle | ViewStyle[];
  textStyle?: TextStyle;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  loading?: boolean;
}

export default function Button({ 
  title, 
  text, 
  onPress, 
  style, 
  textStyle, 
  variant = 'primary',
  disabled = false,
  loading = false
}: ButtonProps) {
  const buttonText = title || text || '';
  
  const getBackgroundColor = () => {
    if (disabled) return colors.textSecondary;
    switch (variant) {
      case 'secondary':
        return colors.backgroundAlt;
      case 'danger':
        return colors.error;
      default:
        return colors.primary;
    }
  };

  const getTextColor = () => {
    if (variant === 'secondary') {
      return colors.text;
    }
    return colors.backgroundAlt;
  };

  return (
    <TouchableOpacity 
      style={[
        styles.button, 
        { backgroundColor: getBackgroundColor() },
        variant === 'secondary' && styles.secondaryButton,
        disabled && styles.disabledButton,
        style
      ]} 
      onPress={onPress} 
      activeOpacity={0.7}
      disabled={disabled || loading}
    >
      {loading ? (
        <ActivityIndicator color={getTextColor()} />
      ) : (
        <Text style={[
          styles.buttonText, 
          { color: getTextColor() },
          textStyle
        ]}>
          {buttonText}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    padding: 16,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: colors.border,
  },
  disabledButton: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});
