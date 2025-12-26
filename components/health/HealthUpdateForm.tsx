import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { colors } from '../../styles/commonStyles';
import Icon from '../../components/Icon';
import { supabase } from '../../config';
import { useAuth } from '../../hooks/useAuth';

interface Lot {
  id: string;
  name: string;
  quantity: number;
  mortality: number;
  symptoms?: string[];
}

interface HealthUpdateFormProps {
  onClose: () => void;
  onUpdate: () => void;
}

export default function HealthUpdateForm({ onClose, onUpdate }: HealthUpdateFormProps) {
  const { user } = useAuth();
  const [lots, setLots] = useState<Lot[]>([]);
  const [selectedLotId, setSelectedLotId] = useState<string>('');
  const [newDeaths, setNewDeaths] = useState<string>('');
  // Removed sickCount and quarantinedCount as they don't exist in DB yet
  const [symptoms, setSymptoms] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingLots, setIsLoadingLots] = useState(true);

  useEffect(() => {
    if (user) {
      loadLots();
    }
  }, [user]); // Se déclenche quand l'utilisateur est disponible

  const loadLots = async () => {
    if (!user) return;

    try {
      setIsLoadingLots(true);
      const { data, error } = await supabase
        .from('lots')
        .select('id, name, quantity, mortality, symptoms')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      setLots(data || []);
    } catch (error) {
      console.error('Error loading lots:', error);
      Alert.alert('Erreur', 'Impossible de charger les lots');
    } finally {
      setIsLoadingLots(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedLotId) {
      Alert.alert('Erreur', 'Veuillez sélectionner un lot');
      return;
    }

    const deaths = parseInt(newDeaths) || 0;
    const symptomList = symptoms.split(',').map(s => s.trim()).filter(s => s.length > 0);

    if (deaths < 0) {
      Alert.alert('Erreur', 'Le nombre de décès ne peut pas être négatif');
      return;
    }

    const selectedLot = lots.find(l => l.id === selectedLotId);
    if (!selectedLot) return;

    // Validation: deaths shouldn't exceed remaining birds
    if (deaths > selectedLot.quantity) {
      Alert.alert('Erreur', `Le nombre de morts (${deaths}) ne peut pas dépasser le nombre d'oiseaux restants (${selectedLot.quantity})`);
      return;
    }

    try {
      setIsLoading(true);

      // Prepare update data
      const updateData: any = {
        mortality: (selectedLot.mortality || 0) + deaths,
        quantity: selectedLot.quantity - deaths, // Décrémenter la quantité
      };

      // Handle symptoms
      if (symptomList.length > 0) {
        const existingSymptoms = selectedLot.symptoms || [];
        updateData.symptoms = [...new Set([...existingSymptoms, ...symptomList])];
      }

      const { error } = await supabase
        .from('lots')
        .update(updateData)
        .eq('id', selectedLotId);

      if (error) throw error;

      Alert.alert('Succès', 'Mise à jour de la santé effectuée avec succès', [
        { text: 'OK', onPress: () => {
          onUpdate();
          onClose();
        }}
      ]);
    } catch (error) {
      console.error('Error updating health:', error);
      Alert.alert('Erreur', 'Impossible de mettre à jour la santé du lot');
    } finally {
      setIsLoading(false);
    }
  };

  const selectedLot = lots.find(l => l.id === selectedLotId);

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
      <Text style={styles.title}>Mise à Jour Quotidienne de la Santé</Text>

      <View style={styles.section}>
        <Text style={styles.label}>Sélectionner le lot</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={selectedLotId}
            onValueChange={setSelectedLotId}
            style={styles.picker}
          >
            <Picker.Item label="Choisir un lot..." value="" />
            {lots.map(lot => (
              <Picker.Item
                key={lot.id}
                label={`${lot.name} (${lot.quantity} oiseaux restants)`}
                value={lot.id}
              />
            ))}
          </Picker>
        </View>
      </View>

      {selectedLot && (
        <View style={styles.lotInfo}>
          <Text style={styles.lotInfoTitle}>Informations actuelles du lot</Text>
          <Text style={styles.lotInfoText}>Oiseaux restants: {selectedLot.quantity}</Text>
          <Text style={styles.lotInfoText}>
            Mortalité actuelle: {selectedLot.mortality || 0}
          </Text>
          {selectedLot.symptoms && selectedLot.symptoms.length > 0 && (
            <Text style={styles.lotInfoText}>
              Symptômes: {selectedLot.symptoms.join(', ')}
            </Text>
          )}
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.label}>Nouveaux décès (aujourd'hui)</Text>
        <TextInput
          style={styles.input}
          value={newDeaths}
          onChangeText={setNewDeaths}
          placeholder="0"
          keyboardType="numeric"
        />
      </View>


      <View style={styles.section}>
        <Text style={styles.label}>Symptômes observés (séparés par des virgules)</Text>
        <TextInput
          style={styles.input}
          value={symptoms}
          onChangeText={setSymptoms}
          placeholder="Fièvre, diarrhée, etc."
          multiline
          numberOfLines={3}
        />
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.cancelButton]}
          onPress={onClose}
          disabled={isLoading}
        >
          <Text style={styles.cancelButtonText}>Annuler</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.submitButton, isLoading && styles.disabledButton]}
          onPress={handleSubmit}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Mettre à Jour</Text>
          )}
        </TouchableOpacity>
      </View>
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
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    color: colors.text,
    textAlign: 'center',
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
  lotInfo: {
    backgroundColor: colors.backgroundAlt,
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  lotInfoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 10,
  },
  lotInfoText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  button: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: colors.backgroundAlt,
  },
  cancelButtonText: {
    fontSize: 16,
    color: colors.text,
  },
  submitButton: {
    backgroundColor: colors.primary,
  },
  submitButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.6,
  },
});
