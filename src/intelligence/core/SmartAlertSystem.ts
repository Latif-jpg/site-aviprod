// src/intelligence/core/SmartAlertSystem.ts
// Import dynamique pour éviter les problèmes d'initialisation
let _supabase: any = null;

const getSupabaseClient = async () => {
  if (!_supabase) {
    try {
      const { supabase } = await import('../../../config'); // Utiliser le client Supabase consolidé
      _supabase = supabase;
    } catch (error) {
      console.error('[SmartAlertSystem] Erreur chargement Supabase:', error);
      return null;
    }
  }
  return _supabase;
};
import { dataCollector, EventType, EventPriority } from './DataCollector';

/**
 * SYSTÈME D'ALERTES INTELLIGENTES
 *
 * Génère, priorise et gère les alertes de manière intelligente:
 * - Priorisation dynamique selon contexte
 * - Regroupement d'alertes similaires
 * - Timing optimal de notification
 * - Auto-résolution d'alertes obsolètes
 */

// ==================== TYPES ====================

export enum AlertType {
  // Santé
  HEALTH_MORTALITY_HIGH = 'health_mortality_high',
  HEALTH_WEIGHT_LOW = 'health_weight_low',
  HEALTH_DISEASE_SUSPECTED = 'health_disease_suspected',
  HEALTH_VACCINATION_DUE = 'health_vaccination_due',

  // Stock
  STOCK_LOW_LEVEL = 'stock_low_level',
  STOCK_OUT_OF_STOCK = 'stock_out_of_stock',
  STOCK_EXPIRING_SOON = 'stock_expiring_soon',

  // Finance
  FINANCE_NEGATIVE_MARGIN = 'finance_negative_margin',
  FINANCE_EXPENSE_SPIKE = 'finance_expense_spike',
  FINANCE_LOW_CASHFLOW = 'finance_low_cashflow',

  // Lots
  LOT_OPTIMAL_SALE_WINDOW = 'lot_optimal_sale_window',
  LOT_GROWTH_DELAYED = 'lot_growth_delayed',
  LOT_FEED_CONSUMPTION_ABNORMAL = 'lot_feed_consumption_abnormal',

  // Marketplace
  MARKETPLACE_NEW_ORDER = 'marketplace_new_order',
  MARKETPLACE_PAYMENT_PENDING = 'marketplace_payment_pending',
  MARKETPLACE_DELIVERY_DELAYED = 'marketplace_delivery_delayed',

  // Système
  SYSTEM_PERFORMANCE_DEGRADED = 'system_performance_degraded',
  SYSTEM_DATA_SYNC_FAILED = 'system_data_sync_failed',
}

export enum AlertSeverity {
  INFO = 'info',
  WARNING = 'warning',
  URGENT = 'urgent',
  CRITICAL = 'critical',
}

export interface AlertConfig {
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  messageTemplate: string;
  recommendationsGenerator?: (context: any) => AlertRecommendation[];
  expirationHours?: number;
  canDismiss?: boolean;
  requiresAction?: boolean;
}

export interface AlertRecommendation {
  action: string;
  description: string;
  priority: number;
  estimatedImpact?: string;
}

export interface CreateAlertParams {
  type: AlertType;
  context: Record<string, any>;
  relatedEntityType?: string;
  relatedEntityId?: string;
  overrideSeverity?: AlertSeverity;
  farmId?: string; // Ajouté pour permettre de spécifier l'ID de la ferme
}

// ==================== CONFIGURATION DES ALERTES ====================

const ALERT_CONFIGS: Record<AlertType, AlertConfig> = {
  // Santé
  [AlertType.HEALTH_MORTALITY_HIGH]: {
    type: AlertType.HEALTH_MORTALITY_HIGH,
    severity: AlertSeverity.CRITICAL,
    title: 'Mortalité Élevée Détectée',
    messageTemplate: 'Le lot {lot_name} présente un taux de mortalité de {mortality_rate}%, supérieur à la normale ({threshold}%).',
    expirationHours: 24,
    requiresAction: true,
    recommendationsGenerator: (ctx) => [
      {
        action: 'Consulter un vétérinaire',
        description: 'Inspection immédiate du lot pour diagnostic',
        priority: 1,
        estimatedImpact: 'Prévention propagation maladie',
      },
      {
        action: 'Isoler le lot',
        description: 'Séparer des autres lots pour éviter contamination',
        priority: 2,
        estimatedImpact: 'Réduction risque épidémie',
      },
      {
        action: 'Vérifier conditions',
        description: 'Contrôler température, ventilation, qualité eau et aliment',
        priority: 3,
      },
    ],
  },

  [AlertType.HEALTH_VACCINATION_DUE]: {
    type: AlertType.HEALTH_VACCINATION_DUE,
    severity: AlertSeverity.WARNING,
    title: 'Vaccination à Effectuer',
    messageTemplate: 'Le vaccin {vaccine_name} est prévu pour le lot {lot_name} (âge: {age_days} jours).',
    expirationHours: 48,
    canDismiss: true,
    recommendationsGenerator: (ctx) => [
      {
        action: 'Programmer la vaccination',
        description: 'Prévoir le vaccin dans les 24-48h',
        priority: 1,
      },
      {
        action: 'Vérifier le stock',
        description: 'S\'assurer de la disponibilité du vaccin',
        priority: 2,
      },
    ],
  },

  // Stock
  [AlertType.STOCK_LOW_LEVEL]: {
    type: AlertType.STOCK_LOW_LEVEL,
    severity: AlertSeverity.WARNING,
    title: 'Stock Bas',
    messageTemplate: '{item_name} : {current_quantity} {unit} restant(s), seuil d\'alerte à {threshold} {unit}.',
    expirationHours: 72,
    canDismiss: true,
    recommendationsGenerator: (ctx) => [
      {
        action: 'Commander maintenant',
        description: `Passer commande de ${ctx.recommended_quantity || 'quantité recommandée'}`,
        priority: 1,
        estimatedImpact: 'Éviter rupture de stock',
      },
      {
        action: 'Rechercher fournisseur',
        description: 'Comparer les prix sur le marketplace',
        priority: 2,
      },
    ],
  },

  [AlertType.STOCK_OUT_OF_STOCK]: {
    type: AlertType.STOCK_OUT_OF_STOCK,
    severity: AlertSeverity.URGENT,
    title: 'Rupture de Stock',
    messageTemplate: '{item_name} est en rupture de stock !',
    expirationHours: 24,
    requiresAction: true,
    recommendationsGenerator: (ctx) => [
      {
        action: 'Commande urgente',
        description: 'Passer commande immédiatement',
        priority: 1,
        estimatedImpact: 'Critique pour continuité production',
      },
      {
        action: 'Solution temporaire',
        description: 'Chercher alternative ou emprunter à un éleveur proche',
        priority: 2,
      },
    ],
  },

  // Finance
  [AlertType.FINANCE_NEGATIVE_MARGIN]: {
    type: AlertType.FINANCE_NEGATIVE_MARGIN,
    severity: AlertSeverity.URGENT,
    title: 'Marge Négative',
    messageTemplate: 'Votre marge nette est de {margin}%, en dessous de la rentabilité.',
    expirationHours: 168, // 7 jours
    requiresAction: true,
    recommendationsGenerator: (ctx) => [
      {
        action: 'Analyser les coûts',
        description: 'Identifier les postes de dépense élevés',
        priority: 1,
        estimatedImpact: 'Optimisation possible de 10-15%',
      },
      {
        action: 'Revoir stratégie de vente',
        description: 'Augmenter prix ou trouver meilleurs débouchés',
        priority: 2,
      },
      {
        action: 'Réduire pertes',
        description: 'Améliorer santé pour baisser mortalité',
        priority: 3,
      },
    ],
  },

  [AlertType.FINANCE_EXPENSE_SPIKE]: {
    type: AlertType.FINANCE_EXPENSE_SPIKE,
    severity: AlertSeverity.URGENT,
    title: 'Pic de Dépenses Détecté',
    messageTemplate: 'Les dépenses en {category} sont de {amount} FCFA, soit {deviation}% de plus que la normale.',
    titleStyle: { // Styles centralisés pour le titre
      fontSize: 18,
      fontWeight: 'bold',
    },
    messageStyle: { // Styles centralisés pour le message
      fontSize: 16,
      color: '#333',
    },
   expirationHours: 72,
    requiresAction: true,
    recommendationsGenerator: (ctx) => [
      {
        action: 'Analyser les transactions',
        description: `Vérifiez les dernières transactions dans la catégorie "${ctx.category}" pour identifier la source de l'augmentation.`,
        priority: 1,
        estimatedImpact: 'Identification rapide de la cause',
      },
      {
        action: 'Comparer avec les fournisseurs',
        description: 'Vérifiez si les prix de vos fournisseurs pour cette catégorie ont augmenté.',
        priority: 2,
      },
    ],
  },

  [AlertType.FINANCE_LOW_CASHFLOW]: {
    type: AlertType.FINANCE_LOW_CASHFLOW,
    severity: AlertSeverity.CRITICAL,
    title: 'Trésorerie Critique',
    messageTemplate: 'Votre trésorerie est dangereusement basse. Prévision à 30 jours: {forecast_30} FCFA.',
    expirationHours: 48,
    requiresAction: true,
    recommendationsGenerator: (ctx) => [
      {
        action: 'Accélérer les ventes',
        description: 'Mettez en vente les lots prêts à être commercialisés pour générer des revenus rapidement.',
        priority: 1,
        estimatedImpact: 'Injection de liquidités immédiate',
      },
      {
        action: 'Réduire les dépenses non essentielles',
        description: 'Reportez les achats non urgents (équipement, etc.) pour préserver la trésorerie.',
        priority: 2,
      },
      {
        action: 'Négocier avec les fournisseurs',
        description: 'Demandez des délais de paiement pour vos factures d\'aliments ou de médicaments.',
        priority: 3,
      },
    ],
  },
  // Lots
  [AlertType.LOT_OPTIMAL_SALE_WINDOW]: {
    type: AlertType.LOT_OPTIMAL_SALE_WINDOW,
    severity: AlertSeverity.INFO,
    title: 'Fenêtre de Vente Optimale',
    messageTemplate: 'Le lot {lot_name} atteindra son poids optimal dans {days_remaining} jours. C\'est le moment idéal pour vendre !',
    expirationHours: 48,
    canDismiss: true,
    recommendationsGenerator: (ctx) => [
      {
        action: 'Publier sur Marketplace',
        description: 'Mettre en vente dès maintenant',
        priority: 1,
        estimatedImpact: `ROI estimé: +${ctx.estimated_margin || '15'}%`,
      },
      {
        action: 'Contacter acheteurs',
        description: 'Prévenir vos clients réguliers',
        priority: 2,
      },
    ],
  },

  [AlertType.LOT_GROWTH_DELAYED]: {
    type: AlertType.LOT_GROWTH_DELAYED,
    severity: AlertSeverity.WARNING,
    title: 'Croissance Ralentie',
    messageTemplate: 'Le lot {lot_name} présente un retard de croissance de {delay_percentage}% par rapport à la norme.',
    expirationHours: 72,
    recommendationsGenerator: (ctx) => [
      {
        action: 'Vérifier alimentation',
        description: 'Contrôler qualité et quantité d\'aliment',
        priority: 1,
      },
      {
        action: 'Contrôle sanitaire',
        description: 'Éliminer parasites ou maladies subcliniques',
        priority: 2,
      },
      {
        action: 'Améliorer conditions',
        description: 'Optimiser température, lumière, densité',
        priority: 3,
      },
    ],
  },

  [AlertType.LOT_FEED_CONSUMPTION_ABNORMAL]: {
    type: AlertType.LOT_FEED_CONSUMPTION_ABNORMAL,
    severity: AlertSeverity.WARNING,
    title: 'Consommation d\'Aliment Anormale',
    messageTemplate: 'Le lot {lot_name} a une efficacité alimentaire de {efficiency}%. Le ratio de conversion (FCR) est de {fcr}.',
    expirationHours: 72,
    recommendationsGenerator: (ctx) => [
      {
        action: 'Vérifier la qualité de l\'aliment',
        description: 'S\'assurer que l\'aliment n\'est pas périmé ou moisi.',
        priority: 1,
      },
      {
        action: 'Contrôler l\'accès à l\'eau',
        description: 'Une mauvaise hydratation réduit la consommation d\'aliment.',
        priority: 2,
      },
      {
        action: 'Observer le comportement du lot',
        description: 'Rechercher des signes de maladie ou de stress.',
        priority: 3,
      },
    ],
  },
  // Marketplace
  [AlertType.MARKETPLACE_NEW_ORDER]: {
    type: AlertType.MARKETPLACE_NEW_ORDER,
    severity: AlertSeverity.INFO,
    title: 'Nouvelle Commande',
    messageTemplate: 'Vous avez reçu une commande de {buyer_name} pour {product_name}.',
    expirationHours: 24,
    canDismiss: false,
    requiresAction: true,
    recommendationsGenerator: () => [
      {
        action: 'Accepter la commande',
        description: 'Confirmer la disponibilité du produit',
        priority: 1,
      },
      {
        action: 'Préparer la livraison',
        description: 'Organiser l\'emballage et le transport',
        priority: 2,
      },
    ],
  },

  // Système
  [AlertType.SYSTEM_PERFORMANCE_DEGRADED]: {
    type: AlertType.SYSTEM_PERFORMANCE_DEGRADED,
    severity: AlertSeverity.WARNING,
    title: 'Performance Dégradée',
    messageTemplate: 'L\'application rencontre des ralentissements ({operation_name}: {duration}ms).',
    expirationHours: 6,
    canDismiss: true,
  },

  [AlertType.SYSTEM_DATA_SYNC_FAILED]: {
    type: AlertType.SYSTEM_DATA_SYNC_FAILED,
    severity: AlertSeverity.URGENT,
    title: 'Échec de Synchronisation',
    messageTemplate: 'La synchronisation des données a échoué. Certaines informations peuvent être obsolètes.',
    expirationHours: 2,
    requiresAction: true,
    recommendationsGenerator: () => [
      {
        action: 'Vérifier connexion',
        description: 'S\'assurer d\'avoir une connexion internet stable',
        priority: 1,
      },
      {
        action: 'Réessayer',
        description: 'Forcer la synchronisation manuellement',
        priority: 2,
      },
    ],
  },
};

// ==================== CLASSE PRINCIPALE ====================

class SmartAlertSystem {
  private static instance: SmartAlertSystem;
  private cachedProfileId: string | null = null; // Cache pour l'ID du profil

  private constructor() {}

  public static getInstance(): SmartAlertSystem {
    if (!SmartAlertSystem.instance) {
      SmartAlertSystem.instance = new SmartAlertSystem();
    }
    return SmartAlertSystem.instance;
  }

  /**
   * Vide le cache interne (ex: ID de profil).
   * Doit être appelé lors de la déconnexion de l'utilisateur.
   */
  public clearCache(): void {
    this.cachedProfileId = null;
    console.log('[SmartAlertSystem] Cache vidé.');
  }
  /**
   * CRÉER UNE ALERTE INTELLIGENTE
   */
  public async createAlert(params: CreateAlertParams): Promise<string | null> {
    try {
      const config = ALERT_CONFIGS[params.type];
      if (!config) {
        throw new Error(`Configuration non trouvée pour le type d'alerte: ${params.type}`);
      }

      // Vérifier si une alerte similaire existe déjà (éviter duplication)
      const existingAlert = await this.findSimilarAlert(params);
      if (existingAlert) {
        console.log('[SmartAlertSystem] Alerte similaire déjà existante, mise à jour');
        await this.updateAlertOccurrence(existingAlert.id, params.context);
        return existingAlert.id;
      }

      // Générer le message à partir du template
      const message = this.generateMessage(config.messageTemplate, params.context);

      // Générer les recommandations
      const recommendations = config.recommendationsGenerator
        ? config.recommendationsGenerator(params.context)
        : [];

      // Calculer la date d'expiration
      const expiresAt = config.expirationHours
        ? new Date(Date.now() + config.expirationHours * 60 * 60 * 1000).toISOString()
        : null;

      const supabase = await getSupabaseClient();
      if (!supabase) throw new Error('Supabase non disponible');

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('[SmartAlertSystem] Utilisateur non authentifié, impossible de créer l\'alerte.');
        return null;
      }
      // CORRECTION: La table 'profiles' n'a pas de 'farm_id'. L'ID de la ferme est le user_id.
      const farmId = user.id;

      // Insérer l'alerte
      const { data: alert, error } = await supabase
        .from('alerts')
        .insert({
          user_id: user.id,
          farm_id: params.farmId || farmId, // Utiliser le user.id comme farm_id par défaut
          alert_type: params.type,
          severity: params.overrideSeverity || config.severity,
          title: config.title,
          message,
          recommendations,
          context: params.context,
          related_entity_type: params.relatedEntityType,
          related_entity_id: params.relatedEntityId,
          expires_at: expiresAt,
          status: 'active',
        })
        .select()
        .single();

      if (error) throw error;

      // Logger dans DataCollector
      dataCollector.collect(
        EventType.ALERT_GENERATED,
        {
          alert_id: alert.id,
          alert_type: params.type,
          severity: config.severity,
          related_entity: params.relatedEntityType,
        },
        config.severity === AlertSeverity.CRITICAL
          ? EventPriority.CRITICAL
          : EventPriority.MEDIUM,
        'success'
      );

      return alert.id;
    } catch (error) {
      console.error('[SmartAlertSystem] Erreur création alerte:', error);
      dataCollector.trackError(error as Error, {
        action: 'createAlert',
        alertType: params.type,
      });
      return null;
    }
  }

  /**
   * CRÉER DES ALERTES EN BATCH (Plus performant)
   */
  public async createAlertsBatch(alertsParams: CreateAlertParams[]): Promise<string[]> {
    const alertIds: string[] = [];

    for (const params of alertsParams) {
      const alertId = await this.createAlert(params);
      if (alertId) alertIds.push(alertId);
    }

    return alertIds;
  }

  /**
   * HELPERS POUR TYPES D'ALERTES COURANTS
   */

  public async alertHighMortality(
    lotId: string,
    lotName: string,
    mortalityRate: number,
    threshold: number = 5
  ) {
    return this.createAlert({
      type: AlertType.HEALTH_MORTALITY_HIGH,
      context: {
        lot_name: lotName,
        mortality_rate: mortalityRate.toFixed(1),
        threshold: threshold.toFixed(1),
      },
      relatedEntityType: 'lot',
      relatedEntityId: lotId,
    });
  }

  public async alertLowStock(
    itemId: string,
    itemName: string,
    currentQuantity: number,
    threshold: number,
    unit: string
  ) {
    const severity = currentQuantity === 0
      ? AlertSeverity.URGENT
      : AlertSeverity.WARNING;

    const type = currentQuantity === 0
      ? AlertType.STOCK_OUT_OF_STOCK
      : AlertType.STOCK_LOW_LEVEL;

    return this.createAlert({
      type,
      context: {
        item_name: itemName,
        current_quantity: currentQuantity,
        threshold,
        unit,
        recommended_quantity: threshold * 2,
      },
      relatedEntityType: 'stock_item',
      relatedEntityId: itemId,
      overrideSeverity: severity,
    });
  }

  public async alertOptimalSaleWindow(
    lotId: string,
    lotName: string,
    daysRemaining: number,
    estimatedMargin: number
  ) {
    return this.createAlert({
      type: AlertType.LOT_OPTIMAL_SALE_WINDOW,
      context: {
        lot_name: lotName,
        days_remaining: daysRemaining,
        estimated_margin: estimatedMargin.toFixed(1),
      },
      relatedEntityType: 'lot',
      relatedEntityId: lotId,
    });
  }

  public async alertNegativeMargin(
    margin: number,
    period: string = 'ce mois',
    farmId?: string // Ajout du paramètre farmId
  ) {
    return this.createAlert({
      type: AlertType.FINANCE_NEGATIVE_MARGIN,
      context: {
        margin: margin.toFixed(1),
        period,
      },
      farmId: farmId, // Passer le farmId ici
    });
  }

  /**
   * UTILITAIRES
   */

  private generateMessage(template: string, context: Record<string, any>): string {
    let message = template;

    Object.keys(context).forEach(key => {
      const placeholder = `{${key}}`;
      message = message.replace(new RegExp(placeholder, 'g'), context[key]);
    });

    return message;
  }

  private async findSimilarAlert(params: CreateAlertParams): Promise<any | null> {
    try {
      const supabase = await getSupabaseClient();
      if (!supabase) return null;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data } = await supabase
        .from('alerts')
        .select('*')
        .eq('user_id', user.id) // La recherche se fait bien sur user_id
        .eq('alert_type', params.type)
        .eq('status', 'active')
        .eq('related_entity_id', params.relatedEntityId || '')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .limit(1)
        .single();

      return data;
    } catch {
      return null;
    }
  }

  private async updateAlertOccurrence(alertId: string, newContext: Record<string, any>) {
    const supabase = await getSupabaseClient();
    if (!supabase) return;

    await supabase
      .from('alerts')
      .update({
        context: newContext,
        created_at: new Date().toISOString(), // Rafraîchir timestamp
      })
      .eq('id', alertId);
  }

  /**
   * AUTO-NETTOYAGE DES ALERTES EXPIRÉES
   */
  public async cleanupExpiredAlerts(): Promise<number> {
    try {
      const supabase = await getSupabaseClient();
      if (!supabase) return 0;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return 0;

      const { data, error } = await supabase
        .from('alerts')
        .update({ status: 'expired' })
        .eq('user_id', user.id)
        .eq('status', 'active')
        .lt('expires_at', new Date().toISOString())
        .select();

      if (error) throw error;

      return data?.length || 0;
    } catch (error) {
      console.error('[SmartAlertSystem] Erreur cleanup:', error);
      return 0;
    }
  }
}

// Export singleton
export const smartAlertSystem = SmartAlertSystem.getInstance();

// Hook React
export const useSmartAlerts = () => {
  return {
    createAlert: (params: CreateAlertParams) => smartAlertSystem.createAlert(params),
    alertHighMortality: (lotId: string, lotName: string, rate: number, threshold?: number) =>
      smartAlertSystem.alertHighMortality(lotId, lotName, rate, threshold),
    alertLowStock: (itemId: string, name: string, qty: number, threshold: number, unit: string) =>
      smartAlertSystem.alertLowStock(itemId, name, qty, threshold, unit),
    alertOptimalSaleWindow: (lotId: string, name: string, days: number, margin: number) =>
      smartAlertSystem.alertOptimalSaleWindow(lotId, name, days, margin),
    alertNegativeMargin: (margin: number, period?: string) =>
      smartAlertSystem.alertNegativeMargin(margin, period),
  };
};