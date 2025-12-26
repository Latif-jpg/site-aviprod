import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { colors } from '../styles/commonStyles';
import { FinancialRecord } from '../types';
import { supabase } from '../config';
import Button from '../components/Button'; // CORRECTION: Chemin d'importation corrigé

interface EditFinancialRecordFormProps {
  record: FinancialRecord;
  onClose: () => void;
  onUpdateSuccess: () => void;
}

export default function EditFinancialRecordForm({ record, onClose, onUpdateSuccess }: EditFinancialRecordFormProps) {
  const [amount, setAmount] = useState(record.amount.toString());
  const [description, setDescription] = useState(record.description);
  const [category, setCategory] = useState(record.category);
  const [recordDate, setRecordDate] = useState(new Date(record.record_date).toISOString().split('T')[0]);
  const [isLoading, setIsLoading] = useState(false);

  const handleUpdate = async () => {
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert("Erreur", "Veuillez entrer un montant valide.");
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('financial_records')
        .update({
          amount: parsedAmount,
          description,
          category,
          record_date: recordDate,
        })
        .eq('id', record.id);

      if (error) throw error;

      Alert.alert("Succès", "La transaction a été mise à jour.");
      onUpdateSuccess();
    } catch (error: any) {
      console.error("Erreur mise à jour transaction:", error);
      Alert.alert("Erreur", "Impossible de mettre à jour la transaction.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Modifier la Transaction</Text>

      <Text style={styles.label}>Montant (CFA)</Text>
      <TextInput
        style={styles.input}
        value={amount}
        onChangeText={setAmount}
        keyboardType="numeric"
        placeholder="Ex: 50000"
      />

      <Text style={styles.label}>Description</Text>
      <TextInput
        style={styles.input}
        value={description}
        onChangeText={setDescription}
        placeholder="Ex: Vente de 10 poulets"
      />

      <Text style={styles.label}>Catégorie</Text>
      <TextInput
        style={styles.input}
        value={category}
        onChangeText={setCategory}
        placeholder="Ex: Vente, Achat aliment..."
      />

      <Text style={styles.label}>Date</Text>
      <TextInput
        style={styles.input}
        value={recordDate}
        onChangeText={setRecordDate}
        placeholder="YYYY-MM-DD"
      />

      <Button
        title={isLoading ? "Mise à jour..." : "Mettre à jour"}
        onPress={handleUpdate}
        disabled={isLoading}
        style={{ marginTop: 16 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20 },
  title: { fontSize: 22, fontWeight: '700', color: colors.text, marginBottom: 24, textAlign: 'center' },
  label: { fontSize: 14, color: colors.textSecondary, marginBottom: 8 },
  input: {
    backgroundColor: colors.background,
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
    fontSize: 16,
  },
});