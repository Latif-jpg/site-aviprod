// src/intelligence/ui/RationAdvisorDashboard.tsx
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
import { useRationAdvisor } from '../agents/RationAdvisor';
import { supabase } from '../../../config';

const { width } = Dimensions.get('window');

interface RationAdvisorDashboardProps {
  lotId?: string;
  userId: string;
  onClose?: () => void;
}

interface RationAnalysis {
  race: string;
  phase: string;
  quantity: number;
  daily_feed_per_bird: number;
  ingredients: Array<{
    name: string;
    percentage: number;
    total_quantity: number;
    cost_per_kg: number;
  }>;
  nutritional_values: {
    protein_percentage: number;
    energy_kcal: number;
    calcium_percentage?: number;
    phosphorus_percentage?: number;
  };
  total_cost_per_day: number;
  total_cost_per_kg: number;
  bags_needed: number;
  efficiency_score: number;
  recommendations: string[];
}

interface FeedOptimization {
  current_ration: RationAnalysis;
  optimized_ration: RationAnalysis;
  cost_savings: number;
  performance_improvement: number;
  implementation_steps: string[];
  expected_roi: number;
}

interface ConsumptionAnalysis {
  lot_id: string;
  planned_consumption: number;
  actual_consumption: number;
  deviation_percentage: number;
  efficiency_trend: 'improving' | 'stable' | 'declining';
  recommendations: string[];
}

export default function RationAdvisorDashboard({
  lotId,
  userId,
  onClose
}: RationAdvisorDashboardProps) {
  const { formulateRation, optimizeRation, analyzeConsumption } = useRationAdvisor();
  const [currentRation, setCurrentRation] = useState<RationAnalysis | null>(null);
  const [optimizedRation, setOptimizedRation] = useState<FeedOptimization | null>(null);
  const [consumptionAnalysis, setConsumptionAnalysis] = useState<ConsumptionAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadRationAnalysis();
  }, [lotId, userId]);

  const loadRationAnalysis = async () => {
    try {
      setLoading(true);
      setError(null);

      if (lotId) {
        // --- CORRECTION : Récupérer les données du lot avant de les utiliser ---
        const { data: lotData, error: lotError } = await supabase
          .from('lots')
          .select('bird_type, age, quantity')
          .eq('id', lotId)
          .single();

        if (lotError) throw lotError;

        const getPhaseFromAge = (birdType: string, age: number) => {
          if (birdType === 'layers') {
            if (age <= 42) return 'démarrage'; if (age <= 119) return 'croissance'; if (age <= 140) return 'pré-ponte'; return 'ponte';
          }
          if (age <= 21) return 'démarrage'; if (age <= 32) return 'croissance'; return 'finition';
        };

        const baseRation = await formulateRation(lotData.bird_type || 'poulet_de_chair', getPhaseFromAge(lotData.bird_type || 'poulet_de_chair', lotData.age), lotData.quantity);
        if (baseRation) {
          // Transformer RationFormula en RationAnalysis pour l'affichage
          const rationAnalysis: RationAnalysis = {
            race: baseRation.race,
            phase: baseRation.phase,
            quantity: lotData.quantity,
            daily_feed_per_bird: 100, // Valeur par défaut, à calculer selon la phase
            ingredients: baseRation.ingredients.map(ing => ({
              name: ing.name,
              percentage: ing.percentage,
              total_quantity: (ing.percentage / 100) * lotData.quantity,
              cost_per_kg: ing.cost_per_kg
            })),
            nutritional_values: {
              protein_percentage: baseRation.ingredients.reduce((sum, ing) =>
                sum + (ing.nutritional_value.protein * ing.percentage / 100), 0),
              energy_kcal: baseRation.ingredients.reduce((sum, ing) =>
                sum + (ing.nutritional_value.energy * ing.percentage / 100), 0),
              calcium_percentage: baseRation.ingredients.reduce((sum, ing) =>
                sum + ((ing.nutritional_value.calcium || 0) * ing.percentage / 100), 0) || undefined,
              phosphorus_percentage: baseRation.ingredients.reduce((sum, ing) =>
                sum + ((ing.nutritional_value.phosphorus || 0) * ing.percentage / 100), 0) || undefined
            },
            total_cost_per_day: baseRation.total_cost_per_kg * (100 / 1000) * lotData.quantity, // Estimation
            total_cost_per_kg: baseRation.total_cost_per_kg,
            bags_needed: Math.ceil((baseRation.total_cost_per_kg * lotData.quantity) / 50000), // Estimation 50kg/bag
            efficiency_score: baseRation.efficiency_score,
            recommendations: ['Ration équilibrée selon les standards', 'Surveiller la consommation réelle']
          };

          setCurrentRation(rationAnalysis);

          // Optimiser la ration
          const optimization = await optimizeRation(baseRation.id);
          if (optimization) {
            // Transformer RationOptimization en FeedOptimization
            const feedOptimization: FeedOptimization = {
              current_ration: rationAnalysis,
              optimized_ration: {
                ...rationAnalysis,
                race: optimization.optimized_ration.race,
                phase: optimization.optimized_ration.phase,
                ingredients: optimization.optimized_ration.ingredients.map(ing => ({
                  name: ing.name,
                  percentage: ing.percentage,
                  total_quantity: (ing.percentage / 100) * lotData.quantity,
                  cost_per_kg: ing.cost_per_kg
                })),
                nutritional_values: {
                  protein_percentage: optimization.optimized_ration.ingredients.reduce((sum, ing) =>
                    sum + (ing.nutritional_value.protein * ing.percentage / 100), 0),
                  energy_kcal: optimization.optimized_ration.ingredients.reduce((sum, ing) =>
                    sum + (ing.nutritional_value.energy * ing.percentage / 100), 0),
                  calcium_percentage: optimization.optimized_ration.ingredients.reduce((sum, ing) =>
                    sum + ((ing.nutritional_value.calcium || 0) * ing.percentage / 100), 0) || undefined,
                  phosphorus_percentage: optimization.optimized_ration.ingredients.reduce((sum, ing) =>
                    sum + ((ing.nutritional_value.phosphorus || 0) * ing.percentage / 100), 0) || undefined
                },
                total_cost_per_day: optimization.optimized_ration.total_cost_per_kg * (100 / 1000) * lotData.quantity,
                total_cost_per_kg: optimization.optimized_ration.total_cost_per_kg,
                bags_needed: Math.ceil((optimization.optimized_ration.total_cost_per_kg * lotData.quantity) / 50000),
                efficiency_score: optimization.optimized_ration.efficiency_score,
                recommendations: optimization.recommendations
              },
              cost_savings: optimization.cost_savings,
              performance_improvement: optimization.performance_improvement,
              implementation_steps: ['Étape 1: Tester sur un petit lot', 'Étape 2: Monitorer la consommation', 'Étape 3: Ajuster si nécessaire'],
              expected_roi: 25 // Valeur par défaut
            };

            setOptimizedRation(feedOptimization);
          }
        }
      }
    } catch (err: any) {
      console.error('Erreur analyse ration:', err);
      setError(err.message || 'Erreur lors de l\'analyse des rations');
    } finally {
      setLoading(false);
    }
  };

  const getEfficiencyColor = (score: number) => {
    if (score >= 80) return '#10996E';
    if (score >= 60) return '#4CAF50';
    if (score >= 40) return '#FF9800';
    return '#E53935';
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'improving': return '#10996E';
      case 'stable': return '#FF9800';
      case 'declining': return '#E53935';
      default: return colors.textSecondary;
    }
  };

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('fr-FR') + ' FCFA';
  };

  if (loading) {
    return (
      <SafeAreaView style={commonStyles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Optimisation des rations IA...</Text>
          <Text style={styles.loadingSubtext}>
            Formulation équilibrée, analyse coûts, recommandations
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
          <TouchableOpacity style={styles.retryButton} onPress={loadRationAnalysis}>
            <Icon name="refresh" size={20} color={colors.white} />
            <Text style={styles.retryButtonText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

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
            <Text style={styles.title}>Rations IA</Text>
            <Text style={styles.subtitle}>Optimisation alimentaire intelligente</Text>
          </View>
        </View>
        <TouchableOpacity onPress={loadRationAnalysis} style={styles.refreshButton}>
          <Icon name="refresh" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>

        {/* ANALYSE DE CONSOMMATION */}
        {consumptionAnalysis && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Icon name="fast-food" size={24} color={colors.primary} />
              <Text style={styles.sectionTitle}>Analyse de Consommation</Text>
            </View>

            <View style={styles.consumptionGrid}>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Consommation prévue</Text>
                <Text style={styles.metricValue}>
                  {consumptionAnalysis.planned_consumption.toFixed(0)} kg
                </Text>
              </View>

              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Consommation réelle</Text>
                <Text style={[styles.metricValue, {
                  color: Math.abs(consumptionAnalysis.deviation_percentage) > 15 ? '#E53935' : '#10996E'
                }]}>
                  {consumptionAnalysis.actual_consumption.toFixed(0)} kg
                </Text>
              </View>

              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Écart</Text>
                <Text style={[styles.metricValue, {
                  color: Math.abs(consumptionAnalysis.deviation_percentage) > 15 ? '#E53935' : '#10996E'
                }]}>
                  {consumptionAnalysis.deviation_percentage > 0 ? '+' : ''}
                  {consumptionAnalysis.deviation_percentage.toFixed(1)}%
                </Text>
              </View>

              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Tendance</Text>
                <Text style={[styles.metricValue, {
                  color: getTrendColor(consumptionAnalysis.efficiency_trend)
                }]}>
                  {consumptionAnalysis.efficiency_trend.toUpperCase()}
                </Text>
              </View>
            </View>

            {/* Recommandations de consommation */}
            {consumptionAnalysis.recommendations.length > 0 && (
              <View style={styles.recommendations}>
                <Text style={styles.recommendationsTitle}>💡 Recommandations</Text>
                {consumptionAnalysis.recommendations.map((rec, index) => (
                  <Text key={index} style={styles.recommendation}>
                    • {rec}
                  </Text>
                ))}
              </View>
            )}
          </View>
        )}

        {/* RATION ACTUELLE */}
        {currentRation && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Icon name="document-text" size={24} color={colors.primary} />
              <Text style={styles.sectionTitle}>Ration Actuelle</Text>
              <View style={[styles.efficiencyBadge, {
                backgroundColor: getEfficiencyColor(currentRation.efficiency_score)
              }]}>
                <Text style={styles.efficiencyText}>
                  {currentRation.efficiency_score}% efficacité
                </Text>
              </View>
            </View>

            <View style={styles.rationGrid}>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Race</Text>
                <Text style={styles.metricValue}>{currentRation.race}</Text>
              </View>

              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Phase</Text>
                <Text style={styles.metricValue}>{currentRation.phase}</Text>
              </View>

              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Animaux</Text>
                <Text style={styles.metricValue}>{currentRation.quantity}</Text>
              </View>

              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Consommation/jour</Text>
                <Text style={styles.metricValue}>
                  {currentRation.daily_feed_per_bird.toFixed(1)}g/animal
                </Text>
              </View>
            </View>

            {/* Valeurs nutritionnelles */}
            <View style={styles.nutritionSection}>
              <Text style={styles.nutritionTitle}>🥘 Valeurs Nutritionnelles</Text>
              <View style={styles.nutritionGrid}>
                <View style={styles.nutritionItem}>
                  <Text style={styles.nutritionLabel}>Protéines</Text>
                  <Text style={styles.nutritionValue}>
                    {currentRation.nutritional_values.protein_percentage.toFixed(1)}%
                  </Text>
                </View>
                <View style={styles.nutritionItem}>
                  <Text style={styles.nutritionLabel}>Énergie</Text>
                  <Text style={styles.nutritionValue}>
                    {currentRation.nutritional_values.energy_kcal} kcal/kg
                  </Text>
                </View>
                {currentRation.nutritional_values.calcium_percentage && (
                  <View style={styles.nutritionItem}>
                    <Text style={styles.nutritionLabel}>Calcium</Text>
                    <Text style={styles.nutritionValue}>
                      {currentRation.nutritional_values.calcium_percentage.toFixed(1)}%
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Coûts */}
            <View style={styles.costSection}>
              <Text style={styles.costTitle}>💰 Analyse Coûts</Text>
              <View style={styles.costGrid}>
                <View style={styles.costItem}>
                  <Text style={styles.costLabel}>Coût journalier</Text>
                  <Text style={styles.costValue}>
                    {formatCurrency(currentRation.total_cost_per_day)}
                  </Text>
                </View>
                <View style={styles.costItem}>
                  <Text style={styles.costLabel}>Coût au kg</Text>
                  <Text style={styles.costValue}>
                    {currentRation.total_cost_per_kg.toFixed(0)} FCFA/kg
                  </Text>
                </View>
                <View style={styles.costItem}>
                  <Text style={styles.costLabel}>Sacs (50kg)</Text>
                  <Text style={styles.costValue}>
                    {currentRation.bags_needed}
                  </Text>
                </View>
              </View>
            </View>

            {/* Ingrédients */}
            <View style={styles.ingredientsSection}>
              <Text style={styles.ingredientsTitle}>📋 Composition</Text>
              {currentRation.ingredients.slice(0, 5).map((ingredient, index) => (
                <View key={index} style={styles.ingredientRow}>
                  <Text style={styles.ingredientName}>{ingredient.name}</Text>
                  <Text style={styles.ingredientPercentage}>
                    {ingredient.percentage.toFixed(1)}%
                  </Text>
                  <Text style={styles.ingredientCost}>
                    {ingredient.cost_per_kg} FCFA/kg
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* OPTIMISATION */}
        {optimizedRation && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Icon name="lightbulb" size={24} color={colors.primary} />
              <Text style={styles.sectionTitle}>Optimisation IA</Text>
            </View>

            <View style={styles.optimizationGrid}>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Économies</Text>
                <Text style={[styles.metricValue, { color: '#10996E' }]}>
                  {formatCurrency(optimizedRation.cost_savings)}
                </Text>
              </View>

              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Amélioration perf.</Text>
                <Text style={[styles.metricValue, { color: '#4CAF50' }]}>
                  +{optimizedRation.performance_improvement.toFixed(1)}%
                </Text>
              </View>

              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>ROI attendu</Text>
                <Text style={[styles.metricValue, { color: '#FF9800' }]}>
                  {optimizedRation.expected_roi.toFixed(0)}%
                </Text>
              </View>

              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Étapes</Text>
                <Text style={styles.metricValue}>
                  {optimizedRation.implementation_steps.length}
                </Text>
              </View>
            </View>

            {/* Étapes d'implémentation */}
            <View style={styles.implementationSection}>
              <Text style={styles.implementationTitle}>🚀 Plan d'implémentation</Text>
              {optimizedRation.implementation_steps.map((step, index) => (
                <Text key={index} style={styles.implementationStep}>
                  {index + 1}. {step}
                </Text>
              ))}
            </View>
          </View>
        )}

        {/* RECOMMANDATIONS GÉNÉRALES */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Icon name="information-circle" size={24} color={colors.primary} />
            <Text style={styles.sectionTitle}>Conseils IA</Text>
          </View>

          <View style={styles.tipsList}>
            <View style={styles.tipCard}>
              <Text style={styles.tipTitle}>🔄 Ajustements progressifs</Text>
              <Text style={styles.tipText}>
                Changez la ration progressivement sur 5-7 jours pour éviter les troubles digestifs.
              </Text>
            </View>

            <View style={styles.tipCard}>
              <Text style={styles.tipTitle}>📊 Suivi des performances</Text>
              <Text style={styles.tipText}>
                Monitorer le taux de croissance, la consommation et la mortalité après changement.
              </Text>
            </View>

            <View style={styles.tipCard}>
              <Text style={styles.tipTitle}>🌡️ Conditions environnementales</Text>
              <Text style={styles.tipText}>
                Adaptez les rations selon la température et l'humidité pour optimiser l'efficacité.
              </Text>
            </View>

            <View style={styles.tipCard}>
              <Text style={styles.tipTitle}>💰 Analyse coûts-bénéfices</Text>
              <Text style={styles.tipText}>
                Évaluez régulièrement le ROI des changements de ration sur la performance globale.
              </Text>
            </View>
          </View>
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
  efficiencyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  efficiencyText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.white,
  },
  consumptionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  rationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  optimizationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  metricCard: {
    width: (width - 40 - 24 - 32) / 2,
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
  nutritionSection: {
    backgroundColor: colors.success + '10',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.success + '20',
    marginBottom: 16,
  },
  nutritionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.success,
    marginBottom: 8,
  },
  nutritionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  nutritionItem: {
    flex: 1,
    minWidth: (width - 40 - 24 - 32) / 3,
    alignItems: 'center',
  },
  nutritionLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  nutritionValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  costSection: {
    backgroundColor: colors.primary + '10',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.primary + '20',
    marginBottom: 16,
  },
  costTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: 8,
  },
  costGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  costItem: {
    flex: 1,
    minWidth: (width - 40 - 24 - 32) / 3,
    alignItems: 'center',
  },
  costLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  costValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  ingredientsSection: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  ingredientsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  ingredientRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  ingredientName: {
    fontSize: 14,
    color: colors.text,
    flex: 1,
  },
  ingredientPercentage: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
    width: 60,
    textAlign: 'center',
  },
  ingredientCost: {
    fontSize: 12,
    color: colors.textSecondary,
    width: 80,
    textAlign: 'right',
  },
  implementationSection: {
    backgroundColor: colors.success + '10',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.success + '20',
  },
  implementationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.success,
    marginBottom: 8,
  },
  implementationStep: {
    fontSize: 14,
    color: colors.text,
    marginBottom: 4,
    lineHeight: 20,
  },
  tipsList: {
    gap: 12,
  },
  tipCard: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tipTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: 8,
  },
  tipText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  bottomPadding: {
    height: 100,
  },
});