import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, commonStyles } from '../styles/commonStyles';
import Icon from './Icon';

interface DashboardCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: string;
  iconName?: string;
  color: string;
  onPress?: () => void;
  badge?: number;
}

export default function DashboardCard({
  title,
  value,
  subtitle,
  icon,
  iconName,
  color,
  onPress,
  badge
}: DashboardCardProps) {
  const displayIcon = icon || iconName || 'help-circle';
  const displayValue = typeof value === 'number' ? value.toString() : value;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
        <Icon name={displayIcon as any} size={24} color={color} />
      </View>
      <Text style={styles.value}>{displayValue}</Text>
      <Text style={styles.title} numberOfLines={1}>{title}</Text>
      {subtitle && (
        <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>
      )}
      {badge !== undefined && badge > 0 && (
        <View style={[styles.badge, { backgroundColor: color }]}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '48%',
    backgroundColor: colors.backgroundAlt,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    ...commonStyles.shadow,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  value: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 4,
  },
  title: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 10,
    fontWeight: '500',
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.backgroundAlt,
  },
});
