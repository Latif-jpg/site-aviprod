// src/intelligence/ui/LotIntelligenceDashboard.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, commonStyles } from '../../../styles/commonStyles';
import Icon from '../../../components/Icon';
import { useLotIntelligence as defaultUseLotIntelligence } from '../agents/LotIntelligenceAgent';
import { usePremiumFeature } from '../../../hooks/usePremiumFeature';
import SmartTunnelModal from '../../../components/SmartTunnelModal';

const { width } = Dimensions.get('window');

interface LotIntelligenceDashboardProps {
  lotId: string;
  onClose?: () => void;
  // --- CORRECTION : Permettre l'injection d'un hook personnalisé pour les logs ---
  useLotIntelligenceHook?: typeof defaultUseLotIntelligence;
}

interface AnalysisResult {
  growth: {
    current_weight: number;
    predicted_final_weight: number;
    predicted_sale_date: string;
    confidence_score: number;
    optimal_sale_window: {
      start_date: string;
      end_date: string;
      estimated_margin: number;
    };
    growth_trend: 'excellent' | 'good' | 'average' | 'poor' | 'critical';
  };
  feed: {
    current_consumption: number;
    recommended_daily_feed: number;
    feed_conversion_ratio: number;
    efficiency_score: number;
    recommendations: string[];
  };
  health: {
    mortality_rate: number;
    mortality_trend: 'improving' | 'stable' | 'worsening';
    risk_level: 'low' | 'medium' | 'high' | 'critical';
    predicted_issues: Array<{
      issue: string;
      probability: number;
      days_to_occurrence: number;
    }>;
  };
  benchmark: {
    current_performance: number;
    average_performance: number;
    best_performance: number;
    ranking_percentile: number;
    comparison_insights: string[];
  };
}

export default function LotIntelligenceDashboard({
  lotId,
  onClose,
  useLotIntelligenceHook
}: LotIntelligenceDashboardProps) {
  // --- CORRECTION : Utiliser le hook injecté s'il existe, sinon le hook par défaut ---
  const useIntelligence = useLotIntelligenceHook || defaultUseLotIntelligence;
  const { lot, insights, kpis, loading: intelligenceLoading } = useIntelligence(lotId);

  const [error, setError] = useState<string | null>(null);
  const [isAuthorized, setIsAuthorized] = useState(false); // --- SÉCURITÉ ---

  const { requestAccess, showTunnel, tunnelProps, isLoading: accessLoading } = usePremiumFeature({
    featureKey: 'ai_analyses_per_month', // --- HARMONISATION QUOTAS ---
    featureName: 'Intelligence Lot IA',
    cost: 10,
  });

  useEffect(() => {
    loadAnalysis();
  }, [lotId]);

  const loadAnalysis = async () => {
    // La logique est maintenant entièrement gérée par le hook injecté.
  };

  const getGrowthTrendColor = (trend: string) => {
    switch (trend) {
      case 'excellent': return '#10996E';
      case 'good': return '#4CAF50';
      case 'average': return '#FF9800';
      case 'poor': return '#FF5722';
      case 'critical': return '#E53935';
      default: return colors.textSecondary;
    }
  };

  const getHealthRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return '#10996E';
      case 'medium': return '#FF9800';
      case 'high': return '#FF5722';
      case 'critical': return '#E53935';
      default: return colors.textSecondary;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const checkAccess = async () => {
    const access = await requestAccess();
    if (access.granted) {
      setIsAuthorized(true);
    } else if (onClose) {
      // Si l'accès est refusé ou annulé, on ferme le dashboard
      // pour éviter de rester sur un écran vide ou de bypasser
      onClose();
    }
  };

  useEffect(() => {
    checkAccess();
  }, []);

  if (intelligenceLoading || accessLoading) {
    return (
      <SafeAreaView style={commonStyles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Analyse intelligente en cours...</Text>
          <Text style={styles.loadingSubtext}>
            Prédiction de croissance, optimisation alimentaire, analyse santé
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

  if (!lot || !kpis || !isAuthorized) return null; // Bloquer si non autorisé

  return (
    <SafeAreaView style={commonStyles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {onClose && (
            <TouchableOpacity onPress={onClose} style={styles.backButton}>
              <Icon name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
          )}
          <View>
            <Text style={styles.title}>Intelligence Lot</Text>
            <Text style={styles.subtitle}>Analyse prédictive avancée</Text>
          </View>
        </View>
        <TouchableOpacity onPress={loadAnalysis} style={styles.refreshButton}>
          <Icon name="refresh" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>

        {/* CROISSANCE */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Icon name="trending-up" size={24} color={colors.primary} />
            <Text style={styles.sectionTitle}>Prédiction de Croissance</Text>
            <View style={[styles.confidenceBadge, {
              backgroundColor: (kpis.confidence_score || 80) > 80 ? '#10996E' : '#FF9800'
            }]}>
              <Text style={styles.confidenceText}>
                {kpis.confidence_score || 80}% confiance
              </Text>
            </View>
          </View>

          <View style={styles.growthGrid}>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Poids actuel</Text>
              <Text style={styles.metricValue}>
                {(lot.poids_moyen || 0).toFixed(1)} kg
              </Text>
            </View>

            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Poids prédit</Text>
              <Text style={styles.metricValue}>
                {(kpis.predicted_weight || 0).toFixed(1)} kg
              </Text>
            </View>

            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Date de vente</Text>
              <Text style={styles.metricValue}>
                {formatDate(kpis.predicted_sale_date || new Date())}
              </Text>
            </View>

            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Tendance</Text>
              <Text style={[styles.metricValue, {
                color: getGrowthTrendColor(kpis.growth_trend || 'average')
              }]}>
                {(kpis.growth_trend || 'average').toUpperCase()}
              </Text>
            </View>
          </View>

          {/* Fenêtre optimale de vente */}
          {kpis.optimal_sale_window && (
            <View style={styles.optimalWindow}>
              <Text style={styles.optimalTitle}>🔔 Fenêtre de vente optimale</Text>
              <Text style={styles.optimalDates}>
                {formatDate(kpis.optimal_sale_window.start_date)} - {formatDate(kpis.optimal_sale_window.end_date)}
              </Text>
              <Text style={styles.optimalMargin}>
                Marge estimée: {kpis.optimal_sale_window.estimated_margin.toLocaleString()} CFA
              </Text>

              {kpis.optimal_sale_window.use_default_price && (
                <View style={styles.priceWarning}>
                  <Icon name="alert-circle" size={20} color={colors.warning} />
                  <Text style={styles.priceWarningText}>
                    Attention : Prix de l'aliment par défaut utilisé (400 CFA). Ajoutez le prix réel dans votre Stock pour une marge précise.
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* ALIMENTATION */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Icon name="fast-food" size={24} color={colors.primary} />
            <Text style={styles.sectionTitle}>Optimisation Alimentaire</Text>
          </View>

          <View style={styles.feedGrid}>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Consommation actuelle</Text>
              <Text style={styles.metricValue}>
                {(kpis.current_consumption || 0).toFixed(0)} kg/jour
              </Text>
            </View>

            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Recommandé</Text>
              <Text style={styles.metricValue}>
                {(kpis.recommended_feed || 0).toFixed(0)} kg/jour
              </Text>
            </View>

            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>IC (Indice Cons.)</Text>
              <Text style={[styles.metricValue, {
                color: (kpis.ic || 2) < 1.8 ? '#10996E' : '#FF9800'
              }]}>
                {(kpis.ic || 0).toFixed(2)}
              </Text>
            </View>

            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Efficacité</Text>
              <Text style={[styles.metricValue, {
                color: (kpis.efficiency_score || 0) > 80 ? '#10996E' : '#FF9800'
              }]}>
                {(kpis.efficiency_score || 0).toFixed(0)}%
              </Text>
            </View>
          </View>

          {/* Recommandations */}
          {insights.filter((i: any) => i.category === 'feed').length > 0 && (
            <View style={styles.recommendations}>
              <Text style={styles.recommendationsTitle}>💡 Recommandations</Text>
              {insights.filter((i: any) => i.category === 'feed').map((insight: any, index: number) => (
                <Text key={index} style={styles.recommendation}>
                  • {insight.description}
                </Text>
              ))}
            </View>
          )}
        </View>

        {/* SANTÉ */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Icon name="medical" size={24} color={colors.primary} />
            <Text style={styles.sectionTitle}>Analyse Santé</Text>
          </View>

          <View style={styles.healthGrid}>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Taux mortalité</Text>
              <Text style={[styles.metricValue, {
                color: (lot.taux_mortalite || 0) < 5 ? '#10996E' : '#E53935'
              }]}>
                {(lot.taux_mortalite || 0).toFixed(1)}%
              </Text>
            </View>

            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Tendance</Text>
              <Text style={[styles.metricValue, {
                color: (kpis.mortality_trend || 'stable') === 'improving' ? '#10996E' :
                  (kpis.mortality_trend || 'stable') === 'worsening' ? '#E53935' : '#FF9800'
              }]}>
                {(kpis.mortality_trend || 'stable').toUpperCase()}
              </Text>
            </View>

            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Niveau de risque</Text>
              <Text style={[styles.metricValue, {
                color: getHealthRiskColor(kpis.risk_level || 'low')
              }]}>
                {(kpis.risk_level || 'low').toUpperCase()}
              </Text>
            </View>
          </View>

          {/* Problèmes prédits */}
          {insights.filter((i: any) => i.category === 'health_prediction').length > 0 && (
            <View style={styles.predictedIssues}>
              <Text style={styles.issuesTitle}>⚠️ Problèmes potentiels détectés</Text>
              {insights.filter((i: any) => i.category === 'health_prediction').map((insight: any, index: number) => (
                <View key={index} style={styles.issueCard}>
                  <Text style={styles.issueText}>{insight.title}</Text>
                  <View style={styles.issueDetails}>
                    <Text style={styles.issueProbability}>
                      Probabilité: {insight.probability}%
                    </Text>
                    <Text style={styles.issueDays}>
                      Dans {insight.days_to_occurrence} jours
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* BENCHMARK */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Icon name="trophy" size={24} color={colors.primary} />
            <Text style={styles.sectionTitle}>Benchmark Performance</Text>
          </View>

          <View style={styles.benchmarkGrid}>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Performance actuelle</Text>
              <Text style={styles.metricValue}>
                {(kpis.benchmark?.current_performance || 0).toFixed(1)}/100
              </Text>
            </View>

            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Moyenne ferme</Text>
              <Text style={styles.metricValue}>
                {(kpis.benchmark?.average_performance || 0).toFixed(1)}/100
              </Text>
            </View>

            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Meilleure performance</Text>
              <Text style={styles.metricValue}>
                {(kpis.benchmark?.best_performance || 0).toFixed(1)}/100
              </Text>
            </View>

            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Classement</Text>
              <Text style={[styles.metricValue, {
                color: (kpis.benchmark?.ranking_percentile || 0) > 75 ? '#10996E' :
                  (kpis.benchmark?.ranking_percentile || 0) > 50 ? '#4CAF50' :
                    (kpis.benchmark?.ranking_percentile || 0) > 25 ? '#FF9800' : '#E53935'
              }]}>
                Top {(kpis.benchmark?.ranking_percentile || 0).toFixed(0)}%
              </Text>
            </View>
          </View>

          {/* Insights */}
          {kpis.benchmark?.comparison_insights.length > 0 && (
            <View style={styles.insights}>
              <Text style={styles.insightsTitle}>📊 Insights de comparaison</Text>
              {kpis.benchmark.comparison_insights.map((insight: string, index: number) => (
                <Text key={index} style={styles.insight}>
                  • {insight}
                </Text>
              ))}
            </View>
          )}
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>
      <SmartTunnelModal {...tunnelProps} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  priceWarning: {
    backgroundColor: '#fffbeb',
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#fef3c7',
  },
  priceWarningText: {
    fontSize: 12,
    color: '#D97706',
    fontWeight: '600',
    flex: 1,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
    textAlign: 'center',
  },
  loadingSubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.error,
    marginTop: 16,
    textAlign: 'center',
  },
  errorSubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  refreshButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    marginHorizontal: 20,
    marginBottom: 24,
    backgroundColor: colors.backgroundAlt,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  confidenceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  confidenceText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.white,
  },
  growthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  feedGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  healthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  benchmarkGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  metricCard: {
    width: (width - 40 - 24 - 32) / 2, // 2 colonnes avec marges
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  metricLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  optimalWindow: {
    backgroundColor: colors.primary + '10',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.primary + '20',
  },
  optimalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: 8,
  },
  optimalDates: {
    fontSize: 14,
    color: colors.text,
    marginBottom: 4,
  },
  optimalMargin: {
    fontSize: 14,
    color: colors.success,
    fontWeight: '600',
  },
  recommendations: {
    backgroundColor: colors.warning + '10',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.warning + '20',
  },
  recommendationsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.warning,
    marginBottom: 8,
  },
  recommendation: {
    fontSize: 14,
    color: colors.text,
    marginBottom: 4,
    lineHeight: 20,
  },
  predictedIssues: {
    backgroundColor: colors.error + '10',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.error + '20',
  },
  issuesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.error,
    marginBottom: 8,
  },
  issueCard: {
    backgroundColor: colors.background,
    borderRadius: 6,
    padding: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  issueText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
    marginBottom: 4,
  },
  issueDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  issueProbability: {
    fontSize: 12,
    color: colors.error,
    fontWeight: '600',
  },
  issueDays: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  insights: {
    backgroundColor: colors.success + '10',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.success + '20',
  },
  insightsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.success,
    marginBottom: 8,
  },
  insight: {
    fontSize: 14,
    color: colors.text,
    marginBottom: 4,
    lineHeight: 20,
  },
  bottomPadding: {
    height: 100,
  },
});