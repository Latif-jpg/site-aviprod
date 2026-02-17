import React, { useState, useRef } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, Alert, TouchableOpacity, ActivityIndicator } from 'react-native';
import { colors, commonStyles } from '../styles/commonStyles';
import { Lot } from '../types';
import Icon from './Icon';
import Button from './Button';
import { useDataCollector } from '../src/hooks/useDataCollector';

interface AddLotFormProps {
  onSubmit: (lot: Omit<Lot, 'id'>) => void;
  onCancel: () => void;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 24,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 60, // Espace supplémentaire en bas
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: '#000000',
    backgroundColor: colors.backgroundAlt,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.backgroundAlt,
    overflow: 'hidden',
  },
  pickerButton: {
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pickerButtonText: {
    fontSize: 16,
    color: '#000000',
  },
  pickerOptions: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  pickerOption: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  pickerOptionText: {
    fontSize: 16,
    color: '#000000',
  },
  pickerOptionSelected: {
    backgroundColor: colors.primary + '20',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
    paddingBottom: 20, // Espace en bas
  },
  button: {
    flex: 1,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.primary,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
  },
  checkboxLabel: {
    fontSize: 16,
    color: '#000000',
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
    marginTop: 20,
    marginBottom: 12,
  },
  helpText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  manualButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  cancelButton: {
    backgroundColor: colors.backgroundAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  submitButton: {
    backgroundColor: colors.primary,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.backgroundAlt,
  },
  disabledButton: {
    opacity: 0.5,
  },
});

export default function AddLotForm({ onSubmit, onCancel }: AddLotFormProps) {
  const [name, setName] = useState('');
  const [birdType, setBirdType] = useState<'broilers' | 'layers' | 'breeders'>('broilers');
  const [breed, setBreed] = useState('');
  const [quantity, setQuantity] = useState('');
  const [age, setAge] = useState('');
  const [averageWeight, setAverageWeight] = useState('');
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split('T')[0]);
  const [targetSaleDate, setTargetSaleDate] = useState('');
  const [targetWeight, setTargetWeight] = useState('');


  const [showBirdTypePicker, setShowBirdTypePicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false); // Protection synchrone contre le double-clic
  const { trackLotEvent } = useDataCollector();

  const birdTypes = [
    { value: 'broilers', label: 'Poulets de Chair' },
    { value: 'layers', label: 'Poules Pondeuses' },
    { value: 'breeders', label: 'Reproducteurs' },
  ];

  const validateForm = () => {
    if (!name.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer un nom pour le lot');
      return false;
    }
    if (!breed.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer la race');
      return false;
    }
    if (!quantity || parseInt(quantity) <= 0) {
      Alert.alert('Erreur', 'Veuillez entrer une quantité valide');
      return false;
    }
    if (!age || parseInt(age) < 0) {
      Alert.alert('Erreur', 'Veuillez entrer un âge valide');
      return false;
    }
    if (targetSaleDate && !/^\d{4}-\d{2}-\d{2}$/.test(targetSaleDate)) {
      Alert.alert('Erreur', 'La date de vente prévue doit être au format AAAA-MM-JJ.');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (isSubmittingRef.current) return; // Bloque immédiatement si déjà en cours
    if (!validateForm()) return;

    isSubmittingRef.current = true;
    setIsSubmitting(true);
    try {
      // --- CORRECTION : Calculer l'âge initial à la date d'entrée ---
      // Si l'utilisateur saisit une date passée, l'âge qu'il donne est l'âge ACTUEL.
      // On doit donc remonter le temps pour trouver l'âge qu'ils avaient à l'entrée.
      const entryDateObj = new Date(entryDate);
      const today = new Date();
      entryDateObj.setHours(0, 0, 0, 0);
      today.setHours(0, 0, 0, 0);

      const daysSinceEntry = Math.max(0, Math.floor((today.getTime() - entryDateObj.getTime()) / (1000 * 60 * 60 * 24)));
      const calculatedInitialAge = Math.max(0, parseInt(age) - daysSinceEntry);

      console.log('Correction Âge:', {
        saisi: parseInt(age),
        dateEntree: entryDate,
        joursEcoulés: daysSinceEntry,
        ageInitialStocké: calculatedInitialAge
      });

      const lotData = {
        name: name.trim(),
        bird_type: birdType,
        breed: breed.trim(),
        quantity: parseInt(quantity),
        initial_quantity: parseInt(quantity),
        age: calculatedInitialAge, // On stocke l'âge qu'ils avaient le jour de l'entrée
        entry_date: entryDate,
        target_sale_date: targetSaleDate || null,
        target_weight: targetWeight ? parseFloat(targetWeight) : null
      };

      await onSubmit(lotData as any);

      // TRACKER LA CRÉATION DE LOT
      trackLotEvent('created', {
        id: 'new_lot', // Sera mis à jour avec l'ID réel dans le parent
        name: lotData.name,
        bird_type: lotData.bird_type,
        breed: lotData.breed,
        quantity: lotData.quantity,
        initial_quantity: lotData.initial_quantity,
        age: lotData.age,
        entry_date: lotData.entry_date,
        target_sale_date: lotData.target_sale_date,
        target_weight: lotData.target_weight
      });

    } catch (error) {
      console.error('Error submitting form:', error);
      Alert.alert('Erreur', "Une erreur est survenue lors de l'ajout du lot. Veuillez réessayer.");
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Ajouter un Lot</Text>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Type de Volaille *</Text>
          <View style={styles.pickerContainer}>
            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => setShowBirdTypePicker(!showBirdTypePicker)}
            >
              <Text style={styles.pickerButtonText}>
                {birdTypes.find(t => t.value === birdType)?.label}
              </Text>
              <Icon
                name="chevron-forward-outline"
                size={20}
                color={colors.text}
              />
            </TouchableOpacity>
            {showBirdTypePicker && (
              <View style={styles.pickerOptions}>
                {birdTypes.map(type => (
                  <TouchableOpacity
                    key={type.value}
                    style={[
                      styles.pickerOption,
                      birdType === type.value && styles.pickerOptionSelected,
                    ]}
                    onPress={() => {
                      setBirdType(type.value as any);
                      setShowBirdTypePicker(false);
                    }}
                  >
                    <Text style={styles.pickerOptionText}>{type.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Nom du Lot *</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Ex: Lot Poulets Janvier 2024"
            placeholderTextColor={colors.textSecondary}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Race *</Text>
          <TextInput
            style={styles.input}
            value={breed}
            onChangeText={setBreed}
            placeholder="Ex: Cobb 500, ISA Brown"
            placeholderTextColor={colors.textSecondary}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Quantité (nombre de volailles) *</Text>
          <TextInput
            style={styles.input}
            value={quantity}
            onChangeText={setQuantity}
            placeholder="Ex: 1000"
            keyboardType="numeric"
            placeholderTextColor={colors.textSecondary}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Âge (en jours) *</Text>
          <TextInput
            style={styles.input}
            value={age}
            onChangeText={setAge}
            placeholder="Ex: 7"
            keyboardType="numeric"
            placeholderTextColor={colors.textSecondary}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Date d&apos;Entrée *</Text>
          <TextInput
            style={styles.input}
            value={entryDate}
            onChangeText={setEntryDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={colors.textSecondary}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Date de Vente Prévue</Text>
          <TextInput
            style={styles.input}
            value={targetSaleDate}
            onChangeText={setTargetSaleDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={colors.textSecondary}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Poids Cible (kg)</Text>
          <TextInput
            style={styles.input}
            value={targetWeight}
            onChangeText={setTargetWeight}
            placeholder="Ex: 2.5"
            keyboardType="decimal-pad"
            placeholderTextColor={colors.textSecondary}
          />
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[
              styles.manualButton,
              styles.cancelButton,
            ]}
            onPress={onCancel}
          >
            <Text style={styles.cancelButtonText}>Annuler</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.manualButton,
              styles.submitButton,
              isSubmitting && styles.disabledButton
            ]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            <Text style={styles.submitButtonText}>
              {isSubmitting ? 'Ajout...' : 'Ajouter le Lot'}
            </Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </View>
  );
}