import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, Alert, ActivityIndicator, TouchableOpacity } from 'react-native';
import { colors, commonStyles } from '../styles/commonStyles';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import Button from './Button';
import { Lot } from '../types';
import { supabase } from '../config';

interface EditLotFormProps {
  lot: Lot;
  onClose: () => void;
  onUpdateSuccess: (updatedLotData: Partial<Lot>) => void;
}

// Helper pour formater la date en YYYY-MM-DD
const formatDateForInput = (date: string | Date | undefined): string => {
  if (!date) return '';
  return new Date(date).toISOString().split('T')[0];
};

export default function EditLotForm({ lot, onClose, onUpdateSuccess }: EditLotFormProps) {
  const [formData, setFormData] = useState({
    name: lot.name,
    quantity: lot.quantity.toString(),
    breed: lot.breed,
    entryDate: formatDateForInput(lot.entryDate),
    targetSaleDate: formatDateForInput(lot.targetSaleDate),
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerField, setDatePickerField] = useState<'entryDate' | 'targetSaleDate' | null>(null);

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleUpdate = async () => {
    // Validation
    if (!formData.name.trim()) {
      Alert.alert('Erreur', 'Le nom du lot est obligatoire.');
      return;
    }
    const quantity = parseInt(formData.quantity, 10);
    if (isNaN(quantity) || quantity < 0) {
      Alert.alert('Erreur', 'Veuillez entrer une quantité valide.');
      return;
    }

    setIsSubmitting(true);
    try {
      const updateData = {
        name: formData.name.trim(),
        quantity: quantity,
        breed: formData.breed.trim(),
        entry_date: formData.entryDate || null,
        target_sale_date: formData.targetSaleDate || null,
      };

      const { error } = await supabase
        .from('lots')
        .update(updateData)
        .eq('id', lot.id);

      if (error) {
        throw error;
      }

      // --- NOUVEAU : Préparer les données mises à jour pour le parent ---
      const updatedLotData = { 
        ...lot, 
        ...updateData, 
        entryDate: updateData.entry_date, 
        targetSaleDate: updateData.target_sale_date 
      };

      Alert.alert('Succès', 'Les informations du lot ont été mises à jour.');
      onUpdateSuccess(updatedLotData);

    } catch (error: any) {
      console.error("Erreur lors de la mise à jour du lot:", error);
      Alert.alert("Erreur", "Impossible de mettre à jour le lot. Veuillez réessayer.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const onDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios'); // Sur Android, le picker se ferme tout seul
    if (selectedDate && datePickerField) {
      const formattedDate = formatDateForInput(selectedDate);
      setFormData(prev => ({
        ...prev,
        [datePickerField]: formattedDate,
      }));
    }
  };

  const showDatepickerFor = (field: 'entryDate' | 'targetSaleDate') => {
    setDatePickerField(field);
    setShowDatePicker(true);
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>Modifier le Lot</Text>
        <Text style={styles.subtitle}>Mettez à jour les informations de "{lot.name}"</Text>
      </View>

      <View style={styles.form}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Nom du lot *</Text>
          <TextInput
            style={commonStyles.input}
            value={formData.name}
            onChangeText={(value) => handleInputChange('name', value)}
            placeholder="Ex: Lot de chair 001"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Quantité actuelle *</Text>
          <TextInput
            style={commonStyles.input}
            value={formData.quantity}
            onChangeText={(value) => handleInputChange('quantity', value)}
            keyboardType="number-pad"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Race</Text>
          <TextInput
            style={commonStyles.input}
            value={formData.breed}
            onChangeText={(value) => handleInputChange('breed', value)}
            placeholder="Ex: Cobb 500, Sasso..."
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Date d'entrée</Text>
          <TouchableOpacity onPress={() => showDatepickerFor('entryDate')} style={commonStyles.input}>
            <Text style={formData.entryDate ? styles.dateText : styles.placeholderText}>
              {formData.entryDate || 'AAAA-MM-JJ'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Date de vente prévue</Text>
          <TouchableOpacity onPress={() => showDatepickerFor('targetSaleDate')} style={commonStyles.input}>
            <Text style={formData.targetSaleDate ? styles.dateText : styles.placeholderText}>
              {formData.targetSaleDate || 'AAAA-MM-JJ'}
            </Text>
          </TouchableOpacity>
        </View>

        {showDatePicker && (
          <DateTimePicker
            value={new Date(formData[datePickerField!] || new Date())}
            mode="date"
            display="default"
            onChange={onDateChange}
          />
        )}

        <View style={styles.buttonContainer}>
          <Button
            title={isSubmitting ? 'Enregistrement...' : 'Enregistrer les modifications'}
            onPress={handleUpdate}
            disabled={isSubmitting}
            loading={isSubmitting}
          />
          <Button
            title="Annuler"
            onPress={onClose}
            variant="secondary"
            disabled={isSubmitting}
          />
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  header: {
    marginBottom: 24,
  },
  title: { fontSize: 24, fontWeight: '700', color: colors.text, marginBottom: 4 },
  subtitle: { fontSize: 16, color: colors.textSecondary },
  form: {
    paddingBottom: 40,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: { fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 8 },
  buttonContainer: {
    marginTop: 24,
    gap: 12,
  },
  dateText: {
    fontSize: 16,
  },
  placeholderText: {
    fontSize: 16,
    color: '#C7C7CD',
  },
});