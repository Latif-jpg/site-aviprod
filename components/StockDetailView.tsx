
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { colors } from '../styles/commonStyles';
import Icon from './Icon';
import Button from './Button';
import { StockItem } from '../types';
import { ensureSupabaseInitialized } from '../app/integrations/supabase/client';

interface StockDetailViewProps {
  item: StockItem;
  onUpdate: () => void;
  onClose: () => void;
}

export default function StockDetailView({ item, onUpdate, onClose }: StockDetailViewProps) {
  const [adjustmentAmount, setAdjustmentAmount] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'feed': return 'nutrition' as const;
      case 'medicine': return 'medical' as const;
      case 'equipment': return 'construct' as const;
      default: return 'cube' as const;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'feed': return colors.success;
      case 'medicine': return colors.error;
      case 'equipment': return colors.primary;
      default: return colors.textSecondary;
    }
  };

  const isLowStock = item.quantity <= item.minThreshold;
  const stockPercentage = (item.quantity / (item.minThreshold * 2)) * 100;

  const handleAdjustStock = async (operation: 'add' | 'remove') => {
    const amount = parseFloat(adjustmentAmount);
    
    if (!adjustmentAmount || isNaN(amount) || amount <= 0) {
      Alert.alert('Erreur', 'Veuillez entrer une quantité valide');
      return;
    }

    const newQuantity = operation === 'add' 
      ? item.quantity + amount 
      : item.quantity - amount;

    if (newQuantity < 0) {
      Alert.alert('Erreur', 'La quantité ne peut pas être négative');
      return;
    }

    setIsUpdating(true);
    try {
      const supabase = await ensureSupabaseInitialized();
      
      const { error } = await supabase
        .from('stock')
        .update({ 
          quantity: newQuantity,
          updated_at: new Date().toISOString()
        })
        .eq('id', item.id);

      if (error) throw error;

      const operationText = operation === 'add' ? 'ajouté' : 'retiré';
      Alert.alert(
        'Succès! ✅', 
        `${amount} ${item.unit} ${operationText}${operation === 'add' ? 's' : 's'} avec succès`
      );
      setAdjustmentAmount('');
      onUpdate();
    } catch (error: any) {
      console.error('Error adjusting stock:', error);
      Alert.alert('Erreur', error.message || 'Impossible de modifier le stock');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    Alert.alert(
      'Confirmer la suppression',
      `Êtes-vous sûr de vouloir supprimer "${item.name}" du stock ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              const supabase = await ensureSupabaseInitialized();
              
              const { error } = await supabase
                .from('stock')
                .delete()
                .eq('id', item.id);

              if (error) throw error;

              Alert.alert('Succès! ✅', 'Article supprimé du stock');
              onUpdate();
              onClose();
            } catch (error: any) {
              console.error('Error deleting stock:', error);
              Alert.alert('Erreur', error.message || 'Impossible de supprimer l\'article');
            }
          }
        }
      ]
    );
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View style={[
          styles.iconContainer,
          { backgroundColor: getCategoryColor(item.category) + '20' }
        ]}>
          <Icon 
            name={getCategoryIcon(item.category)} 
            size={32} 
            color={getCategoryColor(item.category)} 
          />
        </View>
        <Text style={styles.itemName}>{item.name}</Text>
        <Text style={styles.supplier}>{item.supplier || 'Fournisseur non spécifié'}</Text>
      </View>

      {isLowStock && (
        <View style={styles.alertBanner}>
          <Icon name="warning" size={20} color={colors.error} />
          <Text style={styles.alertText}>
            Stock faible! Quantité en dessous du seuil minimum
          </Text>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quantité Actuelle</Text>
        <View style={styles.quantityCard}>
          <Text style={[
            styles.quantityValue,
            isLowStock && styles.lowStockText
          ]}>
            {item.quantity} {item.unit}
          </Text>
          <View style={styles.stockBar}>
            <View 
              style={[
                styles.stockFill,
                { 
                  width: `${Math.min(stockPercentage, 100)}%`,
                  backgroundColor: isLowStock ? colors.error : colors.success
                }
              ]} 
            />
          </View>
          <Text style={styles.thresholdText}>
            Seuil minimum: {item.minThreshold} {item.unit}
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Ajuster le Stock</Text>
        <View style={styles.adjustmentCard}>
          <TextInput
            style={styles.adjustmentInput}
            value={adjustmentAmount}
            onChangeText={setAdjustmentAmount}
            placeholder={`Quantité en ${item.unit}`}
            placeholderTextColor={colors.textSecondary}
            keyboardType="numeric"
          />
          <View style={styles.adjustmentButtons}>
            <TouchableOpacity
              style={[styles.adjustmentButton, styles.addButton]}
              onPress={() => handleAdjustStock('add')}
              disabled={isUpdating}
            >
              <Icon name="add" size={24} color={colors.white} />
              <Text style={styles.adjustmentButtonText}>Ajouter</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.adjustmentButton, styles.removeButton]}
              onPress={() => handleAdjustStock('remove')}
              disabled={isUpdating}
            >
              <Icon name="remove" size={24} color={colors.white} />
              <Text style={styles.adjustmentButtonText}>Retirer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Informations</Text>
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Catégorie</Text>
            <Text style={styles.infoValue}>{item.category}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Coût unitaire</Text>
            <Text style={styles.infoValue}>{item.cost.toLocaleString()} CFA/{item.unit}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Valeur totale</Text>
            <Text style={[styles.infoValue, styles.totalValue]}>
              {(item.quantity * item.cost).toLocaleString()} CFA
            </Text>
          </View>
          {item.expiryDate && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Date d&apos;expiration</Text>
              <Text style={[styles.infoValue, styles.expiryText]}>
                {new Date(item.expiryDate).toLocaleDateString()}
              </Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.dangerZone}>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={handleDelete}
        >
          <Icon name="trash" size={20} color={colors.error} />
          <Text style={styles.deleteButtonText}>Supprimer cet article</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  itemName: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
    textAlign: 'center',
  },
  supplier: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.error + '20',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    gap: 12,
  },
  alertText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: colors.error,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  quantityCard: {
    backgroundColor: colors.backgroundAlt,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quantityValue: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  lowStockText: {
    color: colors.error,
  },
  stockBar: {
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 12,
  },
  stockFill: {
    height: '100%',
    borderRadius: 4,
  },
  thresholdText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  adjustmentCard: {
    backgroundColor: colors.backgroundAlt,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  adjustmentInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    backgroundColor: colors.background,
    color: colors.text,
    marginBottom: 12,
  },
  adjustmentButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  adjustmentButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  addButton: {
    backgroundColor: colors.success,
  },
  removeButton: {
    backgroundColor: colors.orange,
  },
  adjustmentButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
  infoCard: {
    backgroundColor: colors.backgroundAlt,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoLabel: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  totalValue: {
    color: colors.primary,
    fontSize: 18,
  },
  expiryText: {
    color: colors.warning,
  },
  dangerZone: {
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: colors.error + '20',
    gap: 8,
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.error,
  },
  bottomPadding: {
    height: 40,
  },
});
