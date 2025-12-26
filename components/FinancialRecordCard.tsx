import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { FinancialRecord } from '../types';
import { colors } from '../styles/commonStyles';
import Icon from './Icon';

interface FinancialRecordCardProps {
  record: FinancialRecord;
  onEdit: (record: FinancialRecord) => void;
  onDelete: (recordId: string) => void;
}

const getCategoryIcon = (category: string): string => {
  const cat = category.toLowerCase();
  if (cat.includes('vente') || cat.includes('revenu')) return 'cash-outline';
  if (cat.includes('aliment')) return 'fast-food-outline';
  if (cat.includes('médicament')) return 'medkit-outline';
  if (cat.includes('équipement')) return 'build-outline';
  if (cat.includes('main d\'œuvre') || cat.includes('salaire')) return 'people-outline';
  if (cat.includes('transport')) return 'car-outline';
  if (cat.includes('facture') || cat.includes('électricité') || cat.includes('eau')) return 'receipt-outline';
  if (cat.includes('service')) return 'construct-outline';
  if (cat.includes('partenariat') || cat.includes('investissement')) return 'business-outline';
  if (cat.includes('autre')) return 'apps-outline';
  return 'help-circle-outline';
};

export default function FinancialRecordCard({ record, onEdit, onDelete }: FinancialRecordCardProps) {
  const isIncome = record.type === 'income';
  const amountColor = isIncome ? colors.success : colors.error;
  const iconColor = isIncome ? colors.success : colors.error;

  return (
    <View style={styles.card}>
      <View style={styles.iconContainer}>
        <Icon name={getCategoryIcon(record.category) as any} size={24} color={iconColor} />
      </View>
      <View style={styles.detailsContainer}>
        <Text style={styles.category}>{record.category}</Text>
        <Text style={styles.description} numberOfLines={1}>{record.description}</Text>
        <Text style={styles.date}>{new Date(record.record_date).toLocaleDateString('fr-FR')}</Text>
      </View>
      <View style={styles.actionsContainer}>
        <View style={styles.actionButtons}>
          <TouchableOpacity onPress={() => onEdit(record)} style={styles.actionButton}>
            <Icon name="create-outline" size={20} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onDelete(record.id)} style={styles.actionButton}>
            <Icon name="trash-outline" size={20} color={colors.error} />
          </TouchableOpacity>
        </View>
        <Text style={[styles.amount, { color: amountColor }]}>
          {isIncome ? '+' : '-'} {record.amount.toLocaleString()} CFA
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: colors.backgroundAlt,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  detailsContainer: {
    flex: 1,
  },
  category: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 2,
  },
  description: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  date: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  actionsContainer: {
    alignItems: 'flex-end',
    marginLeft: 8,
  },
  amount: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    padding: 4,
  },
});