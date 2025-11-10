// app/admin/ai-evolution-dashboard.tsx (ou le chemin approprié)
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity, RefreshControl, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../styles/commonStyles';
import Icon from '../../components/Icon';
import { ensureSupabaseInitialized } from '../../config';
import { router } from 'expo-router';

interface AIStat {
  total: number;
  success: number;
  avgDuration: number;
}

interface Stats {
  [key: string]: AIStat;
}

interface MLModel {
  id: string;
  model_type: string;
  version: number;
  parameters: any;
  performance_metrics: any;
  training_data_stats: any;
  active: boolean;
  deployed_at: string | null;
  retired_at: string | null;
  created_at: string;
}

interface AIFeedback {
  id: string;
  user_id: string;
  ai_action_id: string | null;
  rating: number;
  feedback_type: string;
  comment: string | null;
  created_at: string;
}

interface TrendData {
  current: number;
  previous: number;
  trend: 'up' | 'down' | 'stable';
}

interface DashboardData {
  totalExecutions: number;
  successRate: number;
  avgDuration: number;
  peakHour: number;
  trends: { [key: string]: TrendData };
  feedbacks: AIFeedback[];
  models: MLModel[];
}

interface PerformanceDataPoint {
  date: Date;
  successRate: number;
  label: string;
}

const STAT_CONFIG: { [key: string]: { title: string; icon: any; color: string } } = {
  health_diagnosis: { title: 'Diagnostic Santé (Gemini)', icon: 'bug', color: colors.primary },
  health_score_heuristic: { title: 'Score de Santé (Heuristique)', icon: 'heart', color: colors.success },
  ai_stock_prediction_generated: { title: 'Prédictions de Stock', icon: 'archive', color: colors.orange },
  ai_financial_insight_generated: { title: 'Analyses Financières', icon: 'cash', color: colors.accent },
  ai_ration_alert_generated: { title: 'Alertes de Ration', icon: 'nutrition', color: colors.warning },
  ai_marketing_recommendation_generated: { title: 'Recommandations Marketing', icon: 'storefront', color: colors.accentSecondary },
};

export default function AIEvolutionDashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'performance' | 'learning' | 'satisfaction' | 'recommendations'>('overview');
  const [stats, setStats] = useState<Stats | null>(null);
  const [totalEvents, setTotalEvents] = useState(0);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [mlModels, setMlModels] = useState<MLModel[]>([]);
  const [filteredModels, setFilteredModels] = useState<MLModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterActive, setFilterActive] = useState<string>('all');
  const [performanceData, setPerformanceData] = useState<PerformanceDataPoint[]>([]);

  const loadStats = useCallback(async () => {
    try {
      console.log('📊 Loading AI evolution stats...');
      const supabase = await ensureSupabaseInitialized();

      // Load activity logs for last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: activityData, error: activityError } = await supabase
        .from('activity_logs')
        .select('event_type, outcome, context, created_at, duration_ms')
        .or('event_type.like.ai_%,event_type.like.health_%') // Simplification de la requête
        .gte('created_at', thirtyDaysAgo.toISOString());

      if (activityError) throw activityError;

      const aggregatedStats: Stats = {};
      let totalDuration = 0;
      let totalSuccess = 0;
      let totalCount = 0;
      const hourlyStats: { [hour: number]: number } = {};
      const durations: { [key: string]: number[] } = {};

      for (const event of activityData) {
        if (!aggregatedStats[event.event_type]) {
          aggregatedStats[event.event_type] = { total: 0, success: 0, avgDuration: 0 };
        }
        const stat = aggregatedStats[event.event_type];
        stat.total += 1;
        totalCount += 1;

        if (event.outcome === 'success') {
          stat.success += 1;
          totalSuccess += 1;
        }

        // Use duration_ms column or extract from context
        const duration = event.duration_ms || event.context?.duration_ms || 0;
        if (!durations[event.event_type]) {
          durations[event.event_type] = [];
        }
        durations[event.event_type].push(duration);
        totalDuration += duration;

        // Track hourly usage
        const hour = new Date(event.created_at).getHours();
        hourlyStats[hour] = (hourlyStats[hour] || 0) + 1;
      }
      // Calcul plus stable de la durée moyenne
      for (const eventType in aggregatedStats) {
        aggregatedStats[eventType].avgDuration = durations[eventType].reduce((a, b) => a + b, 0) / durations[eventType].length;
      }

      // Find peak hour
      const peakHour = Object.keys(hourlyStats).reduce((a, b) =>
        hourlyStats[parseInt(a)] > hourlyStats[parseInt(b)] ? a : b, '0');

      setStats(aggregatedStats);
      setTotalEvents(activityData.length);

      // Charger les modèles et les feedbacks en parallèle pour plus de robustesse
      const [modelsResult, feedbacksResult] = await Promise.all([
        supabase.from('ml_models').select('*').order('created_at', { ascending: false }),
        supabase.from('ai_recommendations').select('*').order('created_at', { ascending: false })
      ]);

      if (modelsResult.error) {
        console.error('❌ Error loading ML models:', modelsResult.error);
        // On peut continuer même si les modèles ne se chargent pas
      }
      if (feedbacksResult.error) {
        console.error('❌ Error loading AI recommendations:', feedbacksResult.error);
      }

      const modelsData = modelsResult.data || [];
      const feedbacksData = feedbacksResult.data || [];

      // --- NOUVEAU : Calcul des données de performance pour le graphique ---
      const performanceChartData: PerformanceDataPoint[] = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);

        const nextDay = new Date(date);
        nextDay.setDate(nextDay.getDate() + 1);

        const dailyEvents = activityData.filter(event => {
          const eventDate = new Date(event.created_at);
          return eventDate >= date && eventDate < nextDay;
        });

        const dailySuccess = dailyEvents.filter(e => e.outcome === 'success').length;
        const dailyTotal = dailyEvents.length;
        const successRate = dailyTotal > 0 ? (dailySuccess / dailyTotal) * 100 : 0;

        performanceChartData.push({
          date,
          successRate,
          label: i === 0 ? 'Auj.' : `J-${i}`,
        });
      }
      setPerformanceData(performanceChartData);

      // Calculate trends (comparing last 7 days vs previous 7 days)
      const trends: { [key: string]: TrendData } = {};
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const fourteenDaysAgo = new Date();
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

      for (const eventType of Object.keys(aggregatedStats)) {
        const currentWeek = activityData.filter(event =>
          event.event_type === eventType &&
          new Date(event.created_at) >= sevenDaysAgo
        ).length;

        const previousWeek = activityData.filter(event =>
          event.event_type === eventType &&
          new Date(event.created_at) >= fourteenDaysAgo &&
          new Date(event.created_at) < sevenDaysAgo
        ).length;

        const trendPercent = previousWeek > 0 ? ((currentWeek - previousWeek) / previousWeek) * 100 : 0;
        let trend: 'up' | 'down' | 'stable' = 'stable';
        if (trendPercent > 10) trend = 'up';
        else if (trendPercent < -10) trend = 'down';

        trends[eventType] = { current: currentWeek, previous: previousWeek, trend };
      }

      const dashboardData: DashboardData = {
        totalExecutions: totalCount,
        successRate: totalCount > 0 ? (totalSuccess / totalCount) * 100 : 0,
        avgDuration: totalCount > 0 ? totalDuration / totalCount : 0,
        peakHour: parseInt(peakHour),
        trends,
        feedbacks: feedbacksData,
        models: modelsData
      };

      setDashboardData(dashboardData);
      setMlModels(modelsData);
      setFilteredModels(modelsData);

      console.log('✅ AI evolution stats and ML models loaded');
    } catch (error: any) {
      console.error('❌ Error loading data:', error);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, []);

  useEffect(() => {
    let filtered = mlModels;

    if (filterType !== 'all') {
      filtered = filtered.filter(model => model.model_type === filterType);
    }

    if (filterActive !== 'all') {
      const isActive = filterActive === 'active';
      filtered = filtered.filter(model => model.active === isActive);
    }

    setFilteredModels(filtered);
  }, [mlModels, filterType, filterActive]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadStats();
  };


  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return 'checkmark-circle';
      case 'down': return 'close-circle';
      default: return 'help-circle';
    }
  };

  const getTrendColor = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return colors.success;
      case 'down': return colors.warning;
      default: return colors.textSecondary;
    }
  };

  const getSuccessRateColor = (rate: number) => {
    if (rate >= 95) return colors.success;
    if (rate >= 80) return colors.primary;
    if (rate >= 60) return colors.warning;
    return colors.orange;
  };

  const getDurationColor = (duration: number) => {
    if (duration < 1000) return colors.success;
    if (duration < 3000) return colors.primary;
    if (duration < 5000) return colors.warning;
    return colors.orange;
  };

  const generateRecommendations = () => {
    const recommendations = [];
    if (dashboardData) {
      if (dashboardData.successRate < 80) {
        recommendations.push({
          icon: 'warning',
          title: 'Taux de succès faible',
          description: 'Analyser les erreurs et optimiser les algorithmes',
          priority: 'high'
        });
      }
      if (dashboardData.avgDuration > 3000) {
        recommendations.push({
          icon: 'timer',
          title: 'Temps de réponse élevé',
          description: 'Optimiser les performances et la latence',
          priority: 'high'
        });
      }
      if (Object.values(dashboardData.trends).some(t => t.trend === 'down')) {
        recommendations.push({
          icon: 'trending-down',
          title: 'Tendance à la baisse',
          description: 'Analyser l\'engagement utilisateur',
          priority: 'medium'
        });
      }
      if (dashboardData.models.some(m => {
        const accuracy = Object.values(m.performance_metrics || {})[0];
        return typeof accuracy === 'number' && accuracy < 85;
      })) {
        recommendations.push({
          icon: 'school',
          title: 'Modèles à améliorer',
          description: 'Réentraîner les modèles avec faible précision',
          priority: 'medium'
        });
      }
      if (recommendations.length === 0) {
        recommendations.push({
          icon: 'check-circle',
          title: 'Système optimal',
          description: 'Continuer ainsi ! Toutes les métriques sont bonnes.',
          priority: 'low'
        });
      }
    }
    return recommendations;
  };

  const renderStatCard = (key: string, stat: AIStat) => {
    const config = STAT_CONFIG[key] || { title: key, icon: 'help-circle', color: colors.textSecondary };
    const successRate = stat.total > 0 ? (stat.success / stat.total) * 100 : 0;

    return (
      <View key={key} style={styles.statCard}>
        <View style={styles.cardHeader}>
          <View style={[styles.cardIcon, { backgroundColor: config.color + '20' }]}>
            <Icon name={config.icon} size={24} color={config.color} />
          </View>
          <Text style={styles.cardTitle}>{config.title}</Text>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.metric}>
            <Text style={styles.metricValue}>{stat.total}</Text>
            <Text style={styles.metricLabel}>Exécutions</Text>
          </View>
          <View style={styles.metric}>
            <Text style={[styles.metricValue, { color: successRate >= 80 ? colors.success : colors.warning }]}>
              {successRate.toFixed(0)}%
            </Text>
            <Text style={styles.metricLabel}>Succès</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricValue}>{(stat.avgDuration / 1000).toFixed(2)}s</Text>
            <Text style={styles.metricLabel}>Durée moy.</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderModelCard = (model: MLModel) => {
    const performanceKeys = Object.keys(model.performance_metrics || {});
    const mainMetric = performanceKeys.length > 0 ? model.performance_metrics[performanceKeys[0]] : null;

    return (
      <View key={model.id} style={styles.modelCard}>
        <View style={styles.modelHeader}>
          <Text style={styles.modelTitle}>{model.model_type}</Text>
          <View style={[styles.statusBadge, { backgroundColor: model.active ? colors.success : colors.warning }]}>
            <Text style={styles.statusText}>{model.active ? 'Actif' : 'Inactif'}</Text>
          </View>
        </View>

        <View style={styles.modelBody}>
          <View style={styles.modelRow}>
            <Text style={styles.modelLabel}>Version:</Text>
            <Text style={styles.modelValue}>{model.version}</Text>
          </View>
          <View style={styles.modelRow}>
            <Text style={styles.modelLabel}>Performance:</Text>
            <Text style={styles.modelValue}>
              {mainMetric !== null ? `${performanceKeys[0]}: ${mainMetric}` : 'N/A'}
            </Text>
          </View>
          <View style={styles.modelRow}>
            <Text style={styles.modelLabel}>Créé:</Text>
            <Text style={styles.modelValue}>{new Date(model.created_at).toLocaleDateString()}</Text>
          </View>
        </View>
      </View>
    );
  };

  if (loading && !stats) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Chargement des données d'évolution...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <ScrollView
            style={styles.scrollView}
            refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />}
          >
            {/* Global Metrics */}
            <View style={styles.metricsGrid}>
              <View style={styles.metricCard}>
                <Text style={styles.metricValue}>{dashboardData?.totalExecutions || 0}</Text>
                <Text style={styles.metricLabel}>Exécutions totales</Text>
                <Text style={styles.metricSubLabel}>30 derniers jours</Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={[styles.metricValue, { color: getSuccessRateColor(dashboardData?.successRate || 0) }]}>
                  {dashboardData?.successRate.toFixed(0) || 0}%
                </Text>
                <Text style={styles.metricLabel}>Taux de succès</Text>
                <Text style={styles.metricSubLabel}>Moyenne globale</Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={[styles.metricValue, { color: getDurationColor(dashboardData?.avgDuration ?? 0) }]}>
                  {((dashboardData?.avgDuration ?? 0) / 1000).toFixed(1)}s
                </Text>
                <Text style={styles.metricLabel}>Temps de réponse</Text>
                <Text style={styles.metricSubLabel}>Durée moyenne</Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricValue}>{dashboardData?.peakHour || 0}h</Text>
                <Text style={styles.metricLabel}>Heure de pic</Text>
                <Text style={styles.metricSubLabel}>Utilisation maximale</Text>
              </View>
            </View>

            {/* AI Performance Cards */}
            <View style={styles.content}>
              {stats && Object.keys(stats).length > 0 ? (
                Object.entries(stats).map(([key, stat]) => {
                  const trend = dashboardData?.trends[key];
                  return (
                    <View key={key} style={styles.statCard}>
                      <View style={styles.cardHeader}>
                        <View style={[styles.cardIcon, { backgroundColor: STAT_CONFIG[key]?.color + '20' || colors.primary + '20' }]}>
                          <Icon name={STAT_CONFIG[key]?.icon || 'help-circle'} size={24} color={STAT_CONFIG[key]?.color || colors.primary} />
                        </View>
                        <View style={styles.cardTitleContainer}>
                          <Text style={styles.cardTitle}>{STAT_CONFIG[key]?.title || key}</Text>
                          {trend && (
                            <View style={styles.trendContainer}>
                              <Icon name={getTrendIcon(trend.trend)} size={16} color={getTrendColor(trend.trend)} />
                              <Text style={[styles.trendText, { color: getTrendColor(trend.trend) }]}>
                                {trend.trend === 'up' ? '+' : trend.trend === 'down' ? '-' : ''}
                                {Math.abs(((trend.current - trend.previous) / (trend.previous || 1)) * 100).toFixed(0)}%
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>

                      <View style={styles.cardBody}>
                        <View style={styles.metric}>
                          <Text style={styles.metricValue}>{stat.total}</Text>
                          <Text style={styles.metricLabel}>Exécutions</Text>
                        </View>
                        <View style={styles.metric}>
                          <Text style={[styles.metricValue, { color: getSuccessRateColor((stat.success / stat.total) * 100) }]}>
                            {stat.total > 0 ? ((stat.success / stat.total) * 100).toFixed(0) : 0}%
                          </Text>
                          <Text style={styles.metricLabel}>Succès</Text>
                        </View>
                        <View style={styles.metric}>
                          <Text style={[styles.metricValue, { color: getDurationColor(stat.avgDuration) }]}>
                            {(stat.avgDuration / 1000).toFixed(2)}s
                          </Text>
                          <Text style={styles.metricLabel}>Durée moy.</Text>
                        </View>
                      </View>
                    </View>
                  );
                })
              ) : (
                <View style={styles.emptyState}>
                  <Icon name="analytics" size={48} color={colors.textSecondary} />
                  <Text style={styles.emptyText}>Aucune donnée d'IA collectée pour le moment.</Text>
                </View>
              )}
            </View>
          </ScrollView>
        );

      case 'performance':
        return (
          <ScrollView style={styles.scrollView}>
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Évolution sur 7 jours</Text>
              <Text style={styles.sectionDescription}>Taux de succès des IA sur les 7 derniers jours</Text>
              {performanceData.length > 0 ? (
                <View style={styles.chartContainer}>
                  <View style={styles.chartGrid}>
                    {performanceData.map((point, index) => (
                      <View key={index} style={styles.chartBar}>
                        <View
                          style={[
                            styles.chartBarFill,
                            {
                              height: `${Math.max(point.successRate, 5)}%`,
                              backgroundColor: getSuccessRateColor(point.successRate)
                            }
                          ]}
                        />
                        <Text style={styles.chartBarLabel}>{point.label}</Text>
                        <Text style={styles.chartBarValue}>{point.successRate.toFixed(0)}%</Text>
                      </View>
                    ))}
                  </View>
                  <View style={styles.chartLegend}>
                    <Text style={styles.chartLegendText}>Taux de succès par jour</Text>
                  </View>
                </View>
              ) : <Text>Chargement des données de performance...</Text>}
            </View>

            <View style={styles.metricsGrid}>
              <View style={styles.metricCard}>
                <Text style={styles.metricValue}>
                  {stats ? Math.round(Object.values(stats).reduce((sum, stat) => sum + stat.total, 0) / 7) : 0}
                </Text>
                <Text style={styles.metricLabel}>Exécutions moy./jour</Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={[styles.metricValue, { color: getSuccessRateColor(dashboardData?.successRate || 0) }]}>
                  {dashboardData?.successRate.toFixed(1) || 0}%
                </Text>
                <Text style={styles.metricLabel}>Taux de succès moyen</Text>
              </View>
            </View>
          </ScrollView>
        );

      case 'learning':
        return (
          <ScrollView style={styles.scrollView}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Modèles ML ({filteredModels.length})</Text>
              <View style={styles.filterContainer}>
                <TouchableOpacity
                  style={[styles.filterButton, filterType === 'all' && styles.filterButtonActive]}
                  onPress={() => setFilterType('all')}
                >
                  <Text style={[styles.filterButtonText, filterType === 'all' && styles.filterButtonTextActive]}>Tous</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.filterButton, filterType === 'health_predictor' && styles.filterButtonActive]}
                  onPress={() => setFilterType('health_predictor')}
                >
                  <Text style={[styles.filterButtonText, filterType === 'health_predictor' && styles.filterButtonTextActive]}>Santé</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.filterButton, filterType === 'growth_forecaster' && styles.filterButtonActive]}
                  onPress={() => setFilterType('growth_forecaster')}
                >
                  <Text style={[styles.filterButtonText, filterType === 'growth_forecaster' && styles.filterButtonTextActive]}>Croissance</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.filterButton, filterType === 'stock_optimizer' && styles.filterButtonActive]}
                  onPress={() => setFilterType('stock_optimizer')}
                >
                  <Text style={[styles.filterButtonText, filterType === 'stock_optimizer' && styles.filterButtonTextActive]}>Stock</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.filterContainer}>
                <TouchableOpacity
                  style={[styles.filterButton, filterActive === 'all' && styles.filterButtonActive]}
                  onPress={() => setFilterActive('all')}
                >
                  <Text style={[styles.filterButtonText, filterActive === 'all' && styles.filterButtonTextActive]}>Tous</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.filterButton, filterActive === 'active' && styles.filterButtonActive]}
                  onPress={() => setFilterActive('active')}
                >
                  <Text style={[styles.filterButtonText, filterActive === 'active' && styles.filterButtonTextActive]}>Actifs</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.filterButton, filterActive === 'inactive' && styles.filterButtonActive]}
                  onPress={() => setFilterActive('inactive')}
                >
                  <Text style={[styles.filterButtonText, filterActive === 'inactive' && styles.filterButtonTextActive]}>Inactifs</Text>
                </TouchableOpacity>
              </View>

            </View>

            <View style={styles.content}>
              {filteredModels.length > 0 ? (
                filteredModels.map(model => renderModelCard(model))
              ) : (
                <View style={styles.emptyState}>
                  <Icon name="analytics" size={48} color={colors.textSecondary} />
                  <Text style={styles.emptyText}>Aucun modèle ML trouvé avec les filtres actuels.</Text>
                </View>
              )}
            </View>
          </ScrollView>
        );

      case 'satisfaction':
        const avgRating = dashboardData?.feedbacks.length ?
          dashboardData.feedbacks.reduce((sum, f) => sum + f.rating, 0) / dashboardData.feedbacks.length : 0;
        const positiveFeedbacks = dashboardData?.feedbacks.filter(f => f.rating >= 4).length || 0;
        const positiveRate = dashboardData?.feedbacks.length ?
          (positiveFeedbacks / dashboardData.feedbacks.length) * 100 : 0;

        return (
          <ScrollView style={styles.scrollView}>
            <View style={styles.satisfactionCard}>
              <Text style={styles.satisfactionTitle}>Note moyenne</Text>
              <Text style={styles.satisfactionValue}>{avgRating.toFixed(1)}/5</Text>
              <View style={styles.starsContainer}>
                {[1, 2, 3, 4, 5].map(star => (
                  <Icon
                    key={star}
                    name={star <= Math.round(avgRating) ? 'star' : 'ellipse'}
                    size={24}
                    color={colors.warning}
                  />
                ))}
              </View>
              <Text style={styles.satisfactionLabel}>
                {dashboardData?.feedbacks.length || 0} retours reçus
              </Text>
            </View>

            <View style={styles.progressCard}>
              <Text style={styles.progressTitle}>Taux positif</Text>
              <View style={styles.progressBar}>
                <View
                  style={[styles.progressFill, { width: `${positiveRate}%`, backgroundColor: colors.success }]}
                />
              </View>
              <Text style={styles.progressValue}>{positiveRate.toFixed(0)}%</Text>
              <Text style={styles.progressLabel}>Avis "Excellent" (4-5 étoiles)</Text>
            </View>
          </ScrollView>
        );

      case 'recommendations':
        const recommendations = generateRecommendations();
        return (
          <ScrollView style={styles.scrollView}>
            <View style={styles.content}>
              {recommendations.map((rec, index) => (
                <View key={index} style={styles.recommendationCard}>
                  <View style={styles.recommendationHeader}>
                    <View style={[styles.recommendationIcon, {
                      backgroundColor: rec.priority === 'high' ? colors.warning + '20' :
                                     rec.priority === 'medium' ? colors.primary + '20' :
                                     colors.success + '20'
                    }]}>
                      <Icon
                        name={rec.icon as any}
                        size={24}
                        color={rec.priority === 'high' ? colors.warning :
                               rec.priority === 'medium' ? colors.primary :
                               colors.success}
                      />
                    </View>
                    <View style={styles.recommendationContent}>
                      <Text style={styles.recommendationTitle}>{rec.title}</Text>
                      <Text style={styles.recommendationDescription}>{rec.description}</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>
        );

      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Évolution IA</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        {[
          { key: 'overview', label: 'Vue d\'ensemble', icon: 'home' },
          { key: 'performance', label: 'Performance', icon: 'bar-chart' },
          { key: 'learning', label: 'Apprentissage', icon: 'school' },
          { key: 'satisfaction', label: 'Satisfaction', icon: 'star' },
          { key: 'recommendations', label: 'Recommandations', icon: 'lightbulb' }
        ].map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key as any)}
          >
            <Icon
              name={tab.icon as any}
              size={20}
              color={activeTab === tab.key ? colors.white : colors.textSecondary}
            />
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {renderTabContent()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  summaryCard: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    padding: 24,
    margin: 20,
    alignItems: 'center',
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
    opacity: 0.8,
  },
  summaryValue: {
    fontSize: 48,
    fontWeight: '800',
    color: colors.white,
    marginVertical: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: colors.white,
    opacity: 0.8,
  },
  statCard: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  cardBody: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  metric: {
    alignItems: 'center',
    gap: 4,
  },
  metricValueOld: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  metricLabelOld: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 16,
    textAlign: 'center',
  },
  sectionHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  filterContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  filterButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterButtonText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  filterButtonTextActive: {
    color: colors.white,
  },
  exportContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  exportButton: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: colors.accent,
    borderRadius: 8,
    alignItems: 'center',
  },
  exportButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  modelCard: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modelTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    textTransform: 'capitalize',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    color: colors.white,
    fontWeight: '600',
  },
  modelBody: {
    gap: 8,
  },
  modelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modelLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  modelValue: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.backgroundAlt,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 8,
    marginHorizontal: 2,
  },
  tabActive: {
    backgroundColor: colors.primary,
  },
  tabText: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  tabTextActive: {
    color: colors.white,
    fontWeight: '600',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 10,
    gap: 10,
  },
  metricCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.backgroundAlt,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  metricSubLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 2,
  },
  cardTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trendText: {
    fontSize: 12,
    fontWeight: '600',
  },
  sectionCard: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 12,
    padding: 20,
    margin: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
    marginBottom: 20,
  },
  chartContainer: {
    height: 200,
    paddingVertical: 20,
    alignItems: 'center',
  },
  chartGrid: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    width: '100%',
    height: 120,
    paddingHorizontal: 10,
  },
  chartBar: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 2,
  },
  chartBarFill: {
    width: '100%',
    borderRadius: 4,
    minHeight: 5,
  },
  chartBarLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  chartBarValue: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.text,
    marginTop: 2,
    textAlign: 'center',
  },
  chartLegend: {
    marginTop: 10,
    alignItems: 'center',
  },
  chartLegendText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  satisfactionCard: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 12,
    padding: 24,
    margin: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  satisfactionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  satisfactionValue: {
    fontSize: 48,
    fontWeight: '800',
    color: colors.warning,
    marginBottom: 12,
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 12,
  },
  satisfactionLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  progressCard: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 12,
    padding: 20,
    margin: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  progressBar: {
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 4,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressValue: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.success,
    textAlign: 'center',
  },
  progressLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  recommendationCard: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  recommendationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  recommendationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recommendationContent: {
    flex: 1,
  },
  recommendationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  recommendationDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
});