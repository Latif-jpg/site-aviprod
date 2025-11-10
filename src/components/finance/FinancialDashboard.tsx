import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFinancialAdvisor } from '../../intelligence/agents/FinancialAdvisor';
import { colors } from '../../../styles/commonStyles';

// Interfaces pour les données financières (copiées de FinancialAdvisor.ts pour la clarté)
interface Transaction {
  id: string;
  type: 'revenue' | 'expense';
  category: string;
  montant: number;
  description: string;
  date: string;
  farm_id: string;
}

interface ProfitabilityAnalysis {
  total_revenue: number;
  total_expenses: number;
  net_profit: number;
  profit_margin_percent: number;
  roi: number;
  trend: 'improving' | 'stable' | 'declining';
  profitability_score: number;
  breakdown_by_category: Record<string, number>;
}

interface AnomalyDetection {
  detected_anomalies: Array<{
    type: 'expense_spike' | 'revenue_drop' | 'unusual_frequency';
    category: string;
    amount: number;
    expected_amount: number;
    deviation_percent: number;
    severity: 'low' | 'medium' | 'high';
    explanation: string;
  }>;
  total_anomalies: number;
}

interface CashFlowForecast {
  current_balance: number;
  forecast_30_days: number;
  forecast_60_days: number;
  forecast_90_days: number;
  risk_level: 'safe' | 'warning' | 'critical';
  expected_inflows: number;
  expected_outflows: number;
  recommendations: string[];
}

interface TaxOptimization {
  estimated_taxable_income: number;
  potential_deductions: Array<{
    category: string;
    amount: number;
    description: string;
  }>;
  tax_saving_opportunities: string[];
  next_declaration_reminder: string;
}

interface InvestmentRecommendations {
  priority_investments: Array<{
    category: string;
    estimated_cost: number;
    expected_roi: number;
    payback_period_months: number;
    priority_score: number;
    justification: string;
  }>;
  budget_available: number;
}

interface FinancialAnalysisResult {
  profitability: ProfitabilityAnalysis;
  anomalies: AnomalyDetection;
  cashFlow: CashFlowForecast;
  taxOptimization: TaxOptimization;
  investments: InvestmentRecommendations;
}

const FinancialDashboard: React.FC = () => {
  const { analyzeFinances } = useFinancialAdvisor();
  const [isLoading, setIsLoading] = useState(false);
  const [financialData, setFinancialData] = useState<FinancialAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'quarter' | 'year'>('month');

  // TODO: Remplacer 'farmId' par l'ID réel de l'exploitation de l'utilisateur
  const FARM_ID = 'user_farm_id_example'; 

  useEffect(() => {
    fetchFinancialData();
  }, [selectedPeriod]);

  const fetchFinancialData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await analyzeFinances(FARM_ID, selectedPeriod);
      if (data) {
        setFinancialData(data);
      } else {
        setError('Impossible de récupérer les données financières.');
      }
    } catch (err) {
      console.error('Erreur lors de la récupération des données financières:', err);
      setError("Une erreur est survenue lors de l'analyse financière.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && !financialData) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Analyse financière en cours...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={48} color={colors.danger} />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchFinancialData}>
          <Text style={styles.retryButtonText}>Réessayer</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!financialData) {
    return (
      <View style={styles.emptyState}>
        <Ionicons name="cash-outline" size={48} color={colors.textSecondary} />
        <Text style={styles.emptyText}>Aucune donnée financière disponible.</Text>
        <Text style={styles.emptySubtext}>Veuillez vous assurer que des transactions ont été enregistrées.</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchFinancialData}>
          <Text style={styles.retryButtonText}>Charger les données</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const getTrendIcon = (trend: 'improving' | 'stable' | 'declining') => {
    if (trend === 'improving') return 'trending-up';
    if (trend === 'declining') return 'trending-down';
    return 'remove';
  };

  const getTrendColor = (trend: 'improving' | 'stable' | 'declining') => {
    if (trend === 'improving') return colors.success;
    if (trend === 'declining') return colors.danger;
    return colors.textSecondary;
  };

  const getRiskColor = (risk: 'safe' | 'warning' | 'critical') => {
    if (risk === 'critical') return colors.danger;
    if (risk === 'warning') return colors.warning;
    return colors.success;
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Conseiller Financier</Text>
        <View style={styles.periodSelector}>
          <PeriodButton label="Semaine" period="week" selected={selectedPeriod} onPress={setSelectedPeriod} />
          <PeriodButton label="Mois" period="month" selected={selectedPeriod} onPress={setSelectedPeriod} />
          <PeriodButton label="Trimestre" period="quarter" selected={selectedPeriod} onPress={setSelectedPeriod} />
          <PeriodButton label="Année" period="year" selected={selectedPeriod} onPress={setSelectedPeriod} />
        </View>
      </View>

      {/* Section Rentabilité */}
      <SectionCard title="Analyse de Rentabilité" icon="stats-chart-outline">
        <View style={styles.profitabilityGrid}>
          <DataPoint label="Revenus Totaux" value={`${financialData.profitability.total_revenue.toFixed(2)} FCFA`} />
          <DataPoint label="Dépenses Totales" value={`${financialData.profitability.total_expenses.toFixed(2)} FCFA`} />
          <DataPoint label="Bénéfice Net" value={`${financialData.profitability.net_profit.toFixed(2)} FCFA`} isPrimary={true} />
          <DataPoint label="Marge Bénéficiaire" value={`${financialData.profitability.profit_margin_percent.toFixed(1)}%`} />
          <DataPoint label="ROI" value={`${financialData.profitability.roi.toFixed(1)}%`} />
          <View style={styles.trendContainer}>
            <Ionicons name={getTrendIcon(financialData.profitability.trend)} size={20} color={getTrendColor(financialData.profitability.trend)} />
            <Text style={[styles.trendText, { color: getTrendColor(financialData.profitability.trend) }]}>
              {financialData.profitability.trend === 'improving' ? 'En amélioration' : financialData.profitability.trend === 'declining' ? 'En déclin' : 'Stable'}
            </Text>
          </View>
        </View>
        <Text style={styles.subSectionTitle}>Répartition des Dépenses par Catégorie:</Text>
        {Object.entries(financialData.profitability.breakdown_by_category).map(([category, amount]) => (
          <Text key={category} style={styles.categoryItem}>
            • {category}: {amount.toFixed(2)} FCFA
          </Text>
        ))}
      </SectionCard>

      {/* Section Détection d'Anomalies */}
      <SectionCard title="Détection d'Anomalies" icon="alert-circle-outline">
        {financialData.anomalies.total_anomalies === 0 ? (
          <Text style={styles.noAnomalyText}>Aucune anomalie détectée. Tout est sous contrôle !</Text>
        ) : (
          financialData.anomalies.detected_anomalies.map((anomaly, index) => (
            <View key={index} style={[styles.anomalyCard, { borderColor: getRiskColor(anomaly.severity === 'high' ? 'critical' : anomaly.severity === 'medium' ? 'warning' : 'safe') }]}>
              <View style={styles.anomalyHeader}>
                <Ionicons name="warning-outline" size={20} color={getRiskColor(anomaly.severity === 'high' ? 'critical' : anomaly.severity === 'medium' ? 'warning' : 'safe')} />
                <Text style={styles.anomalyTitle}>{anomaly.type === 'expense_spike' ? 'Pic de Dépense' : anomaly.type === 'revenue_drop' ? 'Chute de Revenu' : 'Fréquence Inhabituelle'}</Text>
                <Text style={[styles.anomalySeverity, { color: getRiskColor(anomaly.severity === 'high' ? 'critical' : anomaly.severity === 'medium' ? 'warning' : 'safe') }]}>
                  {anomaly.severity.toUpperCase()}
                </Text>
              </View>
              <Text style={styles.anomalyDescription}>{anomaly.explanation}</Text>
              <Text style={styles.anomalyDetails}>Catégorie: {anomaly.category} | Montant: {anomaly.amount.toFixed(2)} FCFA (Attendu: {anomaly.expected_amount.toFixed(2)} FCFA)</Text>
            </View>
          ))
        )}
      </SectionCard>

      {/* Section Prévision de Cash-Flow */}
      <SectionCard title="Prévision de Cash-Flow" icon="wallet-outline">
        <View style={styles.cashFlowGrid}>
          <DataPoint label="Solde Actuel" value={`${financialData.cashFlow.current_balance.toFixed(2)} FCFA`} isPrimary={true} />
          <DataPoint label="Prévision 30 Jours" value={`${financialData.cashFlow.forecast_30_days.toFixed(2)} FCFA`} />
          <DataPoint label="Prévision 60 Jours" value={`${financialData.cashFlow.forecast_60_days.toFixed(2)} FCFA`} />
          <DataPoint label="Prévision 90 Jours" value={`${financialData.cashFlow.forecast_90_days.toFixed(2)} FCFA`} />
        </View>
        <View style={styles.riskBadge}>
          <Ionicons name="shield-checkmark-outline" size={18} color={getRiskColor(financialData.cashFlow.risk_level)} />
          <Text style={[styles.riskText, { color: getRiskColor(financialData.cashFlow.risk_level) }]}>
            Niveau de Risque: {financialData.cashFlow.risk_level.toUpperCase()}
          </Text>
        </View>
        <Text style={styles.subSectionTitle}>Recommandations:</Text>
        {financialData.cashFlow.recommendations.map((rec, index) => (
          <Text key={index} style={styles.recommendationItem}>• {rec}</Text>
        ))}
      </SectionCard>

      {/* Section Optimisation Fiscale */}
      <SectionCard title="Optimisation Fiscale" icon="calculator-outline">
        <DataPoint label="Revenu Imposable Estimé" value={`${financialData.taxOptimization.estimated_taxable_income.toFixed(2)} FCFA`} isPrimary={true} />
        <Text style={styles.subSectionTitle}>Déductions Potentielles:</Text>
        {financialData.taxOptimization.potential_deductions.length === 0 ? (
          <Text style={styles.noAnomalyText}>Aucune déduction potentielle identifiée pour le moment.</Text>
        ) : (
          financialData.taxOptimization.potential_deductions.map((deduction, index) => (
            <Text key={index} style={styles.categoryItem}>
              • {deduction.description}: {deduction.amount.toFixed(2)} FCFA
            </Text>
          ))
        )}
        <Text style={styles.subSectionTitle}>Opportunités d'Économie Fiscale:</Text>
        {financialData.taxOptimization.tax_saving_opportunities.map((opp, index) => (
          <Text key={index} style={styles.recommendationItem}>• {opp}</Text>
        ))}
        <Text style={styles.reminderText}>Prochain rappel de déclaration: {financialData.taxOptimization.next_declaration_reminder}</Text>
      </SectionCard>

      {/* Section Recommandations d'Investissement */}
      <SectionCard title="Recommandations d'Investissement" icon="trending-up-outline">
        <DataPoint label="Budget Disponible" value={`${financialData.investments.budget_available.toFixed(2)} FCFA`} isPrimary={true} />
        {financialData.investments.priority_investments.length === 0 ? (
          <Text style={styles.noAnomalyText}>Aucune recommandation d'investissement prioritaire pour le moment.</Text>
        ) : (
          financialData.investments.priority_investments.map((investment, index) => (
            <View key={index} style={styles.investmentCard}>
              <Text style={styles.investmentTitle}>{investment.category}</Text>
              <Text style={styles.investmentJustification}>{investment.justification}</Text>
              <View style={styles.investmentDetails}>
                <Text style={styles.investmentDetailItem}>Coût Estimé: {investment.estimated_cost.toFixed(2)} FCFA</Text>
                <Text style={styles.investmentDetailItem}>ROI Attendu: {investment.expected_roi}%</Text>
                <Text style={styles.investmentDetailItem}>Retour sur Investissement: {investment.payback_period_months} mois</Text>
              </View>
              <View style={styles.priorityBadge}>
                <Text style={styles.priorityBadgeText}>Priorité: {investment.priority_score}</Text>
              </View>
            </View>
          ))
        )}
      </SectionCard>
    </ScrollView>
  );
};

// Composants utilitaires pour la clarté
const SectionCard: React.FC<{ title: string; icon: keyof typeof Ionicons.glyphMap; children: React.ReactNode }> = ({ title, icon, children }) => (
  <View style={styles.sectionCard}>
    <View style={styles.sectionHeader}>
      <Ionicons name={icon} size={24} color={colors.primary} />
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
    <View style={styles.sectionContent}>
      {children}
    </View>
  </View>
);

const DataPoint: React.FC<{ label: string; value: string; isPrimary?: boolean }> = ({ label, value, isPrimary }) => (
  <View style={styles.dataPoint}>
    <Text style={styles.dataPointLabel}>{label}</Text>
    <Text style={[styles.dataPointValue, isPrimary && styles.dataPointValuePrimary]}>{value}</Text>
  </View>
);

const PeriodButton: React.FC<{
  label: string;
  period: 'week' | 'month' | 'quarter' | 'year';
  selected: 'week' | 'month' | 'quarter' | 'year';
  onPress: (period: 'week' | 'month' | 'quarter' | 'year') => void;
}> = ({ label, period, selected, onPress }) => (
  <TouchableOpacity
    style={[styles.periodButton, selected === period && styles.periodButtonSelected]}
    onPress={() => onPress(period)}
  >
    <Text style={[styles.periodButtonText, selected === period && styles.periodButtonTextSelected]}>
      {label}
    </Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: colors.textPrimary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: colors.danger,
    marginTop: 10,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 20,
    backgroundColor: colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  retryButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginTop: 10,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 5,
    textAlign: 'center',
  },
  header: {
    marginBottom: 20,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 10,
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: colors.cardBackground,
    borderRadius: 10,
    padding: 4,
  },
  periodButton: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 8,
  },
  periodButtonSelected: {
    backgroundColor: colors.primary,
  },
  periodButtonText: {
    color: colors.textSecondary,
    fontWeight: '600',
  },
  periodButtonTextSelected: {
    color: colors.white,
  },
  sectionCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginLeft: 10,
  },
  sectionContent: {
    // Styles pour le contenu de la section
  },
  profitabilityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  dataPoint: {
    width: '48%', // Pour deux colonnes
    marginBottom: 10,
    backgroundColor: colors.background,
    padding: 10,
    borderRadius: 8,
  },
  dataPointLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  dataPointValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  dataPointValuePrimary: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    width: '100%',
    justifyContent: 'center',
  },
  trendText: {
    marginLeft: 5,
    fontSize: 14,
    fontWeight: '600',
  },
  subSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginTop: 15,
    marginBottom: 10,
  },
  categoryItem: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 5,
    marginLeft: 10,
  },
  noAnomalyText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 10,
  },
  anomalyCard: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    backgroundColor: colors.background,
  },
  anomalyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  anomalyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginLeft: 8,
    flex: 1,
  },
  anomalySeverity: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  anomalyDescription: {
    fontSize: 14,
    color: colors.textPrimary,
    marginBottom: 5,
  },
  anomalyDetails: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  cashFlowGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  riskBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.background,
    marginBottom: 15,
  },
  riskText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: 'bold',
  },
  recommendationItem: {
    fontSize: 14,
    color: colors.textPrimary,
    marginBottom: 5,
    marginLeft: 10,
  },
  reminderText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 15,
    fontStyle: 'italic',
  },
  investmentCard: {
    backgroundColor: colors.background,
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  investmentTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 5,
  },
  investmentJustification: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 10,
  },
  investmentDetails: {
    marginBottom: 10,
  },
  investmentDetailItem: {
    fontSize: 13,
    color: colors.textPrimary,
    marginBottom: 3,
  },
  priorityBadge: {
    backgroundColor: colors.warning,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 15,
    alignSelf: 'flex-start',
  },
  priorityBadgeText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
});

export default FinancialDashboard;
