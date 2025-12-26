 // src/intelligence/agents/LotIntelligenceAgent.ts
// --- CORRECTION : Utiliser une seule instance de Supabase ---
import { supabase } from '../../../config';

import { smartAlertSystem } from '../core/SmartAlertSystem';
import { dataCollector } from '../core/DataCollector';

/**
 * LOT INTELLIGENCE AGENT
 *
 * Agent IA spécialisé dans l'optimisation des lots:
 * - Prédiction de croissance et poids final
 * - Détection précoce de problèmes
 * - Calcul fenêtre de vente optimale
 * - Optimisation de l'alimentation
 * - Benchmark et apprentissage
 */

// ==================== TYPES ====================

interface LotData {
  id: string;
  race: string;
  bird_type: string;
  quantity: number;
  age: number;
  poids_moyen?: number;
  entry_date: string;
  created_at: string; 
  user_id: string;
}

interface GrowthPrediction {
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
}

interface FeedOptimization {
  current_consumption: number;
  recommended_daily_feed: number;
  indice_de_consommation: number; // NOUVEAU : Remplacement de feed_conversion_ratio
  efficiency_score: number;
  recommendations: string[];
}

interface HealthAnalysis {
  mortality_rate: number;
  mortality_trend: 'improving' | 'stable' | 'worsening';
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  predicted_issues: Array<{
    issue: string;
    probability: number;
    days_to_occurrence: number;
  }>;
}

interface LotBenchmark {
  current_performance: number;
  average_performance: number;
  best_performance: number;
  ranking_percentile: number;
  comparison_insights: string[];
}

// ==================== PARAMÈTRES DE RÉFÉRENCE ====================

const BREED_STANDARDS: Record<string, {
  target_weight_6weeks: number;
  target_weight_8weeks: number;
  normal_mortality_rate: number;
  fcr_target: number; // Feed Conversion Ratio
  growth_rate_per_day: number;
}> = {
  'poulet_de_chair': {
    target_weight_6weeks: 2.0,
    target_weight_8weeks: 2.8,
    normal_mortality_rate: 5,
    fcr_target: 1.8,
    growth_rate_per_day: 60, // grammes
  },
  'broiler': {
    target_weight_6weeks: 2.2,
    target_weight_8weeks: 3.0,
    normal_mortality_rate: 4,
    fcr_target: 1.7,
    growth_rate_per_day: 65,
  },
  'cobb': {
    target_weight_6weeks: 2.3,
    target_weight_8weeks: 3.2,
    normal_mortality_rate: 3.5,
    fcr_target: 1.65,
    growth_rate_per_day: 68,
  },
  'ross': {
    target_weight_6weeks: 2.2,
    target_weight_8weeks: 3.1,
    normal_mortality_rate: 4,
    fcr_target: 1.7,
    growth_rate_per_day: 66,
  },
  // Default pour races non répertoriées
  'default': {
    target_weight_6weeks: 2.0,
    target_weight_8weeks: 2.8,
    normal_mortality_rate: 5,
    fcr_target: 1.8,
    growth_rate_per_day: 60,
  },
};

// ==================== CLASSE PRINCIPALE ====================

class LotIntelligenceAgent {
  private static instance: LotIntelligenceAgent;

  private constructor() {}

  public static getInstance(): LotIntelligenceAgent {
    if (!LotIntelligenceAgent.instance) {
      LotIntelligenceAgent.instance = new LotIntelligenceAgent();
    }
    return LotIntelligenceAgent.instance;
  }

  /**
   * ANALYSE COMPLÈTE D'UN LOT
   */
  public async analyzeLot(lotId: string): Promise<{
    growth: GrowthPrediction;
    feed: FeedOptimization;
    health: HealthAnalysis;
    benchmark: LotBenchmark;
  } | null> {
    try {
      const lot = await this.getLotData(lotId);
      if (!lot) return null;

      const [growth, feed, health, benchmark] = await Promise.all([
        this.predictGrowth(lot),
        this.optimizeFeed(lot),
        this.analyzeHealth(lot),
        this.benchmarkLot(lot),
      ]);

      // Générer alertes si nécessaire
      await this.generateIntelligentAlerts(lot, { growth, feed, health, benchmark });

      // Sauvegarder prédictions pour feedback loop
      await this.savePredictions(lot, growth);

      return { growth, feed, health, benchmark };
    } catch (error) {
      console.error('[LotIntelligenceAgent] Erreur analyse:', error);
      dataCollector.trackError(error as Error, { lotId, action: 'analyzeLot' });
      return null;
    }
  }

  /**
   * PRÉDICTION DE CROISSANCE
   */
  private async predictGrowth(lot: LotData): Promise<GrowthPrediction> {
    const standards = this.getBreedStandards(lot.race);
    const historicalData = await this.getHistoricalGrowthData(lot.user_id, lot.race);

    // Poids actuel (estimé ou réel)
    const currentWeight = lot.poids_moyen || this.estimateCurrentWeight(lot.age, standards);

    // Prédiction ML simplifiée (version heuristique)
    const daysRemaining = (42 - lot.age); // 6 semaines standard
    const predictedGrowth = daysRemaining * standards.growth_rate_per_day / 1000;
    const predictedFinalWeight = currentWeight + predictedGrowth;

    // Ajustement selon historique
    const historicalFactor = historicalData.avg_final_weight / standards.target_weight_6weeks;
    const adjustedPrediction = predictedFinalWeight * historicalFactor;

    // Calcul confiance
    const confidenceScore = this.calculatePredictionConfidence(lot, historicalData);

    // Fenêtre de vente optimale
    const optimalSaleWindow = this.calculateOptimalSaleWindow(
      lot,
      adjustedPrediction,
      standards
    );

    // Tendance de croissance
    const growthTrend = this.evaluateGrowthTrend(
      currentWeight,
      lot.age,
      standards
    );

    const predictedSaleTimestamp = Date.now() + daysRemaining * 24 * 60 * 60 * 1000;
    let predictedSaleDateObj: Date;

    if (isNaN(predictedSaleTimestamp) || predictedSaleTimestamp < 0) {
      predictedSaleDateObj = new Date(Date.now() + 42 * 24 * 60 * 60 * 1000);
    } else {
      predictedSaleDateObj = new Date(predictedSaleTimestamp);
      if (isNaN(predictedSaleDateObj.getTime())) {
        predictedSaleDateObj = new Date(Date.now() + 42 * 24 * 60 * 60 * 1000);
      }
    }

    const predictedSaleDateString = predictedSaleDateObj.toISOString();

    return {
      current_weight: currentWeight,
      predicted_final_weight: adjustedPrediction,
      predicted_sale_date: predictedSaleDateString,
      confidence_score: confidenceScore,
      optimal_sale_window: optimalSaleWindow,
      growth_trend: growthTrend,
    };
  }

  /**
   * OPTIMISATION ALIMENTATION
   */
  private async optimizeFeed(lot: LotData): Promise<FeedOptimization> {
    const standards = this.getBreedStandards(lot.race);
    const currentWeight = lot.poids_moyen || this.estimateCurrentWeight(lot.age, standards);

    const feedPerBirdPerDay = currentWeight * 0.025;
    const totalDailyFeed = feedPerBirdPerDay * lot.quantity;

    const actualConsumption = await this.getActualFeedConsumption(lot.id);

    const ic = actualConsumption.total_feed > 0 && currentWeight > 0 && lot.quantity > 0 ? actualConsumption.total_feed / (currentWeight * lot.quantity) : 0;
    const efficiency = (standards.fcr_target / ic) * 100;

    const recommendations = this.generateFeedRecommendations(
      ic,
      standards.fcr_target,
      efficiency
    );

    return {
      current_consumption: actualConsumption.daily_average,
      recommended_daily_feed: totalDailyFeed,
      indice_de_consommation: ic,
      efficiency_score: Math.min(efficiency, 100),
      recommendations,
    };
  }

  /**
   * ANALYSE SANTÉ
   */
  private async analyzeHealth(lot: LotData): Promise<HealthAnalysis> {
    const standards = this.getBreedStandards(lot.race);
    const mortalityRate = 0;
    const mortalityHistory = await this.getMortalityHistory(lot.id);
    const mortalityTrend = this.analyzeMortalityTrend(mortalityHistory);
    const riskLevel = this.calculateHealthRiskLevel(
      mortalityRate,
      standards.normal_mortality_rate,
      mortalityTrend
    );
    const predictedIssues = await this.predictHealthIssues(lot, mortalityRate, mortalityTrend);

    return {
      mortality_rate: mortalityRate,
      mortality_trend: mortalityTrend,
      risk_level: riskLevel,
      predicted_issues: predictedIssues,
    };
  }

  /**
   * BENCHMARK AVEC AUTRES LOTS
   */
  private async benchmarkLot(lot: LotData): Promise<LotBenchmark> {
    const { data: similarLots } = await supabase
      .from('lots')
      .select('*') 
      .eq('user_id', lot.user_id)
      .eq('race', lot.race)
      .eq('archived', true)
      .order('created_at', { ascending: false })
      .limit(20);

    if (!similarLots || similarLots.length === 0) {
      return {
        current_performance: 0,
        average_performance: 0,
        best_performance: 0,
        ranking_percentile: 50,
        comparison_insights: ['Pas encore de données de comparaison disponibles'],
      };
    }

    const performances = similarLots.map((l: any) => this.calculateLotPerformance(l));
    const currentPerformance = this.calculateLotPerformance(lot);
    const averagePerformance = performances.reduce((a: number, b: number) => a + b, 0) / performances.length;
    const bestPerformance = Math.max(...performances);
    const betterThan = performances.filter((p: number) => currentPerformance > p).length;
    const rankingPercentile = (betterThan / performances.length) * 100;
    const comparisonInsights = this.generateBenchmarkInsights(
      currentPerformance,
      averagePerformance,
      bestPerformance,
      rankingPercentile
    );

    return {
      current_performance: currentPerformance,
      average_performance: averagePerformance,
      best_performance: bestPerformance,
      ranking_percentile: rankingPercentile,
      comparison_insights: comparisonInsights,
    };
  }

  /**
   * GÉNÉRATION D'ALERTES INTELLIGENTES
   */
  private async generateIntelligentAlerts(
    lot: LotData,
    analysis: {
      growth: GrowthPrediction;
      feed: FeedOptimization;
      health: HealthAnalysis;
      benchmark: LotBenchmark;
    }
  ) {
    const alerts: Promise<any>[] = [];

    if (analysis.growth.growth_trend === 'poor' || analysis.growth.growth_trend === 'critical') {
      alerts.push(
        smartAlertSystem.createAlert({
          type: 'lot_growth_delayed' as any,
          context: {
            lot_name: lot.race,
            delay_percentage: ((analysis.benchmark.average_performance - analysis.benchmark.current_performance) / analysis.benchmark.average_performance * 100).toFixed(1),
          },
          relatedEntityType: 'lot',
          relatedEntityId: lot.id,
        })
      );
    }

    const daysToOptimal = Math.ceil(
      (new Date(analysis.growth.optimal_sale_window.start_date).getTime() - Date.now()) / (24 * 60 * 60 * 1000)
    );

    if (daysToOptimal >= 0 && daysToOptimal <= 7) {
      alerts.push(
        smartAlertSystem.alertOptimalSaleWindow(
          lot.id,
          lot.race,
          daysToOptimal,
          analysis.growth.optimal_sale_window.estimated_margin
        )
      );
    }

    if (analysis.health.risk_level === 'critical' || analysis.health.risk_level === 'high') {
      alerts.push(
        smartAlertSystem.alertHighMortality(
          lot.id,
          lot.race,
          analysis.health.mortality_rate,
          this.getBreedStandards(lot.race).normal_mortality_rate
        )
      );
    }

    if (analysis.feed.efficiency_score < 70) {
      alerts.push(
        smartAlertSystem.createAlert({
          type: 'lot_feed_consumption_abnormal' as any,
          context: {
            lot_name: lot.race,
            ic: analysis.feed.indice_de_consommation.toFixed(2), // Utiliser 'ic'
            efficiency: analysis.feed.efficiency_score.toFixed(0),
          },
          relatedEntityType: 'lot',
          relatedEntityId: lot.id,
        })
      );
    }

    await Promise.all(alerts);

    // --- NOUVEAU : Vérification proactive du stock pour le prochain stade ---
    await this.generateUpcomingFeedAlert(lot);
  }

  /**
   * NOUVEAU : Vérifie le stock pour le prochain stade d'alimentation et crée une alerte si nécessaire.
   */
  private async generateUpcomingFeedAlert(lot: LotData) {
    const WARNING_DAYS = 4; // Prévenir 4 jours à l'avance

    const STAGE_TRANSITIONS: Record<string, { nextStage: string, atAge: number, nextFeedName: string }> = {
      'starter': { nextStage: 'grower', atAge: 21, nextFeedName: 'Aliment Croissance' },
      'grower': { nextStage: 'finisher', atAge: 32, nextFeedName: 'Aliment Finition' },
      // Ajoutez d'autres transitions pour les pondeuses si nécessaire
    };

    const currentStage = this.getStageFromAge(lot.bird_type, lot.age);
    const transition = STAGE_TRANSITIONS[currentStage];

    if (!transition) return; // Pas de transition définie pour ce stade

    const daysUntilTransition = transition.atAge - lot.age;

    if (daysUntilTransition > 0 && daysUntilTransition <= WARNING_DAYS) {
      // Vérifier si l'aliment pour le prochain stade est en stock
      const { data: nextFeedStock, error } = await supabase
        .from('stock')
        .select('id')
        .eq('user_id', lot.user_id)
        .ilike('name', `%${transition.nextFeedName}%`) // Recherche flexible (ex: "Aliment Croissance")
        .gt('quantity', 0)
        .limit(1);

      if (error) {
        console.error(`[LotAgent] Erreur vérification stock pour ${transition.nextFeedName}`, error);
        return;
      }

      // Si aucun stock n'est trouvé, créer une alerte
      if (!nextFeedStock || nextFeedStock.length === 0) {
        await smartAlertSystem.createAlert({
          type: 'lot_next_feed_missing' as any,
          context: { lot_name: lot.race, next_feed_name: transition.nextFeedName, days: daysUntilTransition },
          relatedEntityType: 'lot',
          relatedEntityId: lot.id,
        });
      }
    }
  }

  /**
   * SAUVEGARDER PRÉDICTIONS POUR FEEDBACK LOOP
   */
  private async savePredictions(lot: LotData, growth: GrowthPrediction) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from('predictions').insert({
        user_id: user.id,
        farm_id: lot.farm_id,
        prediction_type: 'lot_growth',
        target_entity_type: 'lot',
        target_entity_id: lot.id,
        predicted_value: {
          final_weight: growth.predicted_final_weight,
          sale_date: growth.predicted_sale_date,
          optimal_window: growth.optimal_sale_window,
        },
        confidence_score: growth.confidence_score,
        model_version: 'heuristic_v1',
        status: 'pending',
      });
    } catch (error) {
      console.error('[LotIntelligenceAgent] Erreur sauvegarde prédiction:', error);
    }
  }

  /**
   * MÉTHODES UTILITAIRES
   */

  private async getLotData(lotId: string): Promise<LotData | null> {
    const { data, error } = await supabase
      .from('lots')
      .select('id, name, breed, bird_type, quantity, age, target_weight, entry_date, created_at, user_id')
      .eq('id', lotId)
      // --- CORRECTION : Utiliser maybeSingle() au lieu de single() ---
      // single() génère une erreur si aucune ligne n'est trouvée (PGRST116).
      // maybeSingle() retourne simplement null, ce qui est plus sûr et évite le plantage.
      .maybeSingle();

    if (error) {
      console.error(`[LotIntelligenceAgent] Erreur getLotData pour ${lotId}:`, error);
      return null;
    }

    // --- AJOUT : Gérer le cas où aucun lot n'est trouvé ---
    if (!data) {
      console.warn(`[LotIntelligenceAgent] Aucun lot trouvé pour l'ID: ${lotId}`);
      return null;
    }

    return {
      id: data.id,
      race: data.breed,
      bird_type: data.bird_type,
      quantity: data.quantity,
      age: data.age,
      poids_moyen: data.target_weight,
      entry_date: data.entry_date,
      created_at: data.created_at,
      user_id: data.user_id,
    };
  }

  private getBreedStandards(race: string) {
    if (!race || typeof race !== 'string') {
      return BREED_STANDARDS['default'];
    }
    const normalized = race.toLowerCase().replace(/[^a-z]/g, '_');
    return BREED_STANDARDS[normalized] || BREED_STANDARDS['default'];
  }

  private estimateCurrentWeight(ageDays: number, standards: any): number {
    return (standards.growth_rate_per_day * ageDays) / 1000;
  }

  private async getHistoricalGrowthData(userId: string, race: string) {
    const { data } = await supabase
      .from('lots')
      .select('target_weight, age')
      .eq('user_id', userId)
      .eq('race', race)
      .eq('archived', true)
      .not('target_weight', 'is', null);

    const avgFinalWeight = data && data.length > 0
      ? data.reduce((sum: number, l: any) => sum + (l.target_weight || 0), 0) / data.length
      : 2.0;

    return {
      count: data?.length || 0,
      avg_final_weight: avgFinalWeight,
    };
  }

  private calculatePredictionConfidence(lot: LotData, historicalData: any): number {
    let confidence = 50;
    if (lot.poids_moyen) confidence += 20;
    if (historicalData.count > 5) confidence += 30;
    else if (historicalData.count > 0) confidence += 15;
    return Math.min(confidence, 95);
  }

  private calculateOptimalSaleWindow(lot: LotData, predictedWeight: number, standards: any) {
    const targetWeight = standards.target_weight_6weeks;
    const daysToTarget = ((targetWeight - (lot.poids_moyen || 0.5)) / (standards.growth_rate_per_day / 1000));
    const startDate = new Date(Date.now() + (daysToTarget - 2) * 24 * 60 * 60 * 1000);
    const endDate = new Date(Date.now() + (daysToTarget + 3) * 24 * 60 * 60 * 1000);
    const estimatedMargin = 15;
    return {
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString(),
      estimated_margin: estimatedMargin,
    };
  }

  private evaluateGrowthTrend(currentWeight: number, ageDays: number, standards: any): GrowthPrediction['growth_trend'] {
    const expectedWeight = this.estimateCurrentWeight(ageDays, standards);
    const ratio = currentWeight / expectedWeight;
    if (ratio > 1.1) return 'excellent';
    if (ratio > 1.0) return 'good';
    if (ratio > 0.9) return 'average';
    if (ratio > 0.8) return 'poor';
    return 'critical';
  }

  // --- NOUVEAU : Fonction utilitaire pour déterminer le stade ---
  private getStageFromAge(birdType: string, age: number): 'starter' | 'grower' | 'finisher' | 'layer' | 'pre-layer' {
    const type = birdType?.toLowerCase() || 'broiler';
    if (type === 'broiler' || type === 'poulet de chair') {
      if (age <= 21) return 'starter';
      if (age <= 32) return 'grower';
      return 'finisher';
    }
    // Ajouter la logique pour les pondeuses ici si nécessaire
    return 'starter';
  }

  private async getActualFeedConsumption(lotId: string) {
    return {
      daily_average: 50,
      total_feed: 1500,
    };
  }

  private generateFeedRecommendations(ic: number, targetIc: number, efficiency: number): string[] {
    const recommendations: string[] = [];
    if (efficiency < 70) {
      recommendations.push('⚠️ FCR élevé: vérifier qualité de l\'aliment');
      recommendations.push('Contrôler la température du poulailler');
      recommendations.push('Éliminer le gaspillage d\'aliment');
    } else if (efficiency < 85) {
      recommendations.push('FCR correct, possibilité d\'amélioration');
      recommendations.push('Optimiser les horaires de distribution');
    } else {
      recommendations.push('✅ Excellente efficacité alimentaire');
      recommendations.push('Continuer les bonnes pratiques actuelles');
    }
    return recommendations;
  }

  private async getMortalityHistory(lotId: string) {
    const { data } = await supabase
      .from('daily_updates')
      .select('mortalite, date')
      .eq('lot_id', lotId)
      .order('date', { ascending: true });
    return data || [];
  }

  private analyzeMortalityTrend(history: any[]): HealthAnalysis['mortality_trend'] {
    if (history.length < 3) return 'stable';
    const recent = history.slice(-3).map(h => h.mortalite);
    const isImproving = recent.every((val, i) => i === 0 || val <= recent[i - 1]);
    const isWorsening = recent.every((val, i) => i === 0 || val >= recent[i - 1]);
    if (isImproving) return 'improving';
    if (isWorsening) return 'worsening';
    return 'stable';
  }

  private calculateHealthRiskLevel(
    mortalityRate: number,
    normalRate: number,
    trend: HealthAnalysis['mortality_trend']
  ): HealthAnalysis['risk_level'] {
    if (mortalityRate > normalRate * 3) return 'critical';
    if (mortalityRate > normalRate * 2) return 'high';
    if (mortalityRate > normalRate * 1.5 || trend === 'worsening') return 'medium';
    return 'low';
  }

  private async predictHealthIssues(lot: LotData, mortalityRate: number, trend: string) {
    const issues: HealthAnalysis['predicted_issues'] = [];
    if (trend === 'worsening') {
      issues.push({
        issue: 'Propagation maladie possible',
        probability: 65,
        days_to_occurrence: 3,
      });
    }
    if (mortalityRate > 7) {
      issues.push({
        issue: 'Épidémie potentielle',
        probability: 75,
        days_to_occurrence: 2,
      });
    }
    return issues;
  }

  private calculateLotPerformance(lot: any): number {
    const survivalRate = lot.initial_quantity > 0 ? (lot.quantity / lot.initial_quantity) * 100 : 100;
    const weightScore = (lot.target_weight || 2.0) / 2.0 * 50;
    const survivalScore = survivalRate / 100 * 50;
    return weightScore + survivalScore;
  }

  private generateBenchmarkInsights(
    current: number,
    average: number,
    best: number,
    percentile: number
  ): string[] {
    const insights: string[] = [];
    if (percentile > 75) {
      insights.push('🏆 Performances excellentes, dans le top 25%');
    } else if (percentile > 50) {
      insights.push('✅ Performances au-dessus de la moyenne');
    } else if (percentile > 25) {
      insights.push('📊 Performances moyennes, marge d\'amélioration');
    } else {
      insights.push('⚠️ Performances en-dessous de la moyenne');
    }
    const improvementPotential = ((best - current) / best * 100).toFixed(0);
    insights.push(`Potentiel d'amélioration: +${improvementPotential}%`);
    return insights;
  }

  /**
   * SURVEILLANCE CONTINUE DE TOUS LES LOTS
   */
  public async monitorAllLots(userId: string) {
    try {
      const { data: lots } = await supabase
        .from('lots')
        .select('id')
        .eq('user_id', userId)
        .eq('archived', false);

      if (!lots) return;

      for (const lot of lots) {
        await this.analyzeLot(lot.id);
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      console.log(`✅ [LotAgent] ${lots.length} lots analysés`);
    } catch (error) {
      console.error('[LotIntelligenceAgent] Erreur monitoring:', error);
    }
  }
}

// Types pour l'interface
interface IntelligenceAgent {
  analyze(entityId: string): Promise<any>;
  getMetrics(): Promise<AgentMetrics>;
  isActive(): boolean;
}

interface AgentMetrics {
  total_analyses: number;
  success_rate: number;
  average_confidence: number;
  alerts_generated: number;
}

// Implémentation de l'interface IntelligenceAgent
class LotIntelligenceAgentWrapper implements IntelligenceAgent {
  private agent = LotIntelligenceAgent.getInstance();

  async analyze(entityId: string): Promise<any> {
    return await this.agent.analyzeLot(entityId);
  }

  async getMetrics(): Promise<AgentMetrics> {
    return {
      total_analyses: 0,
      success_rate: 95,
      average_confidence: 85,
      alerts_generated: 0,
    };
  }

  isActive(): boolean {
    return true;
  }
}

// Export singleton
export const lotIntelligenceAgent = LotIntelligenceAgent.getInstance();

// Export wrapper pour l'interface commune
export const lotIntelligenceAgentWrapper = new LotIntelligenceAgentWrapper();

// Hook React
export const useLotIntelligence = () => {
  return {
    analyzeLot: (lotId: string) => lotIntelligenceAgent.analyzeLot(lotId),
    monitorAllLots: (userId: string) => lotIntelligenceAgent.monitorAllLots(userId),
    generateUpcomingFeedAlerts: (userId: string) => lotIntelligenceAgent.generateUpcomingFeedAlerts(userId),
  };
};