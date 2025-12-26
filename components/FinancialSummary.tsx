import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { colors } from '../styles/commonStyles';
import { supabase } from '../config';
import { useAuth } from '../hooks/useAuth';
import Icon from './Icon';
import { useFocusEffect } from 'expo-router';

interface FinancialSummaryData {
  revenue: number;
  expenses: number;
  monthlyprofit: number;
  monthlyprofitmargin: number;
  weeklyrevenue: number;
  weeklyexpenses: number;
  weeklyprofit: number;
  weeklyprofitmargin: number;
  quarterlyprofitmargin: number; // CORRECTION : Champ manquant
  yearlyprofitmargin: number; // CORRECTION : Champ manquant
}

export default function FinancialSummary() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<FinancialSummaryData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchFinancialSummary = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_dashboard_financial_summary', {
        p_user_id: user.id,
      });

      if (error) throw error;
      setSummary(data as FinancialSummaryData);
    } catch (error: any) {
      console.error("Erreur chargement résumé financier:", error);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      fetchFinancialSummary();
    }, [fetchFinancialSummary])
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={styles.loadingText}>Chargement du résumé financier...</Text>
      </View>
    );
  }

  if (!summary) {
    return (
      <View style={styles.errorContainer}>
        <Icon name="alert-circle-outline" size={24} color={colors.error} />
        <Text style={styles.errorText}>Impossible de charger le résumé financier.</Text>
      </View>
    );
  }

  const getProfitColor = (value: number) => {
    if (value > 0) return colors.success;
    if (value < 0) return colors.error;
    return colors.textSecondary;
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Résumé Financier</Text>
      <View style={styles.summaryGrid}>
        <View style={styles.summaryCard}>
          <Text style={styles.cardLabel}>Revenus (Mois)</Text>
          <Text style={styles.cardValue}>{summary.revenue.toLocaleString()} CFA</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.cardLabel}>Dépenses (Mois)</Text>
          <Text style={styles.cardValue}>{summary.expenses.toLocaleString()} CFA</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.cardLabel}>Profit (Mois)</Text>
          <Text style={[styles.cardValue, { color: getProfitColor(summary.monthlyprofit) }]}>
            {summary.monthlyprofit.toLocaleString()} CFA
          </Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.cardLabel}>Marge (Mois)</Text>
          <Text style={[styles.cardValue, { color: getProfitColor(summary.monthlyprofitmargin || 0) }]}>
            {(summary.monthlyprofitmargin || 0).toFixed(1)}%
          </Text>
        </View>
        {/* NOUVEAU : Ajout de la carte pour la marge trimestrielle */}
        <View style={styles.summaryCard}>
          <Text style={styles.cardLabel}>Marge (Trimestre)</Text>
          <Text style={[styles.cardValue, { color: getProfitColor(summary.quarterlyprofitmargin || 0) }]}>
            {(summary.quarterlyprofitmargin || 0).toFixed(1)}%
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: colors.backgroundAlt, borderRadius: 12, padding: 20, margin: 20, marginBottom: 0, borderWidth: 1, borderColor: colors.border },
  title: { fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: 16 },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12 },
  summaryCard: { width: '48%', backgroundColor: colors.background, borderRadius: 8, padding: 12, borderWidth: 1, borderColor: colors.border },
  cardLabel: { fontSize: 12, color: colors.textSecondary, marginBottom: 4 },
  cardValue: { fontSize: 16, fontWeight: '600', color: colors.text },
  loadingContainer: { alignItems: 'center', justifyContent: 'center', padding: 20, margin: 20, backgroundColor: colors.backgroundAlt, borderRadius: 12, borderWidth: 1, borderColor: colors.border },
  loadingText: { marginTop: 8, fontSize: 14, color: colors.textSecondary },
  errorContainer: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.error + '10', borderRadius: 12, padding: 16, margin: 20, marginBottom: 0, borderWidth: 1, borderColor: colors.error },
  errorText: { fontSize: 14, color: colors.error },
});
