import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { colors } from '../../styles/commonStyles';
import Button from '../Button';
import Icon from '../Icon';
import { supabase } from '../../config';

interface AddVaccinationFormProps {
  onClose: () => void;
  onSaveSuccess: () => void;
}

export default function AddVaccinationForm({ onClose, onSaveSuccess }: AddVaccinationFormProps) {
  const [lotId, setLotId] = useState<string | null>(null);
  const [lots, setLots] = useState<{ id: string; name: string }[]>([]);
  const [vaccineName, setVaccineName] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingLots, setIsLoadingLots] = useState(true);

  useEffect(() => {
    fetchLots();
  }, []);

  const fetchLots = async () => {
    setIsLoadingLots(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Utilisateur non connecté");

      const { data, error } = await supabase
        .from('lots')
        .select('id, name')
        .eq('user_id', user.id)
        .eq('status', 'active');

      if (error) throw error;
      setLots(data || []);
      if (data && data.length > 0) {
        setLotId(data[0].id); // Sélectionne le premier lot par défaut
      }
    } catch (error: any) {
      console.error('Error fetching lots:', error);
      Alert.alert('Erreur', 'Impossible de charger les lots.');
    } finally {
      setIsLoadingLots(false);
    }
  };

  const handleSave = async () => {
    if (!lotId || !vaccineName.trim() || !description.trim()) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs.');
      return;
    }

    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Utilisateur non connecté");

      const vaccinationData = {
        user_id: user.id,
        lot_id: lotId,
        vaccine_name: vaccineName,
        description: description,
        due_date: dueDate.toISOString().split('T')[0],
        status: 'pending',
        // Ajout des champs obligatoires manquants avec des valeurs par défaut
        age_range_days: { start: 0, end: 0 }, // Valeur JSONB par défaut
        priority: 'medium', // Valeur par défaut
        frequency: 'once' // Valeur par défaut
      };

      const { error } = await supabase
        .from('vaccinations')
        .insert(vaccinationData);

      if (error) throw error;

      Alert.alert('Succès', 'Vaccination/traitement ajouté avec succès.');
      onSaveSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error saving vaccination:', error);
      Alert.alert('Erreur', `Impossible d'ajouter la vaccination: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || dueDate;
    setShowDatePicker(false);
    setDueDate(currentDate);
  };

  if (isLoadingLots) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Chargement des lots...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Ajouter un Vaccin/Traitement</Text>
        <TouchableOpacity onPress={onClose}>
          <Icon name="close" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Lot concerné</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={lotId}
            onValueChange={(itemValue) => setLotId(itemValue)}
            style={styles.picker}
          >
            {lots.map((lot) => (
              <Picker.Item key={lot.id} label={lot.name} value={lot.id} />
            ))}
          </Picker>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Titre</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex: Vaccin contre la maladie de Newcastle"
          value={vaccineName}
          onChangeText={setVaccineName}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Description</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex: Administrer 0.5ml par oiseau"
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={3}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Date d\'échéance</Text>
        <TouchableOpacity style={styles.dateButton} onPress={() => setShowDatePicker(true)}>
          <Icon name="calendar" size={20} color={colors.primary} />
          <Text style={styles.dateText}>{dueDate.toLocaleDateString('fr-FR')}</Text>
        </TouchableOpacity>
        {showDatePicker && (
          <DateTimePicker
            value={dueDate}
            mode="date"
            display="default"
            onChange={onDateChange}
          />
        )}
      </View>

      <Button text={isLoading ? "Enregistrement..." : "Enregistrer"} onPress={handleSave} disabled={isLoading} />
      <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
        <Text style={styles.cancelButtonText}>Annuler</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: colors.textSecondary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
  },
  section: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  picker: {
    height: 50,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fff',
    gap: 10,
  },
  dateText: {
    fontSize: 16,
    color: colors.text,
  },
  cancelButton: {
    marginTop: 10,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
});