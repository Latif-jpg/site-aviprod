
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, commonStyles } from '../styles/commonStyles';
import { Task } from '../types';
import Icon from './Icon';

interface TaskCardProps {
  task: Task;
  onPress: () => void;
  onToggleComplete: () => void;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, onPress, onToggleComplete }) => {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return colors.error;
      case 'medium': return colors.warning;
      case 'low': return colors.success;
      default: return colors.textSecondary;
    }
  };

  const isOverdue = new Date(task.dueDate) < new Date() && !task.completed;
  const isDueToday = task.dueDate === new Date().toISOString().split('T')[0];

  return (
    <TouchableOpacity
      style={[
        commonStyles.card,
        styles.taskCard,
        task.completed && styles.completedCard,
        isOverdue && styles.overdueCard
      ]}
      onPress={onPress}
    >
      <View style={styles.header}>
        <TouchableOpacity 
          style={[
            styles.checkbox,
            task.completed && styles.checkboxCompleted
          ]}
          onPress={onToggleComplete}
        >
          {task.completed && (
            <Icon name="checkmark-circle" size={16} color={colors.backgroundAlt} />
          )}
        </TouchableOpacity>
        
        <View style={styles.taskInfo}>
          <Text style={[
            styles.taskTitle,
            task.completed && styles.completedText
          ]}>
            {task.title}
          </Text>
          <Text style={[
            styles.taskDescription,
            task.completed && styles.completedText
          ]}>
            {task.description}
          </Text>
        </View>

        <View style={[
          styles.priorityBadge,
          { backgroundColor: getPriorityColor(task.priority) + '20' }
        ]}>
          <Text style={[
            styles.priorityText,
            { color: getPriorityColor(task.priority) }
          ]}>
            {task.priority}
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        <View style={styles.dateContainer}>
          <Icon 
            name="calendar" 
            size={14} 
            color={isOverdue ? colors.error : isDueToday ? colors.warning : colors.textSecondary} 
          />
          <Text style={[
            styles.dueDate,
            isOverdue && styles.overdueText,
            isDueToday && styles.dueTodayText
          ]}>
            {new Date(task.dueDate).toLocaleDateString()}
          </Text>
        </View>

        {isOverdue && (
          <Text style={styles.overdueLabel}>Overdue</Text>
        )}
        {isDueToday && !task.completed && (
          <Text style={styles.dueTodayLabel}>Due Today</Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  taskCard: {
    marginHorizontal: 16,
  },
  completedCard: {
    opacity: 0.7,
  },
  overdueCard: {
    borderLeftWidth: 4,
    borderLeftColor: colors.error,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  checkboxCompleted: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  taskInfo: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  taskDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  completedText: {
    textDecorationLine: 'line-through',
    opacity: 0.6,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 8,
  },
  priorityText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dueDate: {
    fontSize: 14,
    color: colors.textSecondary,
    marginLeft: 6,
  },
  overdueText: {
    color: colors.error,
    fontWeight: '600',
  },
  dueTodayText: {
    color: colors.warning,
    fontWeight: '600',
  },
  overdueLabel: {
    fontSize: 12,
    color: colors.error,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  dueTodayLabel: {
    fontSize: 12,
    color: colors.warning,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
});

export default TaskCard;
