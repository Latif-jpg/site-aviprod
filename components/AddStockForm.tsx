
import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, Alert, TouchableOpacity, ActivityIndicator } from 'react-native';
import { colors, commonStyles } from '../styles/commonStyles';
import Icon from './Icon';
import Button from './Button'; // Importation correcte
import { supabase } from '../config'; // Import supabase directly
import { useDataCollector } from '../src/hooks/useDataCollector';

interface AddStockFormProps {
  onSubmit: () => void;
  onCancel: () => void;
}

export default function AddStockForm({ onSubmit, onCancel }: AddStockFormProps) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('feed');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('kg');
  const [cost, setCost] = useState('');
  const [supplier, setSupplier] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { trackAction } = useDataCollector();

  const categories = [
    { id: 'feed', name: 'Alimentation', icon: 'nutrition' },
    { id: 'medicine', name: 'Médicaments', icon: 'medical' },
    { id: 'equipment', name: 'Équipement', icon: 'construct' },
    { id: 'other', name: 'Autre', icon: 'cube' },
  ];

  const units = ['kg', 'g', 'L', 'mL', 'unité', 'sac', 'boîte'];

  const validateForm = () => {
    if (!name.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer un nom d\'article');
      return false;
    }
    if (!quantity || parseFloat(quantity) < 0) {
      Alert.alert('Erreur', 'Veuillez entrer une quantité valide');
      return false;
    }
    if (!cost || parseFloat(cost) < 0) {
      Alert.alert('Erreur', 'Veuillez entrer un coût valide');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      console.log('📦 Adding stock item...');
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        // --- CORRECTION : S'assurer que l'utilisateur est bien connecté ---
        // Cette alerte est plus claire que l'erreur de base de données.
        Alert.alert(
          'Erreur d\'authentification', 
          'Votre session a peut-être expiré. Veuillez vous reconnecter.'
        );
        Alert.alert('Erreur', 'Vous devez être connecté pour ajouter un article');
        return;
      }

      const stockData = {
        user_id: user.id,
        name: name.trim(),
        category,
        quantity: parseFloat(quantity),
        unit,
        min_threshold: 5, // Valeur par défaut pour le seuil minimum
        cost: parseFloat(cost),
        supplier: supplier.trim() || null,
      };

      console.log('📦 Stock data to insert:', stockData);

      const { data, error } = await supabase
        .from('stock')
        .insert(stockData)
        .select();

      if (error) {
        console.error('❌ Error adding stock:', error);
        throw error;
      }

      console.log('✅ Stock added successfully:', data);
      Alert.alert('Succès! ✅', 'Article ajouté au stock avec succès');

      // TRACKER L'AJOUT AU STOCK
      trackAction('stock_item_added', {
        item_name: stockData.name,
        category: stockData.category,
        quantity: stockData.quantity,
        unit: stockData.unit,
        min_threshold: stockData.min_threshold,
        cost: stockData.cost,
        supplier: stockData.supplier
      });

      // Call onSubmit to refresh the stock list
      onSubmit();
    } catch (error: any) {
      console.error('❌ Error adding stock:', error);
      Alert.alert('Erreur', error.message || 'Impossible d\'ajouter l\'article');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>Ajouter au Stock</Text>
        <Text style={styles.subtitle}>Enregistrez un nouvel article</Text>
      </View>

      <Text style={styles.label}>Nom de l&apos;article *</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="Ex: Aliment poulet de chair"
        placeholderTextColor={colors.textSecondary}
      />

      <Text style={styles.label}>Catégorie *</Text>
      <View style={styles.categoryContainer}>
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat.id}
            style={[
              styles.categoryButton,
              category === cat.id && styles.categoryButtonSelected
            ]}
            onPress={() => setCategory(cat.id)}
          >
            <Icon 
              name={cat.icon as any} 
              size={20} 
              color={category === cat.id ? colors.white : colors.text} 
            />
            <Text style={[
              styles.categoryButtonText,
              category === cat.id && styles.categoryButtonTextSelected
            ]}>
              {cat.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.row}>
        <View style={styles.flex1}>
          <Text style={styles.label}>Quantité *</Text>
          <TextInput
            style={styles.input}
            value={quantity}
            onChangeText={setQuantity}
            placeholder="0"
            placeholderTextColor={colors.textSecondary}
            keyboardType="numeric"
          />
        </View>
        <View style={styles.flex1}>
          <Text style={styles.label}>Unité *</Text>
          <View style={styles.unitSelector}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {units.map((u) => (
                <TouchableOpacity
                  key={u}
                  style={[
                    styles.unitButton,
                    unit === u && styles.unitButtonSelected
                  ]}
                  onPress={() => setUnit(u)}
                >
                  <Text style={[
                    styles.unitButtonText,
                    unit === u && styles.unitButtonTextSelected
                  ]}>
                    {u}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </View>

      <Text style={styles.label}>Coût unitaire (CFA) *</Text>
      <TextInput
        style={styles.input}
        value={cost}
        onChangeText={setCost}
        placeholder="0"
        placeholderTextColor={colors.textSecondary}
        keyboardType="numeric"
      />

      <Text style={styles.label}>Fournisseur</Text>
      <TextInput
        style={styles.input}
        value={supplier}
        onChangeText={setSupplier}
        placeholder="Nom du fournisseur (optionnel)"
        placeholderTextColor={colors.textSecondary}
      />

      <View style={styles.buttonContainer}>
        <Button
          title={isSubmitting ? 'Ajout en cours...' : 'Ajouter au stock'}
          onPress={handleSubmit}
          disabled={isSubmitting}
        />
        <Button
          title="Annuler"
          onPress={onCancel}
          variant="secondary"
          disabled={isSubmitting}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  header: {
    marginBottom: 24,
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
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    backgroundColor: colors.backgroundAlt,
    color: colors.text,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  flex1: {
    flex: 1,
  },
  categoryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: colors.backgroundAlt,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
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
    color: colors.white,
  },
  unitSelector: {
    marginTop: 0,
  },
  unitButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: colors.backgroundAlt,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 8,
  },
  unitButtonSelected: {
    backgroundColor: colors.orange,
    borderColor: colors.orange,
  },
  unitButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  unitButtonTextSelected: {
    color: colors.white,
  },
  buttonContainer: {
    marginTop: 24,
    gap: 12,
    marginBottom: 40,
  },
});
