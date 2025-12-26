import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../styles/commonStyles';
import { FinancialRecord } from '../types';
import Icon from '../components/Icon';

interface BreakdownProps {
  title: string;
  records: FinancialRecord[];
  type: 'income' | 'expense';
}

const BAR_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#64748b'];

export default function FinancialBreakdown({ title, records, type }: BreakdownProps) {
  const { breakdown, total, aiInsight } = useMemo(() => {
    if (records.length === 0) {
      return { breakdown: [], total: 0, aiInsight: null };
    }

    const categoryTotals: { [key: string]: number } = {};
    let totalAmount = 0;

    records.forEach(record => {
      const category = record.category || 'Non classé';
      categoryTotals[category] = (categoryTotals[category] || 0) + record.amount;
      totalAmount += record.amount;
    });

    const breakdownData = Object.entries(categoryTotals)
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: (amount / totalAmount) * 100,
      }))
      .sort((a, b) => b.amount - a.amount);

    // Génération de l'insight IA
    let insightMessage = null;
    if (breakdownData.length > 0) {
      const topCategory = breakdownData[0];
      if (type === 'expense' && topCategory.percentage > 50) {
        insightMessage = `La catégorie '${topCategory.category}' représente plus de la moitié de vos dépenses. C'est un point clé à surveiller pour optimiser vos coûts.`;
      } else if (type === 'income' && topCategory.percentage > 70) {
        insightMessage = `Votre principale source de revenus, '${topCategory.category}', est très solide. Envisagez de diversifier avec d'autres sources pour plus de sécurité.`;
      } else if (breakdownData.length > 3) {
        insightMessage = `Vos ${type === 'expense' ? 'dépenses' : 'revenus'} sont bien diversifiés sur plusieurs catégories, ce qui est un signe de bonne gestion.`;
      }
    }

    return { breakdown: breakdownData, total: totalAmount, aiInsight: insightMessage };
  }, [records, type]);

  if (records.length === 0) {
    return null; // Ne rien afficher si pas de données
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>

      {/* Barre de répartition visuelle */}
      <View style={styles.breakdownBar}>
        {breakdown.map((item, index) => (
          <View
            key={item.category}
            style={{
              width: `${item.percentage}%`,
              backgroundColor: BAR_COLORS[index % BAR_COLORS.length],
            }}
          />
        ))}
      </View>

      {/* Légende des catégories */}
      <View style={styles.legendContainer}>
        {breakdown.slice(0, 4).map((item, index) => (
          <View key={item.category} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: BAR_COLORS[index % BAR_COLORS.length] }]} />
            <Text style={styles.legendText}>
              {item.category} ({item.percentage.toFixed(0)}%)
            </Text>
          </View>
        ))}
      </View>

      {/* Insight IA */}
      {aiInsight && (
        <View style={styles.aiInsight}>
          <Icon name="bulb" size={20} color={colors.primary} />
          <Text style={styles.aiInsightText}>{aiInsight}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  breakdownBar: {
    flexDirection: 'row',
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: colors.border,
    marginBottom: 16,
  },
  legendContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 16,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 13, fontWeight: '500', color: colors.textSecondary },
  aiInsight: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: colors.primary + '10',
    padding: 12,
    borderRadius: 8,
  },
  aiInsightText: { fontSize: 14, color: colors.primary, flex: 1, lineHeight: 20 },
});