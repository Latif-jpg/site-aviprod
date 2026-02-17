// src/intelligence/ui/FinancialAdvisorDashboard.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, commonStyles } from '../../../styles/commonStyles';
import Icon from '../../../components/Icon';
import { useFinancialAdvisor } from '../agents/FinancialAdvisor';
import { usePremiumFeature } from '../../../hooks/usePremiumFeature';
import { useProfile } from '../../../contexts/ProfileContext';
import { useSubscription } from '../../../contexts/SubscriptionContext';
import SmartTunnelModal from '../../../components/SmartTunnelModal';

const { width } = Dimensions.get('window');

interface FinancialAdvisorDashboardProps {
  farmId: string;
  onClose?: () => void;
  summary?: {
    revenue: number;
    expenses: number;
    profit: number;
    profitMargin: number;
  };
  records?: any[];
  period?: string;
  budgetStatus?: any;
  onPeriodChange?: (period: any) => void;
}

interface AnalysisResult {
  profitability: {
    total_revenue: number;
    total_expenses: number;
    net_profit: number;
    profit_margin_percent: number;
    roi: number;
    trend: 'improving' | 'stable' | 'declining';
    profitability_score: number;
    breakdown_by_category: Record<string, number>;
  };
  anomalies: {
    detected_anomalies: Array<{
      type: 'expense_spike' | 'revenue_drop' | 'unusual_pattern';
      category: string;
      amount: number;
      expected_amount: number;
      deviation_percent: number;
      severity: 'low' | 'medium' | 'high';
      explanation: string;
    }>;
    total_anomalies: number;
  };
  cashFlow: {
    current_balance: number;
    forecast_30_days: number;
    forecast_60_days: number;
    forecast_90_days: number;
    risk_level: 'safe' | 'warning' | 'critical';
    expected_inflows: number;
    expected_outflows: number;
    recommendations: string[];
  };
  taxOptimization: {
    estimated_taxable_income: number;
    potential_deductions: Array<{
      category: string;
      amount: number;
      description: string;
    }>;
    tax_saving_opportunities: string[];
    next_declaration_reminder: string;
  };
  investments: {
    priority_investments: Array<{
      category: string;
      estimated_cost: number;
      expected_roi: number;
      payback_period_months: number;
      priority_score: number;
      justification: string;
    }>;
    budget_available: number;
  };
}

export default function FinancialAdvisorDashboard({
  farmId,
  onClose,
  summary,
  records,
  period: initialPeriod,
  budgetStatus,
  onPeriodChange
}: FinancialAdvisorDashboardProps) {
  const { analyzeFinances } = useFinancialAdvisor();
  // Correction: Le type period doit correspondre aux options disponibles
  const [period, setPeriod] = useState<'week' | 'month' | 'quarter' | 'semester' | 'year'>((initialPeriod as any) || 'month');
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { requestAccess, showTunnel, tunnelProps, isLoading: accessLoading, isReady } = usePremiumFeature({
    featureKey: 'financial_advisor',
    featureName: 'Conseiller Financier IA',
    cost: 10,
  });

  // DEBUG contexts
  const { profile } = useProfile();
  const { subscription } = useSubscription();

  useEffect(() => {
    if (isReady) {
      loadAnalysis();
    }
  }, [farmId, period, isReady]);

  useEffect(() => {
    if (initialPeriod) setPeriod(initialPeriod as any);
  }, [initialPeriod]);

  const loadAnalysis = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // --- PROTECTION PREMIUM ---
      const access = await requestAccess();
      if (!access.granted) {
        setLoading(false);
        return;
      }

      const result = await analyzeFinances(farmId, period);
      if (result) {
        setAnalysis(result);
      } else {
        setError('Impossible d\'analyser les finances');
      }
    } catch (err: any) {
      console.error('Erreur analyse financière:', err);
      setError(err.message || 'Erreur lors de l\'analyse');
    } finally {
      setLoading(false);
    }
  }, [farmId, period, analyzeFinances]);

  const getTrendColor = useCallback((trend: string) => {
    switch (trend) {
      case 'improving': return '#10996E';
      case 'stable': return '#FF9800';
      case 'declining': return '#E53935';
      default: return colors.textSecondary;
    }
  }, []);

  const getRiskColor = useCallback((risk: string) => {
    switch (risk) {
      case 'safe': return '#10996E';
      case 'warning': return '#FF9800';
      case 'critical': return '#E53935';
      default: return colors.textSecondary;
    }
  }, []);

  const getSeverityColor = useCallback((severity: string) => {
    switch (severity) {
      case 'low': return '#4CAF50';
      case 'medium': return '#FF9800';
      case 'high': return '#E53935';
      default: return colors.textSecondary;
    }
  }, []);

  const formatCurrency = useCallback((amount: number) => {
    return amount.toLocaleString('fr-FR') + ' CFA';
  }, []);

  // OPTIMISATION: Décomposition en sous-composants
  const sections = useMemo(() => {
    if (!analysis) return [];

    // Recalcul de la balance actuelle selon la logique utilisateur : Budget Restant + Revenus
    let cashFlowData = { ...analysis.cashFlow };
    if (budgetStatus && summary) {
      const remainingBudget = Number(budgetStatus.remaining_budget) || 0;
      const revenue = Number(summary.revenue) || 0;
      cashFlowData.current_balance = remainingBudget + revenue;
    }

    const data = [
      { type: 'profitability', data: analysis.profitability },
      analysis.anomalies.total_anomalies > 0 && { type: 'anomalies', data: analysis.anomalies },
      { type: 'cashFlow', data: cashFlowData },
      { type: 'tax', data: analysis.taxOptimization },
      { type: 'investments', data: analysis.investments },
    ].filter(Boolean); // Filtrer les sections non affichées (ex: anomalies s'il n'y en a pas)

    return data as Array<{ type: string; data: any }>;
  }, [analysis, budgetStatus, summary]);

  const renderSection = useCallback(({ item }: { item: { type: string; data: any } }) => {
    switch (item.type) {
      case 'profitability':
        return <ProfitabilitySection
          data={item.data}
          formatCurrency={formatCurrency}
          getTrendColor={getTrendColor}
        />;
      case 'anomalies':
        return <AnomaliesSection
          data={item.data}
          formatCurrency={formatCurrency}
          getSeverityColor={getSeverityColor}
        />;
      case 'cashFlow':
        return <CashFlowSection
          data={item.data}
          formatCurrency={formatCurrency}
          getRiskColor={getRiskColor}
        />;
      case 'tax':
        return <TaxSection data={item.data} formatCurrency={formatCurrency} />;
      case 'investments':
        return <InvestmentsSection data={item.data} formatCurrency={formatCurrency} />;
      default:
        return null;
    }
  }, [formatCurrency, getTrendColor, getSeverityColor, getRiskColor]);

  const renderHeader = () => (
    <>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {onClose && (
            <TouchableOpacity onPress={onClose} style={styles.backButton}>
              <Icon name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
          )}
          <View>
            <Text style={styles.title}>Conseiller Financier</Text>
            <Text style={styles.subtitle}>Analyse intelligente avancée</Text>
          </View>
        </View>
        <TouchableOpacity onPress={loadAnalysis} style={styles.refreshButton}>
          <Icon name="refresh" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Period Selector */}
      <View style={styles.periodSelector}>
        {[
          { key: 'week', label: 'Semaine' },
          { key: 'month', label: 'Mois' },
          { key: 'quarter', label: 'Trimestre' },
          { key: 'semester', label: 'Semestre' },
          { key: 'year', label: 'Année' },
        ].map((periodOption) => (
          <TouchableOpacity
            key={periodOption.key}
            style={[
              styles.periodButton,
              period === periodOption.key && styles.periodButtonActive,
            ]}
            onPress={() => {
              setPeriod(periodOption.key as any);
              if (onPeriodChange) onPeriodChange(periodOption.key as any);
            }}
          >
            <Text style={[
              styles.periodButtonText,
              period === periodOption.key && styles.periodButtonTextActive,
            ]}>
              {periodOption.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </>
  );

  if (loading) {
    return (
      <SafeAreaView style={commonStyles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Analyse financière en cours...</Text>
          <Text style={styles.loadingSubtext}>
            Calcul rentabilité, détection anomalies, prévision cash-flow
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={commonStyles.container}>
        <View style={styles.errorContainer}>
          <Icon name="alert-circle" size={48} color={colors.error} />
          <Text style={styles.errorText}>Erreur d'analyse</Text>
          <Text style={styles.errorSubtext}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadAnalysis}>
            <Icon name="refresh" size={20} color={colors.white} />
            <Text style={styles.retryButtonText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!analysis) return null;

  // OPTIMISATION: Utilisation de FlatList au lieu de ScrollView
  return (
    <SafeAreaView style={commonStyles.container}>
      <FlatList
        data={sections}
        renderItem={renderSection}
        keyExtractor={(item) => item.type}
        ListHeaderComponent={renderHeader()}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollView}
        ListFooterComponent={<View style={styles.bottomPadding} />}
      />
      <SmartTunnelModal {...tunnelProps} />
    </SafeAreaView>
  );
}

// OPTIMISATION: Composant réutilisable pour les cartes de métriques
const MetricCard = ({ label, value, description, valueColor = colors.text }: { label: string, value: string, description?: string, valueColor?: string }) => (
  <View style={styles.metricCard}>
    <Text style={styles.metricLabel}>{label}</Text>
    <Text style={[styles.metricValue, { color: valueColor }]}>{value}</Text>
    {description && <Text style={styles.metricDescription}>{description}</Text>}
  </View>
);

// OPTIMISATION: Composant pour la section Rentabilité
const ProfitabilitySection = ({ data, formatCurrency, getTrendColor }: { data: AnalysisResult['profitability'], formatCurrency: (amount: number) => string, getTrendColor: (trend: string) => string }) => (
  <View style={styles.section}>
    <View style={styles.sectionHeader}>
      <Icon name="trending-up" size={24} color={colors.primary} />
      <Text style={styles.sectionTitle}>Analyse de Rentabilité</Text>
      <View style={[styles.scoreBadge, {
        backgroundColor: data.profitability_score > 70 ? '#10996E' :
          data.profitability_score > 50 ? '#FF9800' : '#E53935'
      }]}>
        <Text style={styles.scoreText}>{data.profitability_score}/100</Text>
      </View>
    </View>
    <View style={styles.profitGrid}>
      <MetricCard label="Revenus totaux" value={formatCurrency(data.total_revenue)} description="Total des entrées d'argent sur la période." />
      <MetricCard label="Dépenses totales" value={formatCurrency(data.total_expenses)} description="Total des sorties d'argent sur la période." />
      <MetricCard label="Profit net" value={formatCurrency(data.net_profit)} valueColor={data.net_profit >= 0 ? '#10996E' : '#E53935'} description="Différence entre les revenus et les dépenses." />
      <MetricCard label="Marge bénéficiaire" value={`${(data.profit_margin || 0).toFixed(1)}%`} valueColor={(data.profit_margin || 0) >= 15 ? '#10996E' : '#E53935'} description="Pourcentage du revenu qui est un profit." />
      <MetricCard label="ROI" value={`${data.roi.toFixed(1)}%`} valueColor={data.roi >= 20 ? '#10996E' : '#FF9800'} description="Retour sur investissement." />
      <MetricCard label="Tendance" value={data.trend.toUpperCase()} valueColor={getTrendColor(data.trend)} description="Évolution par rapport à la période précédente." />
    </View>
    {Object.keys(data.breakdown_by_category).length > 0 && (
      <View style={styles.breakdown}>
        <Text style={styles.breakdownTitle}>Répartition des dépenses</Text>
        {Object.entries(data.breakdown_by_category)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 5)
          .map(([category, amount]) => (
            <View key={category} style={styles.breakdownItem}>
              <Text style={styles.breakdownCategory}>{category}</Text>
              <Text style={styles.breakdownAmount}>{formatCurrency(amount)}</Text>
              <Text style={styles.breakdownPercent}>
                {((amount / data.total_expenses) * 100).toFixed(1)}%
              </Text>
            </View>
          ))}
      </View>
    )}
  </View>
);

// OPTIMISATION: Composant pour la section Anomalies
const AnomaliesSection = ({ data, formatCurrency, getSeverityColor }: { data: AnalysisResult['anomalies'], formatCurrency: (amount: number) => string, getSeverityColor: (severity: string) => string }) => (
  <View style={styles.section}>
    <View style={styles.sectionHeader}>
      <Icon name="warning" size={24} color={colors.error} />
      <Text style={styles.sectionTitle}>Anomalies Détectées</Text>
      <View style={styles.anomalyBadge}>
        <Text style={styles.anomalyText}>{data.total_anomalies}</Text>
      </View>
    </View>
    {data.detected_anomalies.map((anomaly, index) => (
      <View key={index} style={[styles.anomalyCard, { borderLeftColor: getSeverityColor(anomaly.severity) }]}>
        <View style={styles.anomalyHeader}>
          <Text style={styles.anomalyType}>
            {anomaly.type === 'expense_spike' ? '💸 Pic de dépenses' :
              anomaly.type === 'revenue_drop' ? '📉 Chute revenus' :
                '🔄 Pattern inhabituel'}
          </Text>
          <View style={[styles.severityBadge, { backgroundColor: getSeverityColor(anomaly.severity) }]}>
            <Text style={styles.severityText}>{anomaly.severity.toUpperCase()}</Text>
          </View>
        </View>
        <Text style={styles.anomalyCategory}>Catégorie: {anomaly.category}</Text>
        <View style={styles.anomalyDetails}>
          <Text style={styles.anomalyAmount}>Montant: {formatCurrency(anomaly.amount)}</Text>
          <Text style={styles.anomalyExpected}>Attendu: {formatCurrency(anomaly.expected_amount)}</Text>
          <Text style={styles.anomalyDeviation}>Écart: {anomaly.deviation_percent.toFixed(1)}%</Text>
        </View>
        <Text style={styles.anomalyExplanation}>{anomaly.explanation}</Text>
      </View>
    ))}
  </View>
);

// OPTIMISATION: Composant pour la section Cash-Flow
const CashFlowSection = ({ data, formatCurrency, getRiskColor }: { data: AnalysisResult['cashFlow'], formatCurrency: (amount: number) => string, getRiskColor: (risk: string) => string }) => (
  <View style={styles.section}>
    <View style={styles.sectionHeader}>
      <Icon name="cash" size={24} color={colors.primary} />
      <Text style={styles.sectionTitle}>Prévision Cash-Flow</Text>
      <View style={[styles.riskBadge, { backgroundColor: getRiskColor(data.risk_level) }]}>
        <Text style={styles.riskText}>{data.risk_level.toUpperCase()}</Text>
      </View>
    </View>
    <View style={styles.cashFlowGrid}>
      <MetricCard
        label="Balance actuelle"
        value={formatCurrency(data.current_balance)}
        valueColor={data.current_balance >= 0 ? '#10996E' : '#E53935'}
        description="Budget restant + Revenus"
      />
      <MetricCard label="Entrées (30j)" value={formatCurrency(data.expected_inflows)} valueColor="#10996E" description="Revenus estimés" />
      <MetricCard label="Sorties (30j)" value={formatCurrency(data.expected_outflows)} valueColor="#E53935" description="Dépenses estimées" />
      <MetricCard label="Prévision 30j" value={formatCurrency(data.forecast_30_days)} valueColor={data.forecast_30_days >= 0 ? '#10996E' : '#E53935'} />
      <MetricCard label="Prévision 60j" value={formatCurrency(data.forecast_60_days)} valueColor={data.forecast_60_days >= 0 ? '#10996E' : '#E53935'} />
      <MetricCard label="Prévision 90j" value={formatCurrency(data.forecast_90_days)} valueColor={data.forecast_90_days >= 0 ? '#10996E' : '#E53935'} />
    </View>
    {data.recommendations.length > 0 && (
      <View style={styles.recommendations}>
        <Text style={styles.recommendationsTitle}>💡 Recommandations</Text>
        {data.recommendations.map((rec, index) => (
          <Text key={index} style={styles.recommendation}>• {rec}</Text>
        ))}
      </View>
    )}
  </View>
);

// OPTIMISATION: Composant pour la section Fiscale
const TaxSection = ({ data, formatCurrency }: { data: AnalysisResult['taxOptimization'], formatCurrency: (amount: number) => string }) => (
  <View style={styles.section}>
    <View style={styles.sectionHeader}>
      <Icon name="document-text" size={24} color={colors.primary} />
      <Text style={styles.sectionTitle}>Optimisation Fiscale</Text>
    </View>
    <View style={styles.taxGrid}>
      <MetricCard label="Revenus imposables" value={formatCurrency(data.estimated_taxable_income)} />
      <MetricCard label="Prochaine déclaration" value={data.next_declaration_reminder} />
    </View>
    {data.potential_deductions.length > 0 && (
      <View style={styles.deductions}>
        <Text style={styles.deductionsTitle}>Déductions potentielles</Text>
        {data.potential_deductions.map((deduction, index) => (
          <View key={index} style={styles.deductionItem}>
            <Text style={styles.deductionCategory}>{deduction.category}</Text>
            <Text style={styles.deductionAmount}>{formatCurrency(deduction.amount)}</Text>
            <Text style={styles.deductionDescription}>{deduction.description}</Text>
          </View>
        ))}
      </View>
    )}
    {data.tax_saving_opportunities.length > 0 && (
      <View style={styles.taxOpportunities}>
        <Text style={styles.opportunitiesTitle}>Opportunités d'économie fiscale</Text>
        {data.tax_saving_opportunities.map((opportunity, index) => (
          <Text key={index} style={styles.opportunity}>• {opportunity}</Text>
        ))}
      </View>
    )}
  </View>
);

// OPTIMISATION: Composant pour la section Investissements
const InvestmentsSection = ({ data, formatCurrency }: { data: AnalysisResult['investments'], formatCurrency: (amount: number) => string }) => (
  <View style={styles.section}>
    <View style={[styles.sectionHeader, { marginBottom: 8 }]}>
      <Icon name="bulb" size={24} color={colors.primary} />
      <View style={styles.sectionTitleContainer}>
        <Text style={styles.sectionTitle}>Recommandations d'Investissement</Text>
      </View>
    </View>
    <View style={styles.budgetBadge}>
      <Icon name="wallet" size={16} color={colors.white} />
      <Text style={styles.budgetText}>Budget disponible: {formatCurrency(data.budget_available)}</Text>
    </View>

    {data.priority_investments.length > 0 ? (
      data.priority_investments.map((investment, index) => (
        <View key={index} style={styles.investmentCard}>
          <View style={styles.investmentHeader}>
            <Text style={styles.investmentCategory}>{investment.category}</Text>
            <View style={[styles.priorityBadge, {
              backgroundColor: investment.priority_score > 80 ? '#10996E' :
                investment.priority_score > 60 ? '#FF9800' : '#E53935'
            }]}>
              <Text style={styles.priorityText}>Priorité {investment.priority_score}</Text>
            </View>
          </View>
          <Text style={styles.investmentJustification}>{investment.justification}</Text>
          <View style={styles.investmentMetrics}>
            <View style={styles.investmentMetric}>
              <Text style={styles.metricLabel}>Coût estimé</Text>
              <View style={styles.metricValueContainer}>
                <Icon name="cash" size={18} color={colors.primary} />
                <Text style={styles.metricValue}>{formatCurrency(investment.estimated_cost)}</Text>
              </View>
            </View>
            <View style={styles.investmentMetric}>
              <Text style={styles.metricLabel}>ROI attendu</Text>
              <View style={styles.metricValueContainer}>
                <Icon name="trending-up" size={18} color={colors.success} />
                <Text style={[styles.metricValue, { color: colors.success }]}>{investment.expected_roi}%</Text>
              </View>
            </View>
            <View style={styles.investmentMetric}>
              <Text style={styles.metricLabel}>Retour sur investissement</Text>
              <View style={styles.metricValueContainer}>
                <Icon name="time" size={18} color={colors.warning} />
                <Text style={[styles.metricValue, { color: colors.warning }]}>{investment.payback_period_months} mois</Text>
              </View>
            </View>
          </View>
        </View>
      ))
    ) : (
      <View style={styles.noInvestments}><Text style={styles.noInvestmentsText}>✅ Aucune opportunité d'investissement critique détectée. Votre gestion est optimale !</Text></View>
    )}
  </View>
);

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: 40,
  },
  loadingText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 20,
    textAlign: 'center',
  },
  loadingSubtext: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 10,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: 40,
  },
  errorText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.error,
    marginTop: 20,
    textAlign: 'center',
  },
  errorSubtext: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 10,
    textAlign: 'center',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.primary,
    paddingHorizontal: 30,
    paddingVertical: 14,
    borderRadius: 30,
    marginTop: 20,
    ...commonStyles.shadow,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.white,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: colors.backgroundAlt,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  backButton: {
    padding: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textSecondary,
  },
  refreshButton: {
    padding: 10,
    borderRadius: 20,
    backgroundColor: colors.background,
  },
  periodSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: colors.backgroundAlt,
    justifyContent: 'center',
  },
  periodButton: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: 16,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  periodButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text,
  },
  periodButtonTextActive: {
    color: colors.white,
  },
  scrollView: {
    backgroundColor: colors.background,
  },
  section: {
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: colors.backgroundAlt,
    borderRadius: 16,
    padding: 16,
    ...commonStyles.shadow,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  sectionTitleContainer: {
    flex: 1, // Permet au titre de prendre l'espace disponible
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  scoreBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  scoreText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.white,
  },
  anomalyBadge: {
    backgroundColor: colors.error,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  anomalyText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.white,
  },
  riskBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  riskText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.white,
  },
  budgetBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primary + '20',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    marginBottom: 20,
  },
  budgetText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.primary,
  },
  profitGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 16,
    justifyContent: 'space-between',
  },
  metricCard: {
    width: (width - 32 - 16) / 2, // Agrandir les cartes
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 120, // Augmenter la hauteur minimale
  },
  metricLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 6,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  metricDescription: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  breakdown: {
    marginTop: 10,
  },
  breakdownTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
  },
  breakdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  breakdownCategory: {
    fontSize: 15,
    color: colors.text,
    flex: 1,
    flexShrink: 1,
  },
  breakdownAmount: {
    fontSize: 15,
    color: colors.text,
    fontWeight: 'bold',
  },
  breakdownPercent: {
    fontSize: 14,
    color: colors.textSecondary,
    width: 60,
    textAlign: 'right',
  },
  anomalyCard: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
  },
  anomalyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  anomalyType: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  severityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  severityText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.white,
  },
  anomalyCategory: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  anomalyDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start', // Aligner au début
    marginBottom: 10,
    padding: 10,
    borderRadius: 8,
    flexWrap: 'wrap', // Permettre le retour à la ligne
    gap: 8,
  },
  anomalyAmount: {
    fontSize: 14,
    color: colors.text,
    fontWeight: 'bold',
    flexShrink: 1, // Permettre au texte de se réduire
  },
  anomalyExpected: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  anomalyDeviation: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'right', // Aligner à droite
  },
  anomalyExplanation: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 22,
    flexWrap: 'wrap', // Assurer le retour à la ligne
  },
  cashFlowGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 16,
  },
  recommendations: {
    marginTop: 10,
  },
  recommendationsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 12,
  },
  recommendation: {
    fontSize: 15,
    color: colors.text,
    marginBottom: 8,
    lineHeight: 22,
  },
  taxGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 16,
  },
  deductions: {
    marginTop: 10,
  },
  deductionsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.success,
    marginBottom: 12,
  },
  deductionItem: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  deductionCategory: {
    fontSize: 15,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  deductionAmount: {
    fontSize: 15,
    color: colors.success,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  deductionDescription: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  taxOpportunities: {
    marginTop: 10,
  },
  opportunitiesTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.warning,
    marginBottom: 12,
  },
  opportunity: {
    fontSize: 15,
    color: colors.text,
    marginBottom: 8,
    lineHeight: 22,
  },
  investmentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  investmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8, // Ajouter un espace entre le titre et le badge
  },
  investmentTitleContainer: {
    flex: 1, // Permettre au conteneur du titre de prendre l'espace
  },
  investmentCategory: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
  },
  priorityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  priorityText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.white,
  },
  investmentJustification: {
    fontSize: 15,
    color: colors.text,
    marginBottom: 16,
    lineHeight: 22,
  },
  investmentMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 16,
  },
  investmentMetric: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 12,
  },
  metricValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  noInvestments: {
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.success + '10',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.success + '20',
  },
  noInvestmentsText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  bottomPadding: {
    height: 5,
  },
});