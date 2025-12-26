import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors } from '../styles/commonStyles';
import { FinancialRecord } from '../types';
import Icon from '../components/Icon'; // CORRECTION: Le chemin est maintenant correct

interface FinancialRecordCardProps {
  record: FinancialRecord;
  onEdit: () => void;
  onDelete: () => void;
}

export default function FinancialRecordCard({ record, onEdit, onDelete }: FinancialRecordCardProps) {
  const isIncome = record.type === 'income';
  const amountColor = isIncome ? colors.success : colors.error;
  // Revenus: flèche vers le bas en vert. Dépenses: flèche vers le haut en rouge.
  const iconName = isIncome ? 'arrow-down-outline' : 'arrow-up-outline';

  return (
    <View style={styles.card}>
      <View style={[styles.iconContainer, { backgroundColor: amountColor + '20' }]}>
        <Icon name={iconName} size={24} color={amountColor} />
      </View>
      <View style={styles.detailsContainer}>
        <Text style={styles.description} numberOfLines={1}>{record.description || 'Transaction'}</Text>
        <Text style={styles.category}>{record.category || 'Non classé'}</Text>
      </View>
      <View style={styles.amountContainer}>
        <Text style={[styles.amount, { color: amountColor }]}>
          {isIncome ? '+' : '-'} {record.amount.toLocaleString()} CFA
        </Text>
        <View style={styles.dateAndActions}>
          <Text style={styles.date}>
            {new Date(record.record_date).toLocaleDateString('fr-FR')}
          </Text>
          <TouchableOpacity style={styles.actionButton} onPress={onEdit}>
            <Icon name="create-outline" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={onDelete}>
            <Icon name="trash-outline" size={18} color={colors.error} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff', // Fond blanc propre
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0', // Bordure subtile
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute', // Positionnement absolu pour un look moderne
    top: 16,
    left: 16,
  },
  detailsContainer: {
    flex: 1,
    marginLeft: 60, // Espace pour l'icône
    marginBottom: 16, // Espace avant la date
  },
  amountContainer: {
    alignItems: 'flex-end',
    marginLeft: 60, // Aligné avec les détails
  },
  dateAndActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  description: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  category: {
    fontSize: 12,
    color: colors.textSecondary,
    backgroundColor: '#f1f5f9', // Fond de badge plus doux
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  amount: {
    fontSize: 16,
    fontWeight: '700',
  },
  date: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  actionButton: {
    padding: 4,
  },
});