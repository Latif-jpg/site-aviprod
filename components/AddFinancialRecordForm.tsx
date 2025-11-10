
import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, Alert, TouchableOpacity, ActivityIndicator } from 'react-native';
import { colors, commonStyles } from '../styles/commonStyles';
import { FinancialRecord } from '../types';
import Button from './Button';
import Icon from './Icon';
import { useDataCollector } from '../src/hooks/useDataCollector';
import { supabase } from '../config'; // Importer supabase

interface AddFinancialRecordFormProps {
  type: 'income' | 'expense';
  onSubmitSuccess: () => void; // Changé pour signaler le succès
  onCancel: () => void;
}

export default function AddFinancialRecordForm({ type, onSubmitSuccess, onCancel }: AddFinancialRecordFormProps) {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const { trackAction } = useDataCollector();

  const incomeCategories = ['Vente de volailles', 'Vente d\'œufs', 'Services', 'Autres revenus'];
  const expenseCategories = ['Alimentation', 'Médicaments', 'Équipement', 'Main d\'œuvre', 'Transport', 'Autres dépenses'];

  const categories = type === 'income' ? incomeCategories : expenseCategories;

  const validateForm = (): boolean => {
    const newErrors: {[key: string]: string} = {};

    // Validate amount
    if (!amount) {
      newErrors.amount = 'Le montant est requis';
    } else {
      const numericAmount = parseFloat(amount);
      if (isNaN(numericAmount)) {
        newErrors.amount = 'Le montant doit être un nombre valide';
      } else if (numericAmount <= 0) {
        newErrors.amount = 'Le montant doit être supérieur à 0';
      } else if (numericAmount > 100000000) {
        newErrors.amount = 'Le montant semble trop élevé (max: 100,000,000 CFA)';
      }
    }

    // Validate description
    if (!description.trim()) {
      newErrors.description = 'La description est requise';
    } else if (description.trim().length < 3) {
      newErrors.description = 'La description doit contenir au moins 3 caractères';
    } else if (description.trim().length > 200) {
      newErrors.description = 'La description est trop longue (max: 200 caractères)';
    }

    // Validate category
    if (!category) {
      newErrors.category = 'La catégorie est requise';
    }

    // Validate date
    if (!date) {
      newErrors.date = 'La date est requise';
    } else {
      const recordDate = new Date(date);
      const today = new Date();
      if (isNaN(recordDate.getTime())) {
        newErrors.date = 'Format de date invalide (utilisez YYYY-MM-DD)';
      } else if (recordDate > today) {
        newErrors.date = 'La date ne peut pas être dans le futur';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    console.log('Attempting to create financial record:', { type, amount, description, category, date });

    if (!validateForm()) {
      // L'alerte est déjà gérée par la validation, on peut la retirer pour éviter les doublons
      // ou la garder si on préfère une alerte globale.
      return;
    }
    
    setLoading(true);

    try {
      const numericAmount = parseFloat(amount);

      const record: Omit<FinancialRecord, 'id'> = {
        type,
        amount: numericAmount,
        description: description.trim(),
        category,
        record_date: date,
      };

      console.log('Submitting financial record:', record);

      // TRACKER L'AJOUT DE TRANSACTION FINANCIÈRE
      trackAction('transaction_added', {
        type: record.type,
        amount: record.amount,
        description: record.description,
        category: record.category,
        record_date: record.record_date
      });

      // --- NOUVELLE LOGIQUE D'ENREGISTREMENT ---
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Utilisateur non connecté");

      const { error } = await supabase.from('financial_records').insert([
        {
          user_id: user.id,
          type: record.type,
          amount: record.amount,
          category: record.category,
          description: record.description,
          record_date: record.record_date,
        },
      ]).select('*');

      if (error) throw error;
      // --- FIN DE LA NOUVELLE LOGIQUE ---

      onSubmitSuccess(); // Signaler le succès à la page parente
      
      Alert.alert(
        'Succès! 🎉',
        `${type === 'income' ? 'Le revenu' : 'La dépense'} de ${numericAmount.toLocaleString()} CFA a été enregistré${type === 'income' ? '' : 'e'} avec succès.`,
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      console.error('Error creating financial record:', error);
      Alert.alert(
        'Erreur d\'enregistrement',
        'Impossible d\'enregistrer la transaction. Veuillez réessayer.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>
          Ajouter {type === 'income' ? 'un Revenu' : 'une Dépense'}
        </Text>
        <TouchableOpacity onPress={onCancel} style={styles.closeButton} disabled={loading}>
          <Icon name="close" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.form}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Montant (CFA) *</Text>
          <TextInput
            style={[styles.input, errors.amount && styles.inputError]}
            value={amount}
            onChangeText={(text) => {
              setAmount(text);
              if (errors.amount) {
                setErrors({ ...errors, amount: '' });
              }
            }}
            placeholder="0"
            keyboardType="numeric"
            placeholderTextColor={colors.textSecondary}
            editable={!loading}
          />
          {errors.amount && <Text style={styles.errorText}>{errors.amount}</Text>}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Description *</Text>
          <TextInput
            style={[styles.input, styles.textArea, errors.description && styles.inputError]}
            value={description}
            onChangeText={(text) => {
              setDescription(text);
              if (errors.description) {
                setErrors({ ...errors, description: '' });
              }
            }}
            placeholder="Description de la transaction"
            placeholderTextColor={colors.textSecondary}
            multiline
            numberOfLines={3}
            editable={!loading}
          />
          {errors.description && <Text style={styles.errorText}>{errors.description}</Text>}
          <Text style={styles.characterCount}>{description.length}/200</Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Catégorie *</Text>
          {!category && errors.category && <Text style={styles.errorText}>{errors.category}</Text>}
          <View style={styles.categoryContainer}>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.categoryButton,
                  category === cat && styles.categoryButtonSelected
                ]}
                onPress={() => {
                  setCategory(cat);
                  if (errors.category) {
                    setErrors({ ...errors, category: '' });
                  }
                }}
                disabled={loading}
              >
                <Text style={[
                  styles.categoryButtonText,
                  category === cat && styles.categoryButtonTextSelected
                ]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Date *</Text>
          <TextInput
            style={[styles.input, errors.date && styles.inputError]}
            value={date}
            onChangeText={(text) => {
              setDate(text);
              if (errors.date) {
                setErrors({ ...errors, date: '' });
              }
            }}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={colors.textSecondary}
            editable={!loading}
          />
          {errors.date && <Text style={styles.errorText}>{errors.date}</Text>}
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Enregistrement en cours...</Text>
          </View>
        ) : (
          <View style={styles.buttonContainer}>
            <Button
              text="Enregistrer"
              onPress={handleSubmit}
              style={styles.submitButton}
            />
            <TouchableOpacity onPress={onCancel} style={styles.cancelButton}>
              <Text style={styles.cancelText}>Annuler</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  closeButton: {
    padding: 4,
  },
  form: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.backgroundAlt,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  inputError: {
    borderColor: colors.error,
    borderWidth: 2,
  },
  errorText: {
    fontSize: 14,
    color: colors.error,
    marginTop: 4,
    marginLeft: 4,
  },
  characterCount: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'right',
    marginTop: 4,
  },
  categoryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundAlt,
  },
  categoryButtonSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  categoryButtonTextSelected: {
    color: colors.backgroundAlt,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 20,
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  buttonContainer: {
    gap: 12,
    marginTop: 20,
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
