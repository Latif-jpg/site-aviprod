import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { colors } from '../styles/commonStyles';
import Icon from '../components/Icon';
import { supabase } from '../config'; // Import supabase directly
import DateTimePicker from '@react-native-community/datetimepicker';

interface ProphylaxisStep {
  day: number;
  date: string;
  title: string;
  description: string;
}

interface ProphylaxisPlanProps {
  onClose: () => void;
}

export default function ProphylaxisPlan({ onClose }: ProphylaxisPlanProps) {
  const [startDate, setStartDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [plan, setPlan] = useState<ProphylaxisStep[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchProphylaxisPlan();
  }, [startDate]);

  const fetchProphylaxisPlan = async () => {
    setIsLoading(true);
    try { // Supabase est déjà importé depuis config
      const formattedDate = startDate.toISOString().split('T')[0];

      const { data, error } = await supabase.rpc('get_sanitary_prophylaxis_plan', {
        start_date: formattedDate,
      });

      if (error) {
        throw error;
      }

      setPlan(data);
    } catch (error: any) {
      console.error('Error fetching prophylaxis plan:', error);
      Alert.alert('Erreur', 'Impossible de charger le plan de prophylaxie.');
    } finally {
      setIsLoading(false);
    }
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || startDate;
    setShowDatePicker(false);
    setStartDate(currentDate);
  };

  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('fr-FR', options);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Prophylaxie Sanitaire</Text>
        <TouchableOpacity onPress={onClose}>
          <Icon name="close" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.dateSelector}>
        <Text style={styles.dateLabel}>Date d'arrivée des poussins :</Text>
        <TouchableOpacity style={styles.dateButton} onPress={() => setShowDatePicker(true)}>
          <Icon name="calendar" size={20} color={colors.primary} />
          <Text style={styles.dateText}>{startDate.toLocaleDateString('fr-FR')}</Text>
        </TouchableOpacity>
      </View>

      {showDatePicker && (
        <DateTimePicker
          value={startDate}
          mode="date"
          display="default"
          onChange={onDateChange}
        />
      )}

      {isLoading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 20 }} />
      ) : (
        plan.map((step, index) => (
          <View key={index} style={styles.stepContainer}>
            <View style={styles.stepHeader}>
              <Text style={styles.stepDay}>Jour {step.day}</Text>
              <Text style={styles.stepDate}>{formatDate(step.date)}</Text>
            </View>
            <Text style={styles.stepTitle}>{step.title}</Text>
            <Text style={styles.stepDescription}>{step.description}</Text>
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 22, fontWeight: '700', color: colors.text },
  dateSelector: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, gap: 10 },
  dateLabel: { fontSize: 16, color: colors.textSecondary },
  dateButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.backgroundAlt, padding: 10, borderRadius: 8, gap: 8 },
  dateText: { fontSize: 16, fontWeight: '600', color: colors.primary },
  stepContainer: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  stepHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  stepDay: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
  },
  stepDate: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  stepDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
});