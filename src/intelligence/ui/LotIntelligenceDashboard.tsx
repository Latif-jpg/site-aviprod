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
import { useLotIntelligence } from '../agents/LotIntelligenceAgent';

const { width } = Dimensions.get('window');

interface LotIntelligenceDashboardProps {
  lotId: string;
  onClose?: () => void;
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
  onClose
}: LotIntelligenceDashboardProps) {
  const { analyzeLot } = useLotIntelligence();
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAnalysis();
  }, [lotId]);

  const loadAnalysis = async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await analyzeLot(lotId);
      if (result) {
        setAnalysis(result);
      } else {
        setError('Impossible d\'analyser ce lot');
      }
    } catch (err: any) {
      console.error('Erreur analyse lot:', err);
      setError(err.message || 'Erreur lors de l\'analyse');
    } finally {
      setLoading(false);
    }
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

  if (loading) {
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

  if (!analysis) return null;

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
              backgroundColor: analysis.growth.confidence_score > 80 ? '#10996E' : '#FF9800'
            }]}>
              <Text style={styles.confidenceText}>
                {analysis.growth.confidence_score}% confiance
              </Text>
            </View>
          </View>

          <View style={styles.growthGrid}>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Poids actuel</Text>
              <Text style={styles.metricValue}>
                {analysis.growth.current_weight.toFixed(1)} kg
              </Text>
            </View>

            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Poids prédit</Text>
              <Text style={styles.metricValue}>
                {analysis.growth.predicted_final_weight.toFixed(1)} kg
              </Text>
            </View>

            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Date de vente</Text>
              <Text style={styles.metricValue}>
                {formatDate(analysis.growth.predicted_sale_date)}
              </Text>
            </View>

            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Tendance</Text>
              <Text style={[styles.metricValue, {
                color: getGrowthTrendColor(analysis.growth.growth_trend)
              }]}>
                {analysis.growth.growth_trend.toUpperCase()}
              </Text>
            </View>
          </View>

          {/* Fenêtre optimale de vente */}
          <View style={styles.optimalWindow}>
            <Text style={styles.optimalTitle}>🔔 Fenêtre de vente optimale</Text>
            <Text style={styles.optimalDates}>
              {formatDate(analysis.growth.optimal_sale_window.start_date)} - {formatDate(analysis.growth.optimal_sale_window.end_date)}
            </Text>
            <Text style={styles.optimalMargin}>
              Marge estimée: {analysis.growth.optimal_sale_window.estimated_margin} CFA
            </Text>
          </View>
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
                {analysis.feed.current_consumption.toFixed(0)} kg/jour
              </Text>
            </View>

            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Recommandé</Text>
              <Text style={styles.metricValue}>
                {analysis.feed.recommended_daily_feed.toFixed(0)} kg/jour
              </Text>
            </View>

            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>FCR</Text>
              <Text style={[styles.metricValue, {
                color: analysis.feed.feed_conversion_ratio < 1.8 ? '#10996E' : '#FF9800'
              }]}>
                {analysis.feed.feed_conversion_ratio.toFixed(2)}
              </Text>
            </View>

            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Efficacité</Text>
              <Text style={[styles.metricValue, {
                color: analysis.feed.efficiency_score > 80 ? '#10996E' : '#FF9800'
              }]}>
                {analysis.feed.efficiency_score.toFixed(0)}%
              </Text>
            </View>
          </View>

          {/* Recommandations */}
          {analysis.feed.recommendations.length > 0 && (
            <View style={styles.recommendations}>
              <Text style={styles.recommendationsTitle}>💡 Recommandations</Text>
              {analysis.feed.recommendations.map((rec, index) => (
                <Text key={index} style={styles.recommendation}>
                  • {rec}
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
                color: analysis.health.mortality_rate < 5 ? '#10996E' : '#E53935'
              }]}>
                {analysis.health.mortality_rate.toFixed(1)}%
              </Text>
            </View>

            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Tendance</Text>
              <Text style={[styles.metricValue, {
                color: analysis.health.mortality_trend === 'improving' ? '#10996E' :
                       analysis.health.mortality_trend === 'worsening' ? '#E53935' : '#FF9800'
              }]}>
                {analysis.health.mortality_trend.toUpperCase()}
              </Text>
            </View>

            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Niveau de risque</Text>
              <Text style={[styles.metricValue, {
                color: getHealthRiskColor(analysis.health.risk_level)
              }]}>
                {analysis.health.risk_level.toUpperCase()}
              </Text>
            </View>
          </View>

          {/* Problèmes prédits */}
          {analysis.health.predicted_issues.length > 0 && (
            <View style={styles.predictedIssues}>
              <Text style={styles.issuesTitle}>⚠️ Problèmes potentiels détectés</Text>
              {analysis.health.predicted_issues.map((issue, index) => (
                <View key={index} style={styles.issueCard}>
                  <Text style={styles.issueText}>{issue.issue}</Text>
                  <View style={styles.issueDetails}>
                    <Text style={styles.issueProbability}>
                      Probabilité: {issue.probability}%
                    </Text>
                    <Text style={styles.issueDays}>
                      Dans {issue.days_to_occurrence} jours
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
                {analysis.benchmark.current_performance.toFixed(1)}/100
              </Text>
            </View>

            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Moyenne ferme</Text>
              <Text style={styles.metricValue}>
                {analysis.benchmark.average_performance.toFixed(1)}/100
              </Text>
            </View>

            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Meilleure performance</Text>
              <Text style={styles.metricValue}>
                {analysis.benchmark.best_performance.toFixed(1)}/100
              </Text>
            </View>

            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Classement</Text>
              <Text style={[styles.metricValue, {
                color: analysis.benchmark.ranking_percentile > 75 ? '#10996E' :
                       analysis.benchmark.ranking_percentile > 50 ? '#4CAF50' :
                       analysis.benchmark.ranking_percentile > 25 ? '#FF9800' : '#E53935'
              }]}>
                Top {analysis.benchmark.ranking_percentile.toFixed(0)}%
              </Text>
            </View>
          </View>

          {/* Insights */}
          {analysis.benchmark.comparison_insights.length > 0 && (
            <View style={styles.insights}>
              <Text style={styles.insightsTitle}>📊 Insights de comparaison</Text>
              {analysis.benchmark.comparison_insights.map((insight, index) => (
                <Text key={index} style={styles.insight}>
                  • {insight}
                </Text>
              ))}
            </View>
          )}
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>
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