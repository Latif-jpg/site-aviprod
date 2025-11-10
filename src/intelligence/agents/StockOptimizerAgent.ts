 // src/intelligence/agents/StockOptimizerAgent.ts
import { ensureSupabaseInitialized } from '../../../app/integrations/supabase/client';
import { smartAlertSystem } from '../core/SmartAlertSystem';
import { dataCollector } from '../core/DataCollector';
import { selfLearningLite } from '../core/SelfLearningEngineLite';

/**
 * STOCK OPTIMIZER AGENT
 * 
 * Agent IA intelligent pour gestion de stock connecté aux lots:
 * - Calcul consommation automatique par lot
 * - Prédiction besoins futurs
 * - Alertes rupture de stock proactives
 * - Suggestions commande optimisées
 * - Suivi consommation réel vs théorique
 */

// ==================== TYPES ====================

interface LotConsumption {
  lot_id: string;
  lot_name: string;
  quantity: number;
  age: number;
  daily_feed_per_bird: number;      // kg par oiseau par jour
  total_daily_consumption: number;  // kg total par jour
  feed_type: string;                // Type d'aliment
  last_update: string;
}

interface StockItem {
  id: string;
  nom: string;
  category: string;
  quantite: number;
  unite: string;
  seuil_alerte: number;
  prix_unitaire: number;
  assigned_lots?: string[];         // Lots utilisant ce stock
  date_peremption?: string;
}

interface FeedPrediction {
  stock_item_id: string;
  stock_name: string;
  current_quantity: number;
  daily_consumption: number;
  days_remaining: number;
  estimated_runout_date: string;
  recommended_order_date: string;
  recommended_order_quantity: number;
  safety_stock: number;
  affected_lots: string[];
  urgency_level: 'low' | 'medium' | 'high' | 'critical';
}

interface ConsumptionTracking {
  lot_id: string;
  stock_item_id: string;
  date: string;
  quantity_consumed: number;
  quantity_planned: number;
  deviation_percent: number;
  entry_type: 'automatic' | 'manual';
}

interface OptimizationSuggestion {
  type: 'order' | 'redistribute' | 'adjust_feeding' | 'change_supplier';
  title: string;
  description: string;
  estimated_savings: number;
  priority_score: number;
  actions: string[];
}

// ==================== PARAMÈTRES DE RÉFÉRENCE ====================

// Consommation standard par race et âge (kg/oiseau/jour)
const FEED_CONSUMPTION_STANDARDS: Record<string, (age: number) => number> = {
  'poulet_de_chair': (age: number) => {
    if (age < 7) return 0.015;      // 15g/jour
    if (age < 14) return 0.035;     // 35g/jour
    if (age < 21) return 0.055;     // 55g/jour
    if (age < 28) return 0.080;     // 80g/jour
    if (age < 35) return 0.110;     // 110g/jour
    if (age < 42) return 0.130;     // 130g/jour
    return 0.140;                   // 140g/jour après 42j
  },
  'broiler': (age: number) => {
    if (age < 7) return 0.018;
    if (age < 14) return 0.040;
    if (age < 21) return 0.060;
    if (age < 28) return 0.090;
    if (age < 35) return 0.120;
    return 0.145;
  },
  'pondeuse': (age: number) => {
    if (age < 60) return 0.045;     // Phase croissance
    if (age < 120) return 0.095;    // Démarrage ponte
    return 0.110;                   // Ponte mature
  },
  'default': (age: number) => {
    if (age < 7) return 0.015;
    if (age < 21) return 0.050;
    if (age < 35) return 0.100;
    return 0.130;
  },
};

// Stock de sécurité (jours)
const SAFETY_STOCK_DAYS = 7;

// Délai de commande standard (jours)
const ORDER_LEAD_TIME = 3;

// ==================== CLASSE PRINCIPALE ====================

class StockOptimizerAgent {
  private static instance: StockOptimizerAgent;
  
  private constructor() {}
  
  public static getInstance(): StockOptimizerAgent {
    if (!StockOptimizerAgent.instance) {
      StockOptimizerAgent.instance = new StockOptimizerAgent();
    }
    return StockOptimizerAgent.instance;
  }
  
  /**
   * CALCUL AUTOMATIQUE DE LA CONSOMMATION PAR LOT
   */
  public calculateLotConsumption(lot: any): LotConsumption {
    const race = lot.name?.toLowerCase() || 'default';
    const ageJours = lot.age || 0;
    
    // Obtenir consommation standard selon race et âge
    const feedFunction = FEED_CONSUMPTION_STANDARDS[race] || FEED_CONSUMPTION_STANDARDS['default'];
    const dailyFeedPerBird = feedFunction(ageJours);
    
    // Calculer consommation totale du lot
    const totalDailyConsumption = dailyFeedPerBird * (lot.quantity || lot.quantity);
    
    // Déterminer type d'aliment selon âge
    let feedType = 'aliment_standard';
    if (ageJours < 21) {
      feedType = 'aliment_demarrage';
    } else if (ageJours < 42) {
      feedType = 'aliment_croissance';
    } else {
      feedType = 'aliment_finition';
    }
    
    return {
      lot_id: lot.id,
      lot_name: lot.name,
      quantity: lot.quantity || lot.quantity,
      age: ageJours,
      daily_feed_per_bird: dailyFeedPerBird,
      total_daily_consumption: totalDailyConsumption,
      feed_type: feedType,
      last_update: new Date().toISOString(),
    };
  }
  
  /**
   * CALCULER CONSOMMATION TOTALE DE LA FERME
   */
  public async calculateFarmTotalConsumption(farmId: string): Promise<{
    total_daily_consumption: number;
    consumption_by_feed_type: Record<string, number>;
    consumption_by_lot: LotConsumption[];
  }> {
    try {
      // --- CORRECTION : S'assurer que farmId est un UUID valide ---
      if (!farmId || farmId === 'null') {
        console.warn('[StockOptimizer] Tentative de calcul de consommation avec un farmId invalide:', farmId);
        return { total_daily_consumption: 0, consumption_by_feed_type: {}, consumption_by_lot: [] };
      }

      // Récupérer tous les lots actifs
      const supabase = await ensureSupabaseInitialized();
      const { data: lots, error } = await supabase
        .from('lots')
        .select('*')
        .eq('user_id', farmId)
        .eq('status', 'active');
      
      if (error) throw error;
      
      if (!lots || lots.length === 0) {
        return {
          total_daily_consumption: 0,
          consumption_by_feed_type: {},
          consumption_by_lot: [],
        };
      }
      
      // Calculer consommation pour chaque lot
      const consumptionByLot = lots.map(lot => this.calculateLotConsumption(lot));
      
      // Agréger par type d'aliment
      const consumptionByFeedType: Record<string, number> = {};
      consumptionByLot.forEach(consumption => {
        const feedType = consumption.feed_type;
        consumptionByFeedType[feedType] = (consumptionByFeedType[feedType] || 0) + consumption.total_daily_consumption;
      });
      
      // Total global
      const totalDailyConsumption = consumptionByLot.reduce(
        (sum, c) => sum + c.total_daily_consumption,
        0
      );
      
      return {
        total_daily_consumption: totalDailyConsumption,
        consumption_by_feed_type: consumptionByFeedType,
        consumption_by_lot: consumptionByLot,
      };
    } catch (error) {
      console.error('[StockOptimizer] Erreur calcul consommation:', error);
      dataCollector.trackError(error as Error, { farmId, action: 'calculateFarmConsumption' });
      return {
        total_daily_consumption: 0,
        consumption_by_feed_type: {},
        consumption_by_lot: [],
      };
    }
  }
  
  /**
   * PRÉDIRE LES BESOINS FUTURS
   */
  public async predictStockNeeds(farmId: string): Promise<FeedPrediction[]> {
    try {
      // 1. Obtenir la consommation totale de la ferme, agrégée par type d'aliment
      const consumption = await this.calculateFarmTotalConsumption(farmId);
      const consumptionByFeedType = consumption.consumption_by_feed_type;

      // 2. Obtenir tous les articles en stock
      const supabase = await ensureSupabaseInitialized();
      const { data: allStocks } = await supabase
        .from('stock')
        .select('*')
        .eq('user_id', farmId);
      
      if (!allStocks || allStocks.length === 0) {
        return [];
      }
      
      const predictions: FeedPrediction[] = [];
      
      // 3. Pour chaque article en stock
      for (const stock of allStocks) {
        let dailyConsumption = 0;

        // Si l'article est un aliment avec un type défini, utiliser la consommation correspondante
        if (stock.category === 'feed' && stock.feed_type && consumptionByFeedType[stock.feed_type]) {
          dailyConsumption = consumptionByFeedType[stock.feed_type];
        }

        if (dailyConsumption > 0) {
            // Logique de prédiction basée sur la consommation
            const daysRemaining = stock.quantity / dailyConsumption;
            const runoutDate = new Date();
            runoutDate.setDate(runoutDate.getDate() + Math.floor(daysRemaining));
            const orderDate = new Date();
            orderDate.setDate(orderDate.getDate() + Math.floor(daysRemaining - ORDER_LEAD_TIME - SAFETY_STOCK_DAYS));
            const recommendedQuantity = dailyConsumption * (30 + SAFETY_STOCK_DAYS);
            const safetyStock = dailyConsumption * SAFETY_STOCK_DAYS;

            let urgencyLevel: FeedPrediction['urgency_level'] = 'low';
            if (daysRemaining < ORDER_LEAD_TIME) {
              urgencyLevel = 'critical';
            } else if (daysRemaining < ORDER_LEAD_TIME + SAFETY_STOCK_DAYS) {
              urgencyLevel = 'high';
            } else if (daysRemaining < 14) {
              urgencyLevel = 'medium';
            }
            
            if (urgencyLevel !== 'low') {
                predictions.push({
                  stock_item_id: stock.id,
                  stock_name: stock.name,
                  current_quantity: stock.quantity,
                  daily_consumption: dailyConsumption,
                  days_remaining: daysRemaining,
                  estimated_runout_date: runoutDate.toISOString(),
                  recommended_order_date: orderDate.toISOString(),
                  recommended_order_quantity: recommendedQuantity,
                  safety_stock: safetyStock,
                  affected_lots: [], // Cette info est maintenant moins directe, à améliorer si besoin
                  urgency_level: urgencyLevel,
                });
            }
        } else if (stock.min_threshold && stock.quantity <= stock.min_threshold) {
            // Si pas de consommation calculée, vérifier le seuil manuel (pour médicaments, etc.)
            predictions.push({
                stock_item_id: stock.id,
                stock_name: stock.name,
                current_quantity: stock.quantity,
                daily_consumption: 0,
                days_remaining: 0,
                estimated_runout_date: new Date().toISOString(),
                recommended_order_date: new Date().toISOString(),
                recommended_order_quantity: (stock.min_threshold || 10) * 2,
                safety_stock: stock.min_threshold || 0,
                affected_lots: [],
                urgency_level: stock.quantity === 0 ? 'critical' : 'high',
            });
        }
      }
      
      // Trier par urgence
      predictions.sort((a, b) => {
        const urgencyOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        return urgencyOrder[a.urgency_level] - urgencyOrder[b.urgency_level];
      });
      
      return predictions;
    } catch (error) {
      console.error('[StockOptimizer] Erreur prédiction besoins:', error);
      return [];
    }
  }
  
  /**
   * ENREGISTRER CONSOMMATION RÉELLE
   */
  public async trackConsumption(
    lotId: string,
    stockItemId: string,
    quantityConsumed: number,
    entryType: 'automatic' | 'manual' = 'manual'
  ): Promise<void> {
    try {
      const supabase = await ensureSupabaseInitialized();

      // 1. Obtenir consommation prévue
      const { data: lot } = await supabase
        .from('lots')
        .select('*')
        .eq('id', lotId)
        .single();

      if (!lot) throw new Error('Lot non trouvé');

      // 2. Calculer déviation
      const plannedConsumption = this.calculateLotConsumption(lot);
      const deviation = ((quantityConsumed - plannedConsumption.total_daily_consumption) /
                        plannedConsumption.total_daily_consumption) * 100;

      // 3. Enregistrer dans table de suivi
      const tracking: ConsumptionTracking = {
        lot_id: lotId,
        stock_item_id: stockItemId,
        date: new Date().toISOString().split('T')[0],
        quantity_consumed: quantityConsumed,
        quantity_planned: plannedConsumption.total_daily_consumption,
        deviation_percent: deviation,
        entry_type: entryType,
      };

      await supabase
        .from('stock_consumption_tracking')
        .insert(tracking);

      // 4. Mettre à jour stock
      const { data: stockItem } = await supabase
        .from('stock')
        .select('quantity')
        .eq('id', stockItemId)
        .single();

      if (stockItem) {
        const newQuantity = stockItem.quantity - quantityConsumed;

        await supabase
          .from('stock')
          .update({ quantity: newQuantity })
          .eq('id', stockItemId);

        // 5. Alerter si déviation importante
        if (Math.abs(deviation) > 20) {
          await smartAlertSystem.createAlert({
            type: 'lot_feed_consumption_abnormal' as any,
            context: {
              lot_name: lot.name,
              deviation: deviation.toFixed(1),
              consumed: quantityConsumed.toFixed(2),
              expected: plannedConsumption.total_daily_consumption.toFixed(2),
            },
            relatedEntityType: 'lot',
            relatedEntityId: lotId,
          });
        }

        // 6. Vérifier seuil alerte stock (toujours alerter si stock faible)
        if (newQuantity < 50) { // Seuil fixe de 50 unités
          await smartAlertSystem.alertLowStock(
            stockItemId,
            stockItem.name,
            newQuantity,
            50,
            'kg'
          );
        }
      }
      
      // 7. Logger pour apprentissage
      dataCollector.collect(
        'stock_consumption_tracked' as any,
        {
          lot_id: lotId,
          quantity: quantityConsumed,
          deviation,
          entry_type: entryType,
        },
        'medium' as any,
        'success'
      );
      
      // 8. IA Légère apprend de la précision
      selfLearningLite.learn({
        action: `consumption_prediction_${lot.name}`,
        success: Math.abs(deviation) < 10, // Succès si <10% écart
        duration: 0,
        context: { deviation, age: lot.age },
      });
      
    } catch (error) {
      console.error('[StockOptimizer] Erreur tracking consommation:', error);
      dataCollector.trackError(error as Error, { lotId, stockItemId });
    }
  }
  
  /**
   * GÉNÉRER ALERTES PROACTIVES
   */
  public async generateStockAlerts(farmId: string): Promise<void> {
    try {
      const predictions = await this.predictStockNeeds(farmId);
      
      for (const prediction of predictions) {
        if (prediction.urgency_level === 'critical' || prediction.urgency_level === 'high') {
          await smartAlertSystem.createAlert({
            type: prediction.urgency_level === 'critical' ? 'stock_out_of_stock' : 'stock_low_level' as any,
            context: {
              item_name: prediction.stock_name,
              current_quantity: prediction.current_quantity,
              days_remaining: Math.floor(prediction.days_remaining),
              recommended_quantity: Math.ceil(prediction.recommended_order_quantity),
              affected_lots_count: prediction.affected_lots.length,
            },
            relatedEntityType: 'stock_item',
            relatedEntityId: prediction.stock_item_id,
          });
        }
      }
    } catch (error) {
      console.error('[StockOptimizer] Erreur génération alertes:', error);
    }
  }
  
  /**
   * SUGGESTIONS D'OPTIMISATION
   */
  public async generateOptimizationSuggestions(farmId: string): Promise<OptimizationSuggestion[]> {
    const suggestions: OptimizationSuggestion[] = [];
    
    try {
      const supabase = await ensureSupabaseInitialized();

      // 1. Analyser historique consommation
      const { data: trackingData } = await supabase
        .from('stock_consumption_tracking')
        .select('*, lots(*), stock(*)')
        .gte('date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .order('date', { ascending: false });

      if (!trackingData || trackingData.length === 0) return suggestions;

      // 2. Surconsommation détectée
      const overConsumption = trackingData.filter((t: any) => t.deviation_percent > 15);
      if (overConsumption.length > 5) {
        suggestions.push({
          type: 'adjust_feeding',
          title: 'Surconsommation d\'aliment détectée',
          description: `${overConsumption.length} enregistrements montrent une consommation supérieure de 15% à la normale`,
          estimated_savings: 50000, // FCFA/mois
          priority_score: 85,
          actions: [
            'Vérifier la qualité de l\'aliment',
            'Contrôler le gaspillage (mangeoires)',
            'Vérifier état de santé des lots',
            'Ajuster les rations distribuées',
          ],
        });
      }

      // 3. Commandes multiples petites quantités
      const { data: recentOrders } = await supabase
        .from('transactions')
        .select('*')
        .eq('category', 'feed')
        .eq('type', 'expense')
        .gte('date', new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString());
      
      if (recentOrders && recentOrders.length > 6) {
        const avgOrderAmount = recentOrders.reduce((sum: number, o: any) => sum + (o.amount || 0), 0) / recentOrders.length;
        
        suggestions.push({
          type: 'order',
          title: 'Optimiser les commandes groupées',
          description: `Vous avez passé ${recentOrders.length} commandes en 2 mois. Regrouper pourrait réduire les coûts.`,
          estimated_savings: avgOrderAmount * 0.15 * (recentOrders.length / 2),
          priority_score: 70,
          actions: [
            'Commander en plus grande quantité (30 jours)',
            'Négocier remise quantité avec fournisseur',
            'Coordonner avec autres éleveurs (achat groupé)',
          ],
        });
      }
      
      // 4. Stock de sécurité insuffisant
      const predictions = await this.predictStockNeeds(farmId);
      const criticalItems = predictions.filter(p => p.days_remaining < 7);
      
      if (criticalItems.length > 0) {
        suggestions.push({
          type: 'order',
          title: 'Augmenter le stock de sécurité',
          description: `${criticalItems.length} article(s) risquent rupture dans moins de 7 jours`,
          estimated_savings: 0, // Éviter pertes
          priority_score: 95,
          actions: [
            'Commander immédiatement les articles critiques',
            'Augmenter le stock tampon à 10-14 jours',
            'Mettre en place alertes précoces',
          ],
        });
      }
      
      // Trier par priorité
      suggestions.sort((a, b) => b.priority_score - a.priority_score);
      
      return suggestions;
    } catch (error) {
      console.error('[StockOptimizer] Erreur suggestions:', error);
      return [];
    }
  }
  
  /**
   * SURVEILLANCE CONTINUE
   */
  public async monitorStockHealth(farmId: string): Promise<void> {
    try {
      console.log('[StockOptimizer] Surveillance stock démarrée');
      
      // 1. Vérifier prédictions
      const predictions = await this.predictStockNeeds(farmId);
      
      // 2. Générer alertes si nécessaire
      await this.generateStockAlerts(farmId);
      
      // 3. Log résumé
      const criticalCount = predictions.filter(p => p.urgency_level === 'critical').length;
      const highCount = predictions.filter(p => p.urgency_level === 'high').length;
      
      console.log(`[StockOptimizer] Stocks surveillés: ${predictions.length}`);
      console.log(`[StockOptimizer] Critique: ${criticalCount}, Urgent: ${highCount}`);
      
    } catch (error) {
      console.error('[StockOptimizer] Erreur surveillance:', error);
    }
  }
}

// Export singleton
export const stockOptimizerAgent = StockOptimizerAgent.getInstance();

// Hook React
export const useStockOptimizer = () => {
  return {
    calculateLotConsumption: (lot: any) => stockOptimizerAgent.calculateLotConsumption(lot),
    calculateFarmConsumption: (farmId: string) => 
      stockOptimizerAgent.calculateFarmTotalConsumption(farmId),
    predictStockNeeds: (farmId: string) => 
      stockOptimizerAgent.predictStockNeeds(farmId),
    trackConsumption: (lotId: string, stockId: string, quantity: number, type?: 'automatic' | 'manual') =>
      stockOptimizerAgent.trackConsumption(lotId, stockId, quantity, type),
    generateOptimizations: (farmId: string) =>
      stockOptimizerAgent.generateOptimizationSuggestions(farmId),
    monitorStock: (farmId: string) =>
      stockOptimizerAgent.monitorStockHealth(farmId),
  };
};