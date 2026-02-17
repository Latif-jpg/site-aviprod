// src/intelligence/agents/LotIntelligenceAgent.ts
// --- CORRECTION : Utiliser une seule instance de Supabase ---
import { supabase } from '../../../config';
import { useState, useEffect } from 'react';
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
  initial_quantity?: number;
  age: number;
  poids_moyen?: number;
  mortality?: number;
  entry_date: string;
  created_at: string;
  user_id: string;
  farm_id?: string;
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

  private constructor() { }

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

    // Prédiction basée sur la courbe biologique
    const predictedFinalWeight = this.estimateCurrentWeight(42, standards);

    // Ajustement selon le poids actuel (si le lot est en retard ou en avance)
    const expectedWeightAtCurrentAge = this.estimateCurrentWeight(lot.age, standards);
    const performanceFactor = currentWeight / expectedWeightAtCurrentAge;
    const adjustedPrediction = predictedFinalWeight * performanceFactor;

    // Calcul confiance
    const confidenceScore = this.calculatePredictionConfidence(lot, historicalData);

    // Fenêtre de vente optimale
    const optimalSaleWindow = await this.calculateOptimalSaleWindow(
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

    const daysRemaining = Math.max(0, 42 - lot.age);
    const predictedSaleTimestamp = Date.now() + daysRemaining * 24 * 60 * 60 * 1000;
    const predictedSaleDateString = new Date(predictedSaleTimestamp).toISOString();

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

    // Consommation dynamique: les oiseaux mangent entre 5% et 9% de leur poids vif selon l'âge
    // Plus ils sont jeunes, plus le ratio est élevé
    const consumptionRatio = Math.max(0.05, 0.12 - (lot.age * 0.0015));
    const feedPerBirdPerDay = currentWeight * consumptionRatio;
    const totalDailyFeed = feedPerBirdPerDay * lot.quantity;

    const actualConsumption = await this.getActualFeedConsumption(lot.id, lot);

    const ic = actualConsumption.total_feed > 0 && currentWeight > 0 && lot.quantity > 0 ? actualConsumption.total_feed / (currentWeight * lot.quantity) : 0;
    const efficiency = (standards.fcr_target / ic) * 100;

    const recommendations = this.generateFeedRecommendations(
      ic,
      standards.fcr_target,
      efficiency
    );

    // --- NOUVEAU : Vérifier si le prix du stock est manquant ---
    try {
      const { data: stockData } = await supabase
        .from('stock')
        .select('prix_unitaire')
        .eq('user_id', lot.user_id)
        .ilike('nom', '%aliment%')
        .limit(1);

      if (!stockData || stockData.length === 0 || !stockData[0].prix_unitaire) {
        recommendations.unshift('💡 Ajoutez le prix de votre aliment en stock pour des calculs de marge précis');
      }
    } catch (e) { }

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

    // Récupérer l'historique de mortalité des 30 derniers jours
    const mortalityHistory = await this.getMortalityHistory(lot.id);

    // Calculer le taux de mortalité moyen à partir de l'historique
    let mortalityRate = 0;
    if (mortalityHistory && mortalityHistory.length > 0) {
      // Filtrer les 30 derniers jours
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const recentHistory = mortalityHistory.filter(record => {
        const recordDate = new Date(record.date);
        return recordDate >= thirtyDaysAgo;
      });


      if (recentHistory.length > 0) {
        const totalMortality = recentHistory.reduce((sum, record) => sum + (record.mortalite || 0), 0);
        mortalityRate = (lot.initial_quantity && lot.initial_quantity > 0) ? (totalMortality / lot.initial_quantity) * 100 : 0;
        console.log(`[LotAgent] Taux de mortalité calculé pour lot ${lot.id}: ${mortalityRate.toFixed(2)}% (${recentHistory.length} jours de données)`);
      }
    }

    // Fallback : utiliser le taux de mortalité du lot si aucune donnée d'historique
    if (mortalityRate === 0 && lot.mortality && lot.initial_quantity) {
      mortalityRate = (lot.mortality / lot.initial_quantity) * 100;
      console.log(`[LotAgent] Utilisation du taux de mortalité du lot: ${mortalityRate.toFixed(2)}%`);
    }

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
        farm_id: lot.farm_id || lot.user_id,
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
      .maybeSingle();

    if (error) {
      console.error(`[LotIntelligenceAgent] Erreur getLotData pour ${lotId}:`, error);
      return null;
    }

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

  /**
   * ESTIMATION DU POIDS BASÉ SUR UNE COURBE SIGMOÏDE (GOMPERTZ SIMPLIFIÉE)
   * Plus réaliste que la croissance linéaire.
   */
  private estimateCurrentWeight(ageDays: number, standards: any): number {
    const k = 0.08;
    const m = 28;
    const targetWeight = standards.target_weight_8weeks || 2.8;
    const weight = targetWeight / (1 + Math.exp(-k * (ageDays - m)));
    return Math.max(0.040, weight);
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

  private async calculateOptimalSaleWindow(lot: LotData, predictedWeight: number, standards: any) {
    let sellingPricePerKg = 2500;
    let feedCostPerKg = 400;
    let isDefaultPrice = true;

    // --- NOUVEAU : Récupération dynamique du prix de l'aliment en stock ---
    try {
      const { data: stockData } = await supabase
        .from('stock')
        .select('prix_unitaire')
        .eq('user_id', lot.user_id)
        .ilike('nom', '%aliment%')
        .order('updated_at', { ascending: false })
        .limit(1);

      if (stockData && stockData.length > 0 && stockData[0].prix_unitaire > 0) {
        feedCostPerKg = stockData[0].prix_unitaire;
        isDefaultPrice = false;
        console.log(`💰 [IA Agent] Prix aliment réel trouvé : ${feedCostPerKg} CFA/kg`);
      }
    } catch (e) {
      console.warn('Impossible de récupérer le prix de stock, utilisation du défaut.');
    }

    let currentWeight = lot.poids_moyen || this.estimateCurrentWeight(lot.age, standards);
    let optimalStartDate: Date | null = null;
    let optimalEndDate: Date | null = null;

    const expectedAtCurrentAge = this.estimateCurrentWeight(lot.age, standards);
    const performanceFactor = currentWeight / (expectedAtCurrentAge || 0.1);

    for (let i = 0; i < 45; i++) {
      const simulatedAge = lot.age + i;
      const weightToday = this.estimateCurrentWeight(simulatedAge, standards) * performanceFactor;
      const weightTomorrow = this.estimateCurrentWeight(simulatedAge + 1, standards) * performanceFactor;
      const dailyWeightGainKg = weightTomorrow - weightToday;

      const consumptionRatio = Math.max(0.05, 0.12 - (simulatedAge * 0.0015));
      const dailyFeedCost = weightToday * consumptionRatio * feedCostPerKg;
      const dailyRevenueGain = dailyWeightGainKg * sellingPricePerKg;

      if (dailyRevenueGain > dailyFeedCost && !optimalStartDate && simulatedAge >= 35) {
        optimalStartDate = new Date(Date.now() + i * 24 * 60 * 60 * 1000);
      }

      if (dailyRevenueGain < dailyFeedCost && optimalStartDate && !optimalEndDate) {
        optimalEndDate = new Date(Date.now() + i * 24 * 60 * 60 * 1000);
        break;
      }
    }

    if (!optimalStartDate) {
      optimalStartDate = new Date(Date.now() + Math.max(0, 42 - lot.age) * 24 * 60 * 60 * 1000);
      optimalEndDate = new Date(optimalStartDate.getTime() + 5 * 24 * 60 * 60 * 1000);
    } else if (!optimalEndDate) {
      optimalEndDate = new Date(optimalStartDate.getTime() + 7 * 24 * 60 * 60 * 1000);
    }

    return {
      start_date: optimalStartDate.toISOString(),
      end_date: optimalEndDate.toISOString(),
      estimated_margin: (sellingPricePerKg * predictedWeight) - (feedCostPerKg * predictedWeight * 1.7),
      use_default_price: isDefaultPrice,
      used_feed_price: feedCostPerKg,
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

  private getStageFromAge(birdType: string, age: number): 'starter' | 'grower' | 'finisher' | 'layer' | 'pre-layer' {
    const type = birdType?.toLowerCase() || 'broiler';
    if (type === 'broiler' || type === 'poulet de chair') {
      if (age <= 21) return 'starter';
      if (age <= 32) return 'grower';
      return 'finisher';
    }
    return 'starter';
  }

  /**
   * Obtenir la consommation alimentaire réelle du lot
   * Interroge stock_consumption_tracking pour les 7 derniers jours
   * Fallback vers calcul théorique si aucune donnée n'existe
   */
  private async getActualFeedConsumption(lotId: string, lot: LotData) {
    try {
      // Tenter de récupérer les données réelles de consommation des 7 derniers jours
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: consumptionData, error } = await supabase
        .from('stock_consumption_tracking')
        .select('quantity_consumed, date')
        .eq('lot_id', lotId)
        .gte('date', sevenDaysAgo.toISOString().split('T')[0])
        .order('date', { ascending: false });

      if (!error && consumptionData && consumptionData.length > 0) {
        // Calculer la moyenne journalière à partir des données réelles
        const totalConsumed = consumptionData.reduce((sum, record) => sum + (record.quantity_consumed || 0), 0);
        const daysWithData = consumptionData.length;
        const dailyAverage = totalConsumed / daysWithData;

        console.log(`[LotAgent] Consommation réelle trouvée pour lot ${lotId}: ${dailyAverage.toFixed(2)} kg/jour (${daysWithData} jours de données)`);

        return {
          daily_average: dailyAverage,
          total_feed: totalConsumed,
        };
      }

      // Fallback : Aucune donnée réelle, utiliser le calcul théorique avec les données du lot déjà disponibles
      console.log(`[LotAgent] Aucune donnée de consommation réelle pour lot ${lotId}, utilisation du calcul théorique`);

      const standards = this.getBreedStandards(lot.bird_type || 'broilers');
      const currentWeight = lot.poids_moyen || this.estimateCurrentWeight(lot.age, standards);

      // Calcul théorique : 5-12% du poids vif selon l'âge
      const consumptionRatio = Math.max(0.05, 0.12 - (lot.age * 0.0015));
      const feedPerBirdPerDay = (currentWeight / 1000) * consumptionRatio; // Convertir g en kg
      const dailyAverage = feedPerBirdPerDay * lot.quantity;
      const totalFeed = dailyAverage * 7; // Estimation sur 7 jours

      console.log(`[LotAgent] Calcul théorique - Âge: ${lot.age}j, Poids: ${currentWeight}g, Ratio: ${(consumptionRatio * 100).toFixed(1)}%, Conso/oiseau: ${feedPerBirdPerDay.toFixed(3)}kg, Total: ${dailyAverage.toFixed(2)}kg/jour`);

      return {
        daily_average: dailyAverage,
        total_feed: totalFeed,
      };

    } catch (error) {
      console.error('[LotAgent] Erreur lors de la récupération de la consommation:', error);
    }

    // Fallback ultime : valeurs par défaut (ne devrait jamais arriver)
    console.warn(`[LotAgent] Utilisation du fallback ultime (50kg/jour) pour lot ${lotId}`);
    return {
      daily_average: 50,
      total_feed: 350,
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

// Hook pour les actions de l'agent
export const useLotIntelligenceActions = () => {
  return {
    analyzeLot: (lotId: string) => lotIntelligenceAgent.analyzeLot(lotId),
    monitorAllLots: (userId: string) => lotIntelligenceAgent.monitorAllLots(userId),
    generateUpcomingFeedAlerts: (userId: string) => lotIntelligenceAgent.monitorAllLots(userId), // Placeholder
  };
};

/* --- NOUVEAU : Hook d'observation standard pour le Dashboard --- */
export const useLotIntelligence = (lotId: string) => {
  const [lot, setLot] = useState<any>(null);
  const [insights, setInsights] = useState<any[]>([]);
  const [kpis, setKpis] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!lotId) {
      setLoading(false);
      return;
    }

    const loadData = async () => {
      setLoading(true);
      try {
        const result = await lotIntelligenceAgent.analyzeLot(lotId);

        // Récupérer les données fraîches du lot
        const { data: lotData } = await supabase
          .from('lots')
          .select('*, taux_mortalite')
          .eq('id', lotId)
          .single();

        setLot(lotData);

        if (result) {
          // Transformer le résultat de l'agent pour correspondre au format attendu par l'UI
          setInsights([
            ...(result.growth as any).recommendations || [],
            ...result.feed.recommendations || [],
            ...result.health.predicted_issues.map((i: any) => ({
              category: 'health_prediction',
              title: i.issue,
              probability: i.probability,
              days_to_occurrence: i.days_to_occurrence
            }))
          ]);

          setKpis({
            ...result.growth,
            ...result.feed,
            ...result.health,
            ic: result.feed.indice_de_consommation,
            efficiency_score: result.feed.efficiency_score,
            benchmark: result.benchmark
          });
        }
      } catch (error) {
        console.error('Erreur useLotIntelligence:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [lotId]);

  return { lot, insights, kpis, loading };
};