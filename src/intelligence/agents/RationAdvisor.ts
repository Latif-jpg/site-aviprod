import React, { useCallback, useMemo } from 'react';
import { supabase } from '../../../config';

import { smartAlertSystem } from '../core/SmartAlertSystem';
import { dataCollector } from '../core/DataCollector';

/**
 * RATION ADVISOR AGENT
 *
 * Agent IA spécialisé dans l'optimisation des rations alimentaires:
 * - Formulation automatique de rations équilibrées
 * - Adaptation selon âge, race et conditions
 * - Optimisation coût-efficacité
 * - Suivi consommation et ajustements
 * - Recommandations basées sur performances
 */

// ==================== TYPES ====================

interface RationFormula {
  id: string;
  name: string;
  race: string;
  phase: string;
  age_range: { min: number; max: number };
  ingredients: Array<{
    ingredient_id: string;
    name: string;
    percentage: number;
    cost_per_kg: number;
    nutritional_value: {
      protein: number;
      energy: number;
      calcium?: number;
      phosphorus?: number;
    };
  }>;
  nutritional_targets: {
    protein_min: number;
    protein_max: number;
    energy_min: number;
    energy_max: number;
    calcium_min?: number;
    calcium_max?: number;
  };
  total_cost_per_kg: number;
  efficiency_score: number;
  created_at: string;
  updated_at: string;
}

interface RationOptimization {
  current_ration: RationFormula;
  optimized_ration: RationFormula;
  cost_savings: number;
  performance_improvement: number;
  ingredient_substitutions: Array<{
    original: string;
    replacement: string;
    reason: string;
    cost_impact: number;
  }>;
  recommendations: string[];
}

interface FeedEfficiencyAnalysis {
  lot_id: string;
  period: string;
  feed_conversion_ratio: number;
  average_daily_gain: number;
  cost_per_kg_gain: number;
  efficiency_score: number; // 0-100
  optimization_opportunities: string[];
  recommended_adjustments: Array<{
    type: 'ingredient' | 'quantity' | 'timing';
    description: string;
    expected_impact: number;
  }>;
}

interface IngredientMarketData {
  ingredient_id: string;
  name: string;
  current_price: number;
  price_trend: 'stable' | 'increasing' | 'decreasing';
  availability: 'high' | 'medium' | 'low';
  alternatives: Array<{
    alternative_id: string;
    name: string;
    price: number;
    nutritional_equivalence: number;
  }>;
}

// ==================== DONNÉES DE RÉFÉRENCE ====================

const STANDARD_RATIONS: Record<string, Record<string, Partial<RationFormula>>> = {
  'poulet_de_chair': {
    'démarrage': {
      nutritional_targets: {
        protein_min: 20, protein_max: 24,
        energy_min: 2800, energy_max: 3200,
        calcium_min: 0.8, calcium_max: 1.2
      }
    },
    'croissance': {
      nutritional_targets: {
        protein_min: 18, protein_max: 22,
        energy_min: 3000, energy_max: 3400,
        calcium_min: 0.7, calcium_max: 1.1
      }
    },
    'finition': {
      nutritional_targets: {
        protein_min: 16, protein_max: 20,
        energy_min: 3200, energy_max: 3600,
        calcium_min: 0.6, calcium_max: 1.0
      }
    }
  },
  'pondeuse': {
    'démarrage': {
      nutritional_targets: {
        protein_min: 18, protein_max: 22,
        energy_min: 2700, energy_max: 3100,
        calcium_min: 0.9, calcium_max: 1.3
      }
    },
    'croissance': {
      nutritional_targets: {
        protein_min: 15, protein_max: 18,
        energy_min: 2800, energy_max: 3200,
        calcium_min: 0.8, calcium_max: 1.2
      }
    },
    'ponte': {
      nutritional_targets: {
        protein_min: 16, protein_max: 18,
        energy_min: 2700, energy_max: 2900,
        calcium_min: 3.5, calcium_max: 4.5
      }
    }
  },
  'breeders': {
    'démarrage': {
      nutritional_targets: {
        protein_min: 18, protein_max: 22,
        energy_min: 2700, energy_max: 3100,
        calcium_min: 0.9, calcium_max: 1.3
      }
    },
    'croissance': {
      nutritional_targets: {
        protein_min: 15, protein_max: 18,
        energy_min: 2800, energy_max: 3200,
        calcium_min: 0.8, calcium_max: 1.2
      }
    },
    'ponte': {
      nutritional_targets: {
        protein_min: 16, protein_max: 18,
        energy_min: 2700, energy_max: 2900,
        calcium_min: 3.5, calcium_max: 4.5
      }
    }
  }
};

const INGREDIENT_DATABASE: Record<string, {
  name: string;
  nutritional_value: {
    protein: number;
    energy: number;
    calcium?: number;
    phosphorus?: number;
  };
  typical_cost_per_kg: number;
  availability: 'high' | 'medium' | 'low';
}> = {
  'mais': {
    name: 'Maïs',
    nutritional_value: { protein: 9, energy: 3400 },
    typical_cost_per_kg: 250,
    availability: 'high'
  },
  'soja': {
    name: 'Tourteau de soja',
    nutritional_value: { protein: 45, energy: 2400 },
    typical_cost_per_kg: 450,
    availability: 'medium'
  },
  'blé': {
    name: 'Blé',
    nutritional_value: { protein: 12, energy: 3200 },
    typical_cost_per_kg: 300,
    availability: 'high'
  },
  'coquilles_huitres': {
    name: 'Coquilles d\'huîtres',
    nutritional_value: { protein: 0, energy: 0, calcium: 38 },
    typical_cost_per_kg: 150,
    availability: 'medium'
  },
  'phosphate': {
    name: 'Phosphate bicalcique',
    nutritional_value: { protein: 0, energy: 0, calcium: 18, phosphorus: 21 },
    typical_cost_per_kg: 800,
    availability: 'low'
  }
};

// ==================== CLASSE PRINCIPALE ====================

class RationAdvisor {
  private static instance: RationAdvisor;

  private constructor() {}

  public static getInstance(): RationAdvisor {
    if (!RationAdvisor.instance) {
      RationAdvisor.instance = new RationAdvisor();
    }
    return RationAdvisor.instance;
  }

  /**
   * FORMULATION AUTOMATIQUE DE RATION
   */
  public async formulateRation(
    race: string,
    phase: string,
    quantity: number,
    constraints?: {
      max_cost_per_kg?: number;
      preferred_ingredients?: string[];
      excluded_ingredients?: string[];
    }
  ): Promise<RationFormula | null> {
    try {
      // 1. Récupérer standards nutritionnels
      const standards = this.getNutritionalStandards(race, phase);
      if (!standards || !standards.nutritional_targets) {
        console.error(`[RationAdvisor] Standards non trouvés pour ${race}/${phase}`);
        return null;
      }

      // 2. Optimiser composition des ingrédients
      const optimizedIngredients = await this.optimizeIngredientComposition(
        standards.nutritional_targets,
        constraints
      );

      // 3. Calculer coûts et métriques
      const totalCost = optimizedIngredients.reduce(
        (sum, ing) => sum + (ing.cost_per_kg * ing.percentage / 100), 0
      );

      const efficiencyScore = this.calculateRationEfficiency(optimizedIngredients, standards);

      // 4. Créer formule complète
      const ration: RationFormula = {
        id: `ration_${race}_${phase}_${Date.now()}`,
        name: `Ration ${race} - ${phase}`,
        race,
        phase,
        age_range: this.getAgeRangeForPhase(phase),
        ingredients: optimizedIngredients,
        nutritional_targets: standards.nutritional_targets!,
        total_cost_per_kg: totalCost,
        efficiency_score: efficiencyScore,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // 5. Sauvegarder pour apprentissage
      await this.saveRationFormula(ration);

      return ration;
    } catch (error) {
      console.error('[RationAdvisor] Erreur formulation ration:', error);
      dataCollector.trackError(error as Error, { race, phase, quantity });
      return null;
    }
  }

  /**
   * OPTIMISATION DE RATION EXISTANTE
   */
  public async optimizeExistingRation(
    currentRationId: string,
    performanceData?: {
      fcr: number;
      avg_daily_gain: number;
      mortality_rate: number;
    }
  ): Promise<RationOptimization | null> {
    try {
      // 1. Récupérer ration actuelle
      const currentRation = await this.getRationById(currentRationId);
      if (!currentRation) return null;

      // 2. Analyser performance si données disponibles
      let performanceAdjustment = 1.0;
      if (performanceData) {
        performanceAdjustment = this.calculatePerformanceAdjustment(performanceData);
      }

      // 3. Optimiser composition
      const optimizedIngredients = await this.optimizeIngredientsForCostEfficiency(
        currentRation.ingredients,
        currentRation.nutritional_targets,
        performanceAdjustment
      );

      // 4. Calculer nouvelle formule
      const optimizedRation: RationFormula = {
        ...currentRation,
        id: `optimized_${currentRation.id}_${Date.now()}`,
        name: `${currentRation.name} (Optimisée)`,
        ingredients: optimizedIngredients,
        total_cost_per_kg: optimizedIngredients.reduce(
          (sum, ing) => sum + (ing.cost_per_kg * ing.percentage / 100), 0
        ),
        efficiency_score: this.calculateRationEfficiency(optimizedIngredients, currentRation),
        updated_at: new Date().toISOString()
      };

      // 5. Calculer économies et améliorations
      const costSavings = currentRation.total_cost_per_kg - optimizedRation.total_cost_per_kg;
      const performanceImprovement = optimizedRation.efficiency_score - currentRation.efficiency_score;

      // 6. Identifier substitutions
      const ingredientSubstitutions = this.identifyIngredientSubstitutions(
        currentRation.ingredients,
        optimizedIngredients
      );

      // 7. Générer recommandations
      const recommendations = this.generateOptimizationRecommendations(
        optimizedRation,
        costSavings,
        performanceImprovement
      );

      const optimization: RationOptimization = {
        current_ration: currentRation,
        optimized_ration: optimizedRation,
        cost_savings: costSavings,
        performance_improvement: performanceImprovement,
        ingredient_substitutions: ingredientSubstitutions,
        recommendations
      };

      // 8. Sauvegarder optimisation
      await this.saveOptimizationResult(optimization);

      return optimization;
    } catch (error) {
      console.error('[RationAdvisor] Erreur optimisation ration:', error);
      return null;
    }
  }

  /**
   * ANALYSE D'EFFICACITÉ ALIMENTAIRE
   */
  public async analyzeFeedEfficiency(
    lotId: string,
    userId: string,
    period: string = 'month'
  ): Promise<FeedEfficiencyAnalysis | null> {
    try {
      // 1. Récupérer données de consommation et performance
      const consumptionData = await this.getLotConsumptionData(lotId, period);
      const performanceData = await this.getLotPerformanceData(lotId, period);

      if (!consumptionData || !performanceData) return null;

      // 2. Calculer métriques d'efficacité
      const feedConversionRatio = consumptionData.total_feed / performanceData.total_weight_gain;
      const averageDailyGain = performanceData.total_weight_gain / consumptionData.days_count;
      const costPerKgGain = (consumptionData.total_cost / performanceData.total_weight_gain) * 1000;

      // 3. Calculer score d'efficacité (0-100)
      const efficiencyScore = this.calculateEfficiencyScore(
        feedConversionRatio,
        averageDailyGain,
        costPerKgGain,
        performanceData.race
      );

      // 4. Identifier opportunités d'optimisation
      const optimizationOpportunities = this.identifyEfficiencyOpportunities(
        consumptionData,
        performanceData,
        efficiencyScore
      );

      // 5. Générer recommandations d'ajustement
      const recommendedAdjustments = await this.generateEfficiencyRecommendations(
        consumptionData,
        performanceData,
        efficiencyScore,
        lotId
      );

      const analysis: FeedEfficiencyAnalysis = {
        lot_id: lotId,
        period,
        feed_conversion_ratio: feedConversionRatio,
        average_daily_gain: averageDailyGain,
        cost_per_kg_gain: costPerKgGain,
        efficiency_score: efficiencyScore,
        optimization_opportunities: optimizationOpportunities,
        recommended_adjustments: recommendedAdjustments
      };

      // 6. Générer alertes si nécessaire
      if (efficiencyScore < 70) {
        await smartAlertSystem.createAlert({
          type: 'lot_feed_efficiency_low' as any,
          context: {
            lot_id: lotId,
            fcr: feedConversionRatio.toFixed(2),
            efficiency: efficiencyScore.toFixed(0),
            cost_per_kg: costPerKgGain.toFixed(0)
          },
          relatedEntityType: 'lot',
          relatedEntityId: lotId,
        });
      }

      return analysis;
    } catch (error) {
      console.error('[RationAdvisor] Erreur analyse efficacité:', error);
      return null;
    }
  }

  /**
   * MISE À JOUR PRIX INGRÉDIENTS
   */
  public async updateIngredientPrices(marketData: IngredientMarketData[]): Promise<void> {
    try {
      for (const data of marketData) {
        await supabase.from('ingredient_prices').upsert({
          ingredient_id: data.ingredient_id,
          name: data.name,
          current_price: data.current_price,
          price_trend: data.price_trend,
          availability: data.availability,
          alternatives: data.alternatives,
          updated_at: new Date().toISOString()
        }, { onConflict: 'ingredient_id' });
      }

      console.log(`[RationAdvisor] ${marketData.length} prix d'ingrédients mis à jour`);
    } catch (error) {
      console.error('[RationAdvisor] Erreur mise à jour prix:', error);
    }
  }

  // ==================== MÉTHODES D'OPTIMISATION ====================

  private async optimizeIngredientComposition(
    targets: RationFormula['nutritional_targets'],
    constraints?: any
  ): Promise<RationFormula['ingredients']> {
    // Algorithme d'optimisation linéaire simplifié
    // En production: utiliser un solveur d'optimisation (ex: Google OR-Tools)

    const ingredients = Object.entries(INGREDIENT_DATABASE).map(([id, data]) => ({
      ingredient_id: id,
      name: data.name,
      percentage: 0, // À calculer
      cost_per_kg: data.typical_cost_per_kg,
      nutritional_value: data.nutritional_value
    }));

    // Optimisation heuristique simple
    let bestComposition: RationFormula['ingredients'] = [];
    let bestScore = 0;

    // Essayer différentes combinaisons (version simplifiée)
    for (let iteration = 0; iteration < 100; iteration++) {
      const composition = this.generateRandomComposition(ingredients, constraints);
      const score = this.evaluateComposition(composition, targets, constraints);

      if (score > bestScore) {
        bestComposition = composition;
        bestScore = score;
      }
    }

    return bestComposition;
  }

  private generateRandomComposition(
    availableIngredients: any[],
    constraints?: any
  ): RationFormula['ingredients'] {
    const composition: RationFormula['ingredients'] = [];
    let remainingPercentage = 100;

    // Ingrédients de base (maïs, soja)
    const baseIngredients = availableIngredients.filter(ing =>
      ['mais', 'soja'].includes(ing.ingredient_id)
    );

    // Distribuer pourcentages
    for (const ingredient of baseIngredients) {
      if (remainingPercentage <= 0) break;

      const maxPercentage = Math.min(remainingPercentage, 60); // Max 60%
      const percentage = Math.random() * maxPercentage;
      remainingPercentage -= percentage;

      composition.push({
        ...ingredient,
        percentage
      });
    }

    // Ajouter suppléments si nécessaire
    if (remainingPercentage > 0) {
      const supplements = availableIngredients.filter(ing =>
        !['mais', 'soja'].includes(ing.ingredient_id)
      );

      for (const supplement of supplements.slice(0, 2)) { // Max 2 suppléments
        if (remainingPercentage <= 0) break;

        const percentage = Math.min(remainingPercentage, 5); // Max 5% chacun
        remainingPercentage -= percentage;

        composition.push({
          ...supplement,
          percentage
        });
      }
    }

    // Ajuster pour atteindre 100%
    if (remainingPercentage > 0 && composition.length > 0) {
      composition[0].percentage += remainingPercentage;
    }

    return composition;
  }

  private evaluateComposition(
    composition: RationFormula['ingredients'],
    targets: RationFormula['nutritional_targets'],
    constraints?: any
  ): number {
    let score = 0;

    // Calculer valeurs nutritionnelles totales
    const totalNutrition = composition.reduce((total, ing) => {
      const factor = ing.percentage / 100;
      return {
        protein: total.protein + (ing.nutritional_value.protein * factor),
        energy: total.energy + (ing.nutritional_value.energy * factor),
        calcium: total.calcium + ((ing.nutritional_value.calcium || 0) * factor),
      };
    }, { protein: 0, energy: 0, calcium: 0 });

    // Score basé sur proximité des cibles nutritionnelles
    if (totalNutrition.protein >= targets.protein_min && totalNutrition.protein <= targets.protein_max) {
      score += 30;
    } else if (totalNutrition.protein >= targets.protein_min * 0.9 && totalNutrition.protein <= targets.protein_max * 1.1) {
      score += 20;
    }

    if (totalNutrition.energy >= targets.energy_min && totalNutrition.energy <= targets.energy_max) {
      score += 30;
    } else if (totalNutrition.energy >= targets.energy_min * 0.9 && totalNutrition.energy <= targets.energy_max * 1.1) {
      score += 20;
    }

    if (targets.calcium_min && totalNutrition.calcium >= targets.calcium_min &&
        (!targets.calcium_max || totalNutrition.calcium <= targets.calcium_max)) {
      score += 20;
    }

    // Pénalité coût
    const totalCost = composition.reduce((sum, ing) => sum + (ing.cost_per_kg * ing.percentage / 100), 0);
    if (constraints?.max_cost_per_kg && totalCost > constraints.max_cost_per_kg) {
      score -= 20;
    }

    return Math.max(0, score);
  }

  private async optimizeIngredientsForCostEfficiency(
    currentIngredients: RationFormula['ingredients'],
    targets: RationFormula['nutritional_targets'],
    performanceAdjustment: number
  ): Promise<RationFormula['ingredients']> {
    // Récupérer prix actuels du marché
    const marketPrices = await this.getCurrentMarketPrices();

    const optimizedIngredients = currentIngredients.map(ing => {
      const marketPrice = marketPrices[ing.ingredient_id] || ing.cost_per_kg;
      return {
        ...ing,
        cost_per_kg: marketPrice
      };
    });

    // Chercher substitutions moins chères
    for (let i = 0; i < optimizedIngredients.length; i++) {
      const currentIng = optimizedIngredients[i];
      const alternatives = await this.findIngredientAlternatives(currentIng.ingredient_id);

      for (const alt of alternatives) {
        if (alt.price < currentIng.cost_per_kg && alt.nutritional_equivalence > 0.8) {
          // Substitution potentielle
          optimizedIngredients[i] = {
            ...currentIng,
            ingredient_id: alt.alternative_id,
            name: alt.name,
            cost_per_kg: alt.price
          };
          break;
        }
      }
    }

    return optimizedIngredients;
  }

  // ==================== MÉTHODES UTILITAIRES ====================

  private getNutritionalStandards(race: string, phase: string): Partial<RationFormula> | null {
    // Map common race names to standard keys
    const raceMapping: Record<string, string> = {
      'broilers': 'poulet_de_chair',
      'poulet_de_chair': 'poulet_de_chair',
      'pondeuse': 'pondeuse',
      'layers': 'pondeuse'
    };

    const standardRace = raceMapping[race] || race;
    return STANDARD_RATIONS[standardRace]?.[phase] || null;
  }

  private getAgeRangeForPhase(phase: string): { min: number; max: number } {
    const ranges: Record<string, { min: number; max: number }> = {
      'démarrage': { min: 0, max: 21 },
      'croissance': { min: 22, max: 42 },
      'finition': { min: 43, max: 56 },
      'ponte': { min: 140, max: 500 }
    };
    return ranges[phase] || { min: 0, max: 100 };
  }

  private calculateRationEfficiency(
    ingredients: RationFormula['ingredients'],
    standards: Partial<RationFormula>
  ): number {
    // Score basé sur équilibre nutritionnel et coût
    const totalCost = ingredients.reduce((sum, ing) => sum + (ing.cost_per_kg * ing.percentage / 100), 0);
    const nutritionalBalance = this.evaluateNutritionalBalance(ingredients, standards.nutritional_targets!);

    // Score composite (0-100)
    const costScore = Math.max(0, 100 - (totalCost / 10)); // Pénalité coût
    const balanceScore = nutritionalBalance * 20; // 0-20 points

    return Math.min(100, costScore + balanceScore);
  }

  private evaluateNutritionalBalance(
    ingredients: RationFormula['ingredients'],
    targets: RationFormula['nutritional_targets']
  ): number {
    const totalNutrition = ingredients.reduce((total, ing) => {
      const factor = ing.percentage / 100;
      return {
        protein: total.protein + (ing.nutritional_value.protein * factor),
        energy: total.energy + (ing.nutritional_value.energy * factor),
      };
    }, { protein: 0, energy: 0 });

    let balanceScore = 0;

    // Protéines dans cible
    if (totalNutrition.protein >= targets.protein_min && totalNutrition.protein <= targets.protein_max) {
      balanceScore += 2;
    }

    // Énergie dans cible
    if (totalNutrition.energy >= targets.energy_min && totalNutrition.energy <= targets.energy_max) {
      balanceScore += 2;
    }

    return balanceScore; // 0-4
  }

  private calculatePerformanceAdjustment(performanceData: any): number {
    let adjustment = 1.0;

    // Ajuster selon FCR (Feed Conversion Ratio)
    if (performanceData.fcr > 2.0) {
      adjustment *= 0.9; // Réduire coûts si FCR élevé
    } else if (performanceData.fcr < 1.5) {
      adjustment *= 1.1; // Permettre coûts plus élevés si très efficace
    }

    // Ajuster selon mortalité
    if (performanceData.mortality_rate > 5) {
      adjustment *= 0.95; // Priorité qualité sur coût
    }

    return adjustment;
  }

  private identifyIngredientSubstitutions(
    original: RationFormula['ingredients'],
    optimized: RationFormula['ingredients']
  ): RationOptimization['ingredient_substitutions'] {
    const substitutions: RationOptimization['ingredient_substitutions'] = [];

    original.forEach((origIng, index) => {
      const optIng = optimized[index];
      if (origIng.ingredient_id !== optIng.ingredient_id) {
        substitutions.push({
          original: origIng.name,
          replacement: optIng.name,
          reason: 'Substitution pour réduction coût',
          cost_impact: (origIng.cost_per_kg - optIng.cost_per_kg) * origIng.percentage / 100
        });
      }
    });

    return substitutions;
  }

  private generateOptimizationRecommendations(
    optimizedRation: RationFormula,
    costSavings: number,
    performanceImprovement: number
  ): string[] {
    const recommendations: string[] = [];

    if (costSavings > 50) {
      recommendations.push(`💰 Économies potentielles: ${costSavings.toFixed(0)} FCFA/kg`);
    }

    if (performanceImprovement > 10) {
      recommendations.push(`📈 Amélioration performance attendue: +${performanceImprovement.toFixed(0)}%`);
    }

    recommendations.push('🔄 Tester la nouvelle ration sur un petit lot avant déploiement général');
    recommendations.push('📊 Surveiller FCR et gains de poids pendant 2 semaines');

    return recommendations;
  }

  private calculateEfficiencyScore(
    fcr: number,
    avgDailyGain: number,
    costPerKgGain: number,
    race: string
  ): number {
    // Standards par race
    const standards: Record<string, { target_fcr: number; target_adg: number }> = {
      'poulet_de_chair': { target_fcr: 1.8, target_adg: 50 },
      'pondeuse': { target_fcr: 2.2, target_adg: 15 }
    };

    const target = standards[race] || { target_fcr: 2.0, target_adg: 30 };

    let score = 50; // Score de base

    // Bonus/malus FCR
    if (fcr <= target.target_fcr) score += 25;
    else if (fcr <= target.target_fcr * 1.2) score += 10;
    else score -= 20;

    // Bonus/malus croissance
    if (avgDailyGain >= target.target_adg) score += 25;
    else if (avgDailyGain >= target.target_adg * 0.8) score += 10;
    else score -= 20;

    return Math.max(0, Math.min(100, score));
  }

  private identifyEfficiencyOpportunities(
    consumptionData: any,
    performanceData: any,
    efficiencyScore: number
  ): string[] {
    const opportunities: string[] = [];

    if (efficiencyScore < 70) {
      opportunities.push('FCR supérieur à la normale - vérifier qualité aliment');
      opportunities.push('Croissance insuffisante - ajuster densité énergétique');
    }

    if (consumptionData.cost_per_kg > 400) {
      opportunities.push('Coût alimentaire élevé - optimiser formulation');
    }

    if (performanceData.mortality_rate > 3) {
      opportunities.push('Mortalité élevée peut impacter efficacité apparente');
    }

    return opportunities;
  }

  private async generateEfficiencyRecommendations(
    consumptionData: any,
    performanceData: any,
    efficiencyScore: number,
    lotId: string
  ): Promise<FeedEfficiencyAnalysis['recommended_adjustments']> {
    const recommendations: FeedEfficiencyAnalysis['recommended_adjustments'] = [];

    // Récupérer les données actuelles du lot et de la ration
    const currentRation = await this.getCurrentLotRation(lotId);
    const marketPrices = await this.getCurrentMarketPrices();

    // Analyse basée sur le score d'efficacité
    if (efficiencyScore < 70) {
      // Problème de croissance - analyser la ration actuelle
      if (performanceData.total_weight_gain < this.getExpectedWeightGain(performanceData.race, consumptionData.days_count)) {
        if (currentRation && currentRation.nutritional_targets) {
          const totalProtein = currentRation.ingredients.reduce((sum, ing) =>
            sum + (ing.nutritional_value.protein * ing.percentage / 100), 0);

          if (totalProtein < currentRation.nutritional_targets.protein_min) {
            recommendations.push({
              type: 'ingredient',
              description: `Augmenter le taux de protéines de ${(currentRation.nutritional_targets.protein_min - totalProtein).toFixed(1)}% pour améliorer la croissance`,
              expected_impact: Math.min(15, (currentRation.nutritional_targets.protein_min - totalProtein) * 2)
            });
          }
        }

        // Vérifier la densité énergétique
        const totalEnergy = currentRation?.ingredients.reduce((sum, ing) =>
          sum + (ing.nutritional_value.energy * ing.percentage / 100), 0) || 0;

        if (currentRation?.nutritional_targets.energy_min && totalEnergy < currentRation.nutritional_targets.energy_min) {
          recommendations.push({
            type: 'ingredient',
            description: `Augmenter la densité énergétique de ${(currentRation.nutritional_targets.energy_min - totalEnergy).toFixed(0)} kcal/kg`,
            expected_impact: 10
          });
        }
      }
    }

    // Analyse des coûts
    if (consumptionData.cost_per_kg > 400) {
      // Chercher des substitutions rentables
      if (currentRation) {
        for (const ingredient of currentRation.ingredients) {
          const alternatives = await this.findIngredientAlternatives(ingredient.ingredient_id);
          const cheaperAlt = alternatives.find(alt =>
            alt.price < ingredient.cost_per_kg && alt.nutritional_equivalence > 0.8
          );

          if (cheaperAlt) {
            const savings = (ingredient.cost_per_kg - cheaperAlt.price) * ingredient.percentage / 100;
            recommendations.push({
              type: 'ingredient',
              description: `Remplacer ${ingredient.name} par ${cheaperAlt.name} (économie: ${savings.toFixed(0)} FCFA/kg)`,
              expected_impact: Math.min(15, savings * 0.3)
            });
          }
        }
      }
    }

    // Recommandations basées sur la mortalité
    if (performanceData.mortality_rate > 5) {
      recommendations.push({
        type: 'ingredient',
        description: 'Améliorer la qualité des ingrédients pour réduire la mortalité',
        expected_impact: 8
      });
    }

    // Recommandations générales d'alimentation
    if (consumptionData.total_feed / consumptionData.days_count < 100) {
      recommendations.push({
        type: 'quantity',
        description: 'Augmenter la quantité d\'aliment distribuée par jour',
        expected_impact: 6
      });
    }

    recommendations.push({
      type: 'timing',
      description: 'Distribuer l\'aliment en 4-6 repas par jour pour une meilleure absorption',
      expected_impact: 5
    });

    return recommendations;
  }

  private async getCurrentMarketPrices(): Promise<Record<string, number>> {
    try {
      const { data } = await supabase
        .from('ingredient_prices')
        .select('ingredient_id, current_price')
        .order('updated_at', { ascending: false });

      const prices: Record<string, number> = {};
      data?.forEach(item => {
        prices[item.ingredient_id] = item.current_price;
      });

      return prices;
    } catch (error) {
      console.error('[RationAdvisor] Erreur récupération prix marché:', error);
      return {};
    }
  }

  private async findIngredientAlternatives(ingredientId: string): Promise<any[]> {
    try {
      const { data } = await supabase
        .from('ingredient_prices')
        .select('alternatives')
        .eq('ingredient_id', ingredientId)
        .single();

      return data?.alternatives || [];
    } catch (error) {
      return [];
    }
  }

  private async getRationById(rationId: string): Promise<RationFormula | null> {
    try {
      const { data } = await supabase
        .from('custom_feed_rations')
        .select('*')
        .eq('id', rationId)
        .single();

      if (!data) return null;

      // Convertir format DB vers RationFormula
      return {
        id: data.id,
        name: data.name,
        race: data.race || 'unknown',
        phase: data.phase || 'unknown',
        age_range: { min: 0, max: 100 }, // À enrichir
        ingredients: [], // À reconstruire depuis données
        nutritional_targets: {
          protein_min: data.protein_percentage * 0.9,
          protein_max: data.protein_percentage * 1.1,
          energy_min: data.energy_kcal * 0.9,
          energy_max: data.energy_kcal * 1.1
        },
        total_cost_per_kg: 0, // À calculer
        efficiency_score: 80, // Score par défaut
        created_at: data.created_at,
        updated_at: data.updated_at
      };
    } catch (error) {
      console.error('[RationAdvisor] Erreur récupération ration:', error);
      return null;
    }
  }

  private async getLotConsumptionData(lotId: string, period: string): Promise<any> {
    const days = period === 'week' ? 7 : 30;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    try {
      const { data } = await supabase
        .from('stock_movements')
        .select('quantity, unit_cost, created_at')
        .eq('lot_id', lotId)
        .eq('movement_type', 'consumption')
        .gte('created_at', startDate.toISOString());

      if (!data || data.length === 0) return null;

      const totalFeed = data.reduce((sum: number, item: any) => sum + item.quantity, 0);
      const totalCost = data.reduce((sum: number, item: any) => sum + (item.quantity * item.unit_cost), 0);

      return {
        total_feed: totalFeed,
        total_cost: totalCost,
        days_count: days,
        avg_daily_cost: totalCost / days
      };
    } catch (error) {
      console.error('[RationAdvisor] Erreur données consommation:', error);
      return null;
    }
  }

  private async getLotPerformanceData(lotId: string, period: string): Promise<any> {
    const days = period === 'week' ? 7 : 30;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    try {
      const { data: lot } = await supabase
        .from('lots')
        .select('race, initial_quantity, quantity')
        .eq('id', lotId)
        .single();

      if (!lot) return null;

      // Calculer gain de poids approximatif
      const initialWeight = lot.initial_quantity * 0.05; // Estimation 50g initial
      const finalWeight = lot.quantity * 2.5; // Estimation poids final
      const totalWeightGain = finalWeight - initialWeight;

      return {
        race: lot.race,
        total_weight_gain: totalWeightGain,
        mortality_rate: ((lot.initial_quantity - lot.quantity) / lot.initial_quantity) * 100
      };
    } catch (error) {
      console.error('[RationAdvisor] Erreur données performance:', error);
      return null;
    }
  }

  private async saveRationFormula(ration: RationFormula): Promise<void> {
    try {
      await supabase.from('ration_formulas').insert({
        id: ration.id,
        name: ration.name,
        race: ration.race,
        phase: ration.phase,
        age_range: ration.age_range,
        ingredients: ration.ingredients,
        nutritional_targets: ration.nutritional_targets,
        total_cost_per_kg: ration.total_cost_per_kg,
        efficiency_score: ration.efficiency_score,
        created_at: ration.created_at,
        updated_at: ration.updated_at
      });
    } catch (error) {
      console.error('[RationAdvisor] Erreur sauvegarde formule:', error);
    }
  }

  private async saveOptimizationResult(optimization: RationOptimization): Promise<void> {
    try {
      await supabase.from('ration_optimizations').insert({
        current_ration_id: optimization.current_ration.id,
        optimized_ration_id: optimization.optimized_ration.id,
        cost_savings: optimization.cost_savings,
        performance_improvement: optimization.performance_improvement,
        ingredient_substitutions: optimization.ingredient_substitutions,
        recommendations: optimization.recommendations,
        created_at: new Date().toISOString()
      });
    } catch (error) {
      console.error('[RationAdvisor] Erreur sauvegarde optimisation:', error);
    }
  }
}

// ==================== WRAPPER POUR INTERFACE COMMUNE ====================

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

class RationAdvisorWrapper implements IntelligenceAgent {
  private agent = RationAdvisor.getInstance();

  async analyze(entityId: string): Promise<any> {
    // Pour analyse de ration, entityId peut être un lotId
    return await this.agent.analyzeFeedEfficiency(entityId, 'user_id_placeholder');
  }

  async getMetrics(): Promise<AgentMetrics> {
    return {
      total_analyses: 0,
      success_rate: 85,
      average_confidence: 80,
      alerts_generated: 0,
    };
  }

  isActive(): boolean {
    return true;
  }
}

// ==================== EXPORTS ====================

export const rationAdvisor = RationAdvisor.getInstance();
export const rationAdvisorWrapper = new RationAdvisorWrapper();

export const useRationAdvisor = () => {
  const formulateRation = useCallback(
    (race: string, phase: string, quantity: number, constraints?: any) =>
      rationAdvisor.formulateRation(race, phase, quantity, constraints),
    []
  );

  const optimizeRation = useCallback(
    (rationId: string, performanceData?: any) =>
      rationAdvisor.optimizeExistingRation(rationId, performanceData),
    []
  );

  const analyzeEfficiency = useCallback(
    (lotId: string, userId: string, period?: string) =>
      rationAdvisor.analyzeFeedEfficiency(lotId, userId, period),
    []
  );

  const updatePrices = useCallback(
    (marketData: any[]) =>
      rationAdvisor.updateIngredientPrices(marketData),
    []
  );

  return useMemo(() => ({
    formulateRation,
    optimizeRation,
    analyzeEfficiency,
    updatePrices,
  }), [formulateRation, optimizeRation, analyzeEfficiency, updatePrices]);
};