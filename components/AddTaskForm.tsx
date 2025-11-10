
import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { colors, commonStyles } from '../styles/commonStyles';
import Button from './Button';
import Icon from './Icon';
import { Task } from '../types';

interface AddTaskFormProps {
  onSubmit: (task: Omit<Task, 'id'>) => void;
  onCancel: () => void;
}

export default function AddTaskForm({ onSubmit, onCancel }: AddTaskFormProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    dueDate: new Date().toISOString().split('T')[0],
    priority: 'medium' as 'low' | 'medium' | 'high',
    category: 'other' as 'feeding' | 'health' | 'cleaning' | 'maintenance' | 'other',
  });

  const priorities = [
    { value: 'low', label: 'Low', color: colors.success },
    { value: 'medium', label: 'Medium', color: colors.warning },
    { value: 'high', label: 'High', color: colors.error },
  ];

  const categories = [
    { value: 'feeding', label: 'Feeding', icon: 'nutrition' },
    { value: 'health', label: 'Health', icon: 'medical' },
    { value: 'cleaning', label: 'Cleaning', icon: 'water' },
    { value: 'maintenance', label: 'Maintenance', icon: 'construct' },
    { value: 'other', label: 'Other', icon: 'ellipsis-horizontal' },
  ];

  const handleSubmit = () => {
    if (!formData.title.trim()) {
      Alert.alert('Error', 'Please enter a task title');
      return;
    }

    const newTask: Omit<Task, 'id'> = {
      title: formData.title.trim(),
      description: formData.description.trim(),
      dueDate: formData.dueDate,
      completed: false,
      priority: formData.priority,
      category: formData.category,
    };

    console.log('Creating new task:', newTask);
    onSubmit(newTask);
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>Add New Task</Text>
        <Text style={styles.subtitle}>Create a task to keep track of farm activities</Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Task Title *</Text>
        <TextInput
          style={commonStyles.input}
          placeholder="Enter task title"
          value={formData.title}
          onChangeText={(text) => setFormData({ ...formData, title: text })}
          autoCapitalize="sentences"
        />

        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[commonStyles.input, styles.textArea]}
          placeholder="Enter task description"
          value={formData.description}
          onChangeText={(text) => setFormData({ ...formData, description: text })}
          multiline
          numberOfLines={3}
          autoCapitalize="sentences"
        />

        <Text style={styles.label}>Due Date</Text>
        <TextInput
          style={commonStyles.input}
          placeholder="YYYY-MM-DD"
          value={formData.dueDate}
          onChangeText={(text) => setFormData({ ...formData, dueDate: text })}
        />

        <Text style={styles.label}>Priority</Text>
        <View style={styles.priorityContainer}>
          {priorities.map((priority) => (
            <TouchableOpacity
              key={priority.value}
              style={[
                styles.priorityButton,
                formData.priority === priority.value && {
                  backgroundColor: priority.color,
                  borderColor: priority.color,
                }
              ]}
              onPress={() => setFormData({ ...formData, priority: priority.value as any })}
            >
              <Text style={[
                styles.priorityText,
                formData.priority === priority.value && styles.priorityTextActive
              ]}>
                {priority.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Category</Text>
        <View style={styles.categoryContainer}>
          {categories.map((category) => (
            <TouchableOpacity
              key={category.value}
              style={[
                styles.categoryButton,
                formData.category === category.value && styles.categoryButtonActive
              ]}
              onPress={() => setFormData({ ...formData, category: category.value as any })}
            >
              <Icon
                name={category.icon as any}
                size={20}
                color={formData.category === category.value ? colors.backgroundAlt : colors.text}
              />
              <Text style={[
                styles.categoryText,
                formData.category === category.value && styles.categoryTextActive
              ]}>
                {category.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.buttonContainer}>
          <Button
            text="Create Task"
            onPress={handleSubmit}
            style={styles.submitButton}
          />
          
          <TouchableOpacity onPress={onCancel} style={styles.cancelButton}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  form: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
    marginTop: 16,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  priorityContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  priorityButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundAlt,
    alignItems: 'center',
  },
  priorityText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  priorityTextActive: {
    color: colors.backgroundAlt,
  },
  categoryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundAlt,
    gap: 6,
  },
  categoryButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  categoryTextActive: {
    color: colors.backgroundAlt,
  },
  buttonContainer: {
    marginTop: 32,
    gap: 12,
  },
  submitButton: {
    backgroundColor: colors.primary,
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  cancelText: {
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: '500',
  },
});
