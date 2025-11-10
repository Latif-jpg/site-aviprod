import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { colors } from '../../styles/commonStyles';
import Icon from '../Icon';
import { supabase } from '../config'; // Import supabase directly
import { SanitaryAction } from '../../types';

interface SanitaryProphylaxisProps {
  onClose: () => void;
}

export default function SanitaryProphylaxis({ onClose }: SanitaryProphylaxisProps) {
  const [actions, setActions] = useState<SanitaryAction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSanitaryActions();
  }, []);

  const loadSanitaryActions = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.from('sanitary_tasks').select('*').order('created_at', { ascending: true });
      if (error) throw error;
      setActions(data || []);
    } catch (error) {
      console.error('Error loading sanitary actions:', error);
      Alert.alert('Erreur', 'Impossible de charger le programme sanitaire.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleComplete = async (action: SanitaryAction) => {
    const isCompleting = !action.completed;

    Alert.alert(
      'Confirmer l\'action',
      `Marquer "${action.title}" comme ${isCompleting ? 'terminé' : 'non terminé'} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Confirmer',
          onPress: async () => {
            const originalActions = actions;
            // Optimistic UI update
            setActions(prevActions =>
              prevActions.map(a =>
                a.id === action.id ? { ...a, completed: isCompleting } : a
              )
            );

            try {
              const today = new Date();
              let nextDueDate: Date | null = null;

              if (isCompleting) {
                nextDueDate = new Date(today);
                switch (action.frequency) {
                  case 'daily': nextDueDate.setDate(today.getDate() + 1); break;
                  case 'weekly': nextDueDate.setDate(today.getDate() + 7); break;
                  case 'monthly': nextDueDate.setMonth(today.getMonth() + 1); break;
                }
              }

              const { error } = await supabase
                .from('sanitary_tasks')
                .update({
                  completed: isCompleting,
                  last_completed: isCompleting ? today.toISOString().split('T')[0] : null,
                  next_due_date: nextDueDate ? nextDueDate.toISOString() : null,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', action.id);

              if (error) throw error;

              // Refresh data from server to be sure
              await loadSanitaryActions();

            } catch (error) {
              console.error('Error updating sanitary action:', error);
              Alert.alert('Erreur', 'Impossible de mettre à jour l\'action.');
              // Revert optimistic update on error
              setActions(originalActions);
            }
          },
        },
      ]
    );
  };

  const pendingActions = actions.filter(a => !a.completed);
  const completedActions = actions.filter(a => a.completed);

  const renderPendingActionItem = (action: SanitaryAction) => (
    <TouchableOpacity key={action.id} style={styles.pendingActionItem} onPress={() => handleToggleComplete(action)}>
      <Icon
        name="square-outline"
        size={24}
        color={colors.primary}
        style={styles.pendingIcon}
      />
      <Text style={styles.pendingActionTitle}>{action.title}</Text>
      <Text style={styles.pendingActionDate}>Prochain: {new Date(action.next_due_date).toLocaleDateString()}</Text>
    </TouchableOpacity>
  );

  const renderCompletedActionItem = (action: SanitaryAction) => (
    <View key={action.id} style={styles.completedActionItem}>
      <TouchableOpacity style={styles.checkboxContainer} onPress={() => handleToggleComplete(action)}>
        <Icon
          name="checkbox"
          size={28}
          color={colors.success}
        />
      </TouchableOpacity>
      <View style={styles.actionDetails}>
        <Text style={styles.actionTitle}>{action.title}</Text>
        <Text style={styles.actionDescription}>{action.description}</Text>
        <View style={styles.tags}>
          <Text style={styles.tag}>{action.frequency}</Text>
          <Text style={styles.tag}>Terminé: {action.lastCompleted ? new Date(action.lastCompleted).toLocaleDateString() : 'N/A'}</Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Prophylaxie Sanitaire</Text>
        <TouchableOpacity onPress={onClose}>
          <Icon name="close" size={28} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>
      {isLoading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView>
          {pendingActions.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Actions en cours</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalGrid}>
                {pendingActions.map(renderPendingActionItem)}
              </ScrollView>
            </View>
          )}
          {completedActions.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Historique</Text>
              {completedActions.map(renderCompletedActionItem)}
            </View>
          )}
          {actions.length === 0 && (
            <Text style={styles.emptyText}>Aucun programme sanitaire configuré.</Text>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingTop: 20
  },
  title: { fontSize: 22, fontWeight: '700', color: colors.text },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: colors.text, marginBottom: 12 },
  horizontalGrid: { marginBottom: 16 },
  pendingActionItem: { backgroundColor: colors.backgroundAlt, padding: 8, borderRadius: 8, marginRight: 8, borderWidth: 1, borderColor: colors.border, width: 100, alignItems: 'center' },
  pendingIcon: { marginBottom: 4 },
  pendingActionTitle: { fontSize: 12, fontWeight: '600', color: colors.text, textAlign: 'center', marginBottom: 2 },
  pendingActionDate: { fontSize: 10, color: colors.textSecondary, textAlign: 'center' },
  completedActionItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.backgroundAlt, padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: colors.border },
  checkboxContainer: { marginRight: 16 },
  actionDetails: { flex: 1 },
  actionTitle: { fontSize: 16, fontWeight: '600', color: colors.text },
  actionDescription: { fontSize: 14, color: colors.textSecondary, marginVertical: 4 },
  tags: { flexDirection: 'row', gap: 8, marginTop: 8 },
  tag: { backgroundColor: colors.border, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, fontSize: 12, color: colors.textSecondary, overflow: 'hidden' },
  emptyText: { textAlign: 'center', marginTop: 50, color: colors.textSecondary, fontSize: 16 },
});