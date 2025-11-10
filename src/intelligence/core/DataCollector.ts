// src/intelligence/core/DataCollector.ts
// Import dynamique pour éviter les problèmes d'initialisation
let _supabase: any = null;

const getSupabaseClient = async () => {
  if (!_supabase) {
    try {
      const { supabase } = await import('../../../config'); // Utiliser le client Supabase consolidé
      _supabase = supabase;
    } catch (error) {
      console.error('[DataCollector] Erreur chargement Supabase:', error);
      return null;
    }
  }
  return _supabase;
};

/**
 * SYSTÈME NERVEUX CENTRAL - COLLECTEUR DE DONNÉES
 * 
 * Capture toutes les actions et données pour:
 * - Apprentissage machine
 * - Génération de recommandations
 * - Détection de patterns
 * - Amélioration continue
 */

// Types d'événements tracés
export enum EventType {
  // Actions utilisateur
  USER_LOGIN = 'user_login',
  USER_LOGOUT = 'user_logout',
  PAGE_VIEW = 'page_view',
  BUTTON_CLICK = 'button_click',
  FORM_SUBMIT = 'form_submit',
  
  // Gestion lots
  LOT_CREATED = 'lot_created',
  LOT_UPDATED = 'lot_updated',
  LOT_ARCHIVED = 'lot_archived',
  LOT_VIEWED = 'lot_viewed',
  DAILY_UPDATE_ADDED = 'daily_update_added',
  
  // Finance
  TRANSACTION_ADDED = 'transaction_added',
  FINANCIAL_REPORT_VIEWED = 'financial_report_viewed',
  
  // Stock
  STOCK_ITEM_ADDED = 'stock_item_added',
  STOCK_ADJUSTED = 'stock_adjusted',
  STOCK_ALERT_TRIGGERED = 'stock_alert_triggered',
  
  // Santé
  HEALTH_ANALYSIS_REQUESTED = 'health_analysis_requested',
  HEALTH_ANALYSIS_COMPLETED = 'health_analysis_completed',
  VACCINATION_COMPLETED = 'vaccination_completed',
  MORTALITY_RECORDED = 'mortality_recorded',
  
  // Marketplace
  PRODUCT_VIEWED = 'product_viewed',
  PRODUCT_ADDED_TO_CART = 'product_added_to_cart',
  ORDER_PLACED = 'order_placed',
  ORDER_STATUS_CHANGED = 'order_status_changed',
  MESSAGE_SENT = 'message_sent',
  
  // Livraisons
  DELIVERY_ACCEPTED = 'delivery_accepted',
  DELIVERY_COMPLETED = 'delivery_completed',
  
  // Alertes et recommandations
  ALERT_GENERATED = 'alert_generated',
  ALERT_VIEWED = 'alert_viewed',
  ALERT_DISMISSED = 'alert_dismissed',
  ALERT_ACTION_TAKEN = 'alert_action_taken',
  RECOMMENDATION_SHOWN = 'recommendation_shown',
  RECOMMENDATION_ACCEPTED = 'recommendation_accepted',
  RECOMMENDATION_REJECTED = 'recommendation_rejected',
  
  // Performance
  ERROR_OCCURRED = 'error_occurred',
  SLOW_OPERATION = 'slow_operation',
}

// Niveaux de priorité pour le traitement
export enum EventPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

// Structure d'un événement
export interface CollectedEvent {
  id?: string;
  event_type: EventType;
  user_id?: string;
  farm_id?: string;
  priority: EventPriority;
  context: Record<string, any>;
  metadata: {
    timestamp: string;
    device_info?: string;
    app_version?: string;
    session_id?: string;
    location?: string;
  };
  outcome?: 'success' | 'failure' | 'partial';
  error_message?: string;
  session_id?: string;
  user_agent?: string;
  ip_address?: string;
  duration_ms?: number;
  performance_score?: number;
}

// Configuration du collecteur
interface CollectorConfig {
  enableLocalStorage: boolean;
  batchSize: number;
  flushInterval: number; // ms
  retryAttempts: number;
  anonymizeData: boolean;
}

class DataCollector {
  private static instance: DataCollector;
  private eventQueue: CollectedEvent[] = [];
  private config: CollectorConfig;
  private flushTimer: any = null;
  private sessionId: string;
  private isFlushing: boolean = false;
  
  private constructor() {
    this.config = {
      enableLocalStorage: true,
      batchSize: 10,
      flushInterval: 5000, // 5 secondes
      retryAttempts: 3,
      anonymizeData: false,
    };
    
    this.sessionId = this.generateSessionId();
    this.startAutoFlush();
    this.restoreQueueFromStorage();
  }
  
  public static getInstance(): DataCollector {
    if (!DataCollector.instance) {
      DataCollector.instance = new DataCollector();
    }
    return DataCollector.instance;
  }
  
  /**
   * MÉTHODE PRINCIPALE : Collecter un événement
   */
  public async collect(
    eventType: EventType,
    context: Record<string, any>,
    priority: EventPriority = EventPriority.MEDIUM,
    outcome?: 'success' | 'failure' | 'partial',
    error?: string
  ): Promise<void> {
    try {
      const event: CollectedEvent = {
        event_type: eventType,
        user_id: await this.getCurrentUserId(),
        farm_id: await this.getCurrentFarmId(),
        priority,
        context: this.config.anonymizeData ? this.anonymize(context) : context,
        metadata: {
          timestamp: new Date().toISOString(),
          device_info: this.getDeviceInfo(),
          app_version: this.getAppVersion(),
          session_id: this.sessionId,
        },
        outcome,
        error_message: error,
      };
      
      // Ajout à la queue
      this.eventQueue.push(event);
      
      // Sauvegarde locale
      if (this.config.enableLocalStorage) {
        this.saveQueueToStorage();
      }
      
      // Flush immédiat si critique ou queue pleine
      if (priority === EventPriority.CRITICAL || this.eventQueue.length >= this.config.batchSize) {
        await this.flush();
      }
    } catch (error) {
      console.error('[DataCollector] Erreur lors de la collecte:', error);
    }
  }
  
  /**
   * MÉTHODES HELPER POUR ÉVÉNEMENTS COURANTS
   */
  
  // Navigation
  public trackPageView(pageName: string, additionalContext?: Record<string, any>) {
    this.collect(EventType.PAGE_VIEW, {
      page_name: pageName,
      ...additionalContext,
    }, EventPriority.LOW);
  }
  
  // Actions utilisateur
  public trackAction(actionName: string, context: Record<string, any> = {}) {
    this.collect(EventType.BUTTON_CLICK, {
      action_name: actionName,
      ...context,
    }, EventPriority.LOW);
  }
  
  // Lots
  public trackLotEvent(action: 'created' | 'updated' | 'archived', lotData: any) {
    const eventMap = {
      created: EventType.LOT_CREATED,
      updated: EventType.LOT_UPDATED,
      archived: EventType.LOT_ARCHIVED,
    };
    
    this.collect(eventMap[action], {
      lot_id: lotData.id,
      race: lotData.race,
      quantity: lotData.quantity_actuelle || lotData.quantity,
      age_days: lotData.age_jours,
    }, EventPriority.MEDIUM, 'success');
  }
  
  // Santé
  public trackHealthEvent(
    eventType: 'analysis_requested' | 'vaccination' | 'mortality',
    data: any
  ) {
    const eventMap = {
      analysis_requested: EventType.HEALTH_ANALYSIS_REQUESTED,
      vaccination: EventType.VACCINATION_COMPLETED,
      mortality: EventType.MORTALITY_RECORDED,
    };

    const priority = eventType === 'mortality' ? EventPriority.HIGH : EventPriority.MEDIUM;

    this.collect(eventMap[eventType], data, priority, 'success');
  }

  // Analyses IA
  public trackAIAnalysis(
    analysisType: string,
    duration: number,
    success: boolean,
    context: Record<string, any> = {}
  ) {
    this.collect(
      EventType.HEALTH_ANALYSIS_COMPLETED,
      {
        analysis_type: analysisType,
        duration_ms: duration,
        ...context,
      },
      success ? EventPriority.MEDIUM : EventPriority.HIGH,
      success ? 'success' : 'failure'
    );
  }
  
  // Alertes et recommandations
  public trackAlert(
    action: 'generated' | 'viewed' | 'dismissed' | 'action_taken',
    alertData: {
      alert_id: string;
      alert_type: string;
      severity: string;
      time_to_action?: number; // ms
    }
  ) {
    const eventMap = {
      generated: EventType.ALERT_GENERATED,
      viewed: EventType.ALERT_VIEWED,
      dismissed: EventType.ALERT_DISMISSED,
      action_taken: EventType.ALERT_ACTION_TAKEN,
    };
    
    const priority = alertData.severity === 'critical' 
      ? EventPriority.CRITICAL 
      : EventPriority.MEDIUM;
    
    this.collect(eventMap[action], alertData, priority);
  }
  
  public trackRecommendation(
    action: 'shown' | 'accepted' | 'rejected',
    recommendationData: {
      recommendation_id: string;
      recommendation_type: string;
      context: any;
    }
  ) {
    const eventMap = {
      shown: EventType.RECOMMENDATION_SHOWN,
      accepted: EventType.RECOMMENDATION_ACCEPTED,
      rejected: EventType.RECOMMENDATION_REJECTED,
    };
    
    this.collect(eventMap[action], recommendationData, EventPriority.MEDIUM);
  }
  
  // Erreurs et performance
  public trackError(error: Error, context: Record<string, any> = {}) {
    this.collect(
      EventType.ERROR_OCCURRED,
      {
        error_message: error.message,
        error_stack: error.stack,
        ...context,
      },
      EventPriority.HIGH,
      'failure',
      error.message
    );
  }
  
  public trackSlowOperation(operationName: string, duration: number, threshold: number = 1000) {
    if (duration > threshold) {
      this.collect(
        EventType.SLOW_OPERATION,
        {
          operation_name: operationName,
          duration_ms: duration,
          threshold_ms: threshold,
        },
        EventPriority.MEDIUM
      );
    }
  }
  
  /**
   * MÉTHODES DE GESTION DE LA QUEUE
   */
  
  private async flush(): Promise<void> {
    if (this.eventQueue.length === 0 || this.isFlushing) return;

    this.isFlushing = true;

    // Ne pas vider la queue immédiatement. Créer une copie pour l'envoi.
    const eventsToSend = [...this.eventQueue];

    try {
      const supabase = await getSupabaseClient();
      if (!supabase) {
        console.warn('[DataCollector] Supabase non disponible, événements mis en attente');
        // Ne rien faire, les événements restent dans la queue pour le prochain flush
        return;
      }

      // Insérer les événements un par un pour éviter les deadlocks
      for (const event of eventsToSend) {
        try {
          const { error } = await supabase
            .from('activity_logs')
            .insert({
              event_type: event.event_type,
              user_id: event.user_id,
              farm_id: event.farm_id,
              priority: event.priority,
              context: event.context,
              metadata: event.metadata,
              outcome: event.outcome,
              error_message: event.error_message,
              session_id: event.metadata.session_id,
              user_agent: event.metadata.device_info,
              ip_address: undefined,
              duration_ms: event.duration_ms,
              performance_score: event.performance_score,
            });

          if (error) {
            console.error('[DataCollector] Erreur insertion événement:', error);
            // Continuer avec les autres événements même si un échoue
          }
        } catch (eventError) {
          console.error('[DataCollector] Exception lors de l\'insertion d\'un événement:', eventError);
        }
      }

      // Calculer les métriques d'engagement quotidiennes (désactivé temporairement)
      // TODO: Réactiver quand la fonction sera déployée en production
      // await supabase.rpc('calculate_daily_engagement_metrics', {
      //   target_date: new Date().toISOString().split('T')[0]
      // });

      // Succès : Vider la queue des événements qui viennent d'être envoyés
      this.eventQueue.splice(0, eventsToSend.length);

      if (this.config.enableLocalStorage) {
        this.clearStorageQueue();
      }
    } catch (error) {
      console.error('[DataCollector] Erreur lors du flush:', error);

      // En cas d'erreur, les événements ne sont pas supprimés de la queue.
      // On peut ajouter une logique pour limiter la taille de la queue pour éviter une saturation.
      if (this.eventQueue.length > 100) {
        this.eventQueue = this.eventQueue.slice(-100);
      }
    } finally {
      this.isFlushing = false;
    }
  }
  
  private startAutoFlush(): void {
    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.config.flushInterval);
  }
  
  public stopAutoFlush(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }
  
  /**
   * STOCKAGE LOCAL (PERSISTANCE OFFLINE)
   */
  
  private saveQueueToStorage(): void {
    try {
      // Note: Dans un environnement React Native, utiliser AsyncStorage
      // Ici simulation avec un objet en mémoire
      const queueData = JSON.stringify(this.eventQueue);
      // localStorage.setItem('aviprod_event_queue', queueData);
    } catch (error) {
      console.error('[DataCollector] Erreur sauvegarde locale:', error);
    }
  }
  
  private restoreQueueFromStorage(): void {
    try {
      // const queueData = localStorage.getItem('aviprod_event_queue');
      // if (queueData) {
      //   this.eventQueue = JSON.parse(queueData);
      // }
    } catch (error) {
      console.error('[DataCollector] Erreur restauration queue:', error);
    }
  }
  
  private clearStorageQueue(): void {
    try {
      // localStorage.removeItem('aviprod_event_queue');
    } catch (error) {
      console.error('[DataCollector] Erreur nettoyage storage:', error);
    }
  }
  
  /**
   * UTILITAIRES
   */
  
  private async getCurrentUserId(): Promise<string | undefined> {
    try {
      const supabase = await getSupabaseClient();
      if (!supabase) return undefined;

      const { data: { user } } = await supabase.auth.getUser();
      return user?.id;
    } catch {
      return undefined;
    }
  }

  private async getCurrentFarmId(): Promise<string | undefined> {
    try {
      const supabase = await getSupabaseClient();
      if (!supabase) return undefined;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return undefined;

      // L'ID de la ferme est l'ID de l'utilisateur. La table profiles n'a pas de colonne farm_id.
      return user.id;
    } catch {
      return undefined;
    }
  }
  
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  private getDeviceInfo(): string {
    // Dans React Native, utiliser Device info
    return 'web'; // Placeholder
  }
  
  private getAppVersion(): string {
    return '1.0.0'; // À lire depuis config
  }
  
  private anonymize(data: Record<string, any>): Record<string, any> {
    // Supprimer les données sensibles
    const sensitiveKeys = ['password', 'email', 'phone', 'address', 'cni'];
    const anonymized = { ...data };
    
    sensitiveKeys.forEach(key => {
      if (anonymized[key]) {
        anonymized[key] = '[REDACTED]';
      }
    });
    
    return anonymized;
  }
  
  /**
   * MÉTHODES PUBLIQUES DE CONFIGURATION
   */
  
  public configure(config: Partial<CollectorConfig>): void {
    this.config = { ...this.config, ...config };
  }
  
  public async forceFlush(): Promise<void> {
    await this.flush();
  }
  
  public getQueueSize(): number {
    return this.eventQueue.length;
  }
}

// Export singleton
export const dataCollector = DataCollector.getInstance();

// Hook React pour faciliter l'utilisation
export const useDataCollector = () => {
  return {
    trackPageView: (pageName: string, context?: Record<string, any>) => 
      dataCollector.trackPageView(pageName, context),
    trackAction: (actionName: string, context?: Record<string, any>) => 
      dataCollector.trackAction(actionName, context),
    trackLotEvent: (action: 'created' | 'updated' | 'archived', lotData: any) => 
      dataCollector.trackLotEvent(action, lotData),
    trackHealthEvent: (
      eventType: 'analysis_requested' | 'vaccination' | 'mortality',
      data: any
    ) => dataCollector.trackHealthEvent(eventType, data),
    trackAIAnalysis: (
      analysisType: string,
      duration: number,
      success: boolean,
      context?: Record<string, any>
    ) => dataCollector.trackAIAnalysis(analysisType, duration, success, context),
    trackAlert: (
      action: 'generated' | 'viewed' | 'dismissed' | 'action_taken',
      alertData: any
    ) => dataCollector.trackAlert(action, alertData),
    trackRecommendation: (
      action: 'shown' | 'accepted' | 'rejected',
      recommendationData: any
    ) => dataCollector.trackRecommendation(action, recommendationData),
    trackError: (error: Error, context?: Record<string, any>) => 
      dataCollector.trackError(error, context),
    trackSlowOperation: (operationName: string, duration: number, threshold?: number) => 
      dataCollector.trackSlowOperation(operationName, duration, threshold),
  };
};

/**
 * DÉCORATEUR POUR TRACKING AUTOMATIQUE DE PERFORMANCE
 */
export function TrackPerformance(operationName?: string) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      const startTime = performance.now();
      
      try {
        const result = await originalMethod.apply(this, args);
        const duration = performance.now() - startTime;
        
        dataCollector.trackSlowOperation(
          operationName || propertyKey,
          duration
        );
        
        return result;
      } catch (error) {
        const duration = performance.now() - startTime;
        
        dataCollector.trackError(error as Error, {
          operation: operationName || propertyKey,
          duration_ms: duration,
        });
        
        throw error;
      }
    };
    
    return descriptor;
  };
}