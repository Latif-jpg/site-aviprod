// components/AIEvoDecisionCard.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { futuristicColors } from '../styles/ai-dashboard-styles';
import AIEvoGlassCard from './AIEvoGlassCard';
import Icon from './Icon';

export interface Recommendation {
  icon: any;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  actionText: string;
}

interface AIEvoDecisionCardProps {
  recommendation: Recommendation;
}

const getPriorityStyle = (priority: Recommendation['priority']) => {
  switch (priority) {
    case 'high':
      return {
        color: futuristicColors.amber,
        iconContainer: { backgroundColor: futuristicColors.amber + '20' },
        button: { backgroundColor: futuristicColors.amber },
      };
    case 'medium':
      return {
        color: futuristicColors.violet,
        iconContainer: { backgroundColor: futuristicColors.violet + '20' },
        button: { backgroundColor: futuristicColors.violet },
      };
    case 'low':
    default:
      return {
        color: futuristicColors.success,
        iconContainer: { backgroundColor: futuristicColors.success + '20' },
        button: { backgroundColor: futuristicColors.success },
      };
  }
};

const AIEvoDecisionCard: React.FC<AIEvoDecisionCardProps> = ({ recommendation }) => {
  const { icon, title, description, priority, actionText } = recommendation;
  const priorityStyle = getPriorityStyle(priority);

  return (
    <AIEvoGlassCard style={{ marginBottom: 20 }}>
      <View style={styles.container}>
        <View style={[styles.iconContainer, priorityStyle.iconContainer]}>
          <Icon name={icon} size={30} color={priorityStyle.color} />
        </View>
        <View style={styles.content}>
          <Text style={[styles.title, { color: priorityStyle.color }]}>{title}</Text>
          <Text style={styles.description}>{description}</Text>
        </View>
      </View>
      <TouchableOpacity style={[styles.button, priorityStyle.button]}>
        <Text style={styles.buttonText}>{actionText}</Text>
      </TouchableOpacity>
    </AIEvoGlassCard>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  description: {
    fontSize: 14,
    color: futuristicColors.textSecondary,
    marginTop: 4,
  },
  button: {
    marginTop: 15,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: futuristicColors.background,
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default AIEvoDecisionCard;
