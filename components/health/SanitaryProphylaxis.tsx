import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { colors } from '../../styles/commonStyles';
import Icon from '../Icon';
import { supabase } from '../../config'; // Import supabase directly
import { SanitaryAction } from '../../types';

interface ProphylaxisPlanProps {
  onClose: () => void;
  lotId: string; // NOUVEAU: ID du lot pour lequel afficher le plan
}

export default function ProphylaxisPlan({ onClose, lotId }: ProphylaxisPlanProps) {
  const [plan, setPlan] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (lotId) {
      loadProphylaxisPlan();
    }
  }, [lotId]);

  const loadProphylaxisPlan = async () => {
    setIsLoading(true);
    try {
      // 1. Récupérer la date de démarrage du lot
      const { data: lotData, error: lotError } = await supabase
        .from('lots')
        .select('entry_date')
        .eq('id', lotId)
        .single();

      if (lotError) throw lotError;
      if (!lotData?.entry_date) {
        Alert.alert('Erreur', 'Date de démarrage du lot non trouvée.');
        return;
      }

      // 2. Appeler la fonction RPC avec la date de démarrage
      const { data, error } = await supabase.rpc('get_sanitary_prophylaxis_plan', {
        start_date: lotData.entry_date,
      });

      if (error) {
        console.error('Error calling get_sanitary_prophylaxis_plan RPC:', error);
        throw error;
      }
      
      setPlan(data || []);
    } catch (error) {
      console.error('Error loading prophylaxis plan:', error);
      Alert.alert('Erreur', 'Impossible de charger le plan de prophylaxie pour ce lot.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderPlanItem = (item: any, index: number) => (
    <View key={index} style={styles.completedActionItem}>
      <View style={styles.checkboxContainer}>
        <Text style={styles.dayLabel}>J{item.day}</Text>
      </View>
      <View style={styles.actionDetails}>
        <Text style={styles.actionTitle}>{item.title}</Text>
        <Text style={styles.actionDescription}>{item.description}</Text>
        <View style={styles.tags}>
          <Text style={styles.tag}>Date: {new Date(item.date).toLocaleDateString()}</Text>
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
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Calendrier Sanitaire du Lot</Text>
            {plan.map(renderPlanItem)}
          </View>
          
          {plan.length === 0 && (
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
  completedActionItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.backgroundAlt, padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: colors.border },
  checkboxContainer: { 
    marginRight: 16, 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    backgroundColor: colors.primary + '20', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  dayLabel: {
    fontSize: 14, fontWeight: 'bold', color: colors.primary
  },
  actionDetails: { flex: 1 },
  actionTitle: { fontSize: 16, fontWeight: '600', color: colors.text },
  actionDescription: { fontSize: 14, color: colors.textSecondary, marginVertical: 4 },
  tags: { flexDirection: 'row', gap: 8, marginTop: 8 },
  tag: { backgroundColor: colors.border, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, fontSize: 12, color: colors.textSecondary, overflow: 'hidden' },
  emptyText: { textAlign: 'center', marginTop: 50, color: colors.textSecondary, fontSize: 16 },
});