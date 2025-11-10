// src/contexts/UniversalIntelligenceContext.tsx
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
// Import dynamique pour éviter les problèmes d'initialisation
let supabaseClient: any = null;

const getSupabaseClient = async () => { // Cette fonction est maintenant redondante car `supabase` est directement exporté depuis config
  if (!supabaseClient) {
    try {
      const { supabase } = await import('../../config'); // Utiliser le client Supabase consolidé
      supabaseClient = supabase;
    } catch (error) {
      console.error('[UniversalIntelligenceContext] Erreur chargement Supabase:', error);
      return null;
    }
  }
  return supabaseClient;
};
import { dataCollector } from '../intelligence/core/DataCollector';

/**
 * CONTEXTE UNIVERSEL D'INTELLIGENCE
 *
 * Centralise toutes les données intelligentes de l'application:
 * - État de la ferme en temps réel
 * - Alertes actives
 * - Recommandations IA
 * - Métriques de performance
 * - Patterns détectés
 */

// ==================== TYPES ====================

export interface Alert {
  id: string;
  alert_type: string;
  severity: 'info' | 'warning' | 'urgent' | 'critical';
  title: string;
  message: string;
  recommendations: any[];
  context: Record<string, any>;
  related_entity_type?: string;
  related_entity_id?: string;
  status: 'active' | 'viewed' | 'dismissed' | 'resolved' | 'expired';
  created_at: string;
  viewed_at?: string;
  dismissed_at?: string;
  action_taken_at?: string;
}

export interface Recommendation {
  id: string;
  recommendation_type: string;
  category: string;
  priority: number;
  title: string;
  description: string;
  actions: any[];
  expected_impact: any;
  context: Record<string, any>;
  confidence_score: number;
  status: 'pending' | 'shown' | 'accepted' | 'rejected' | 'expired';
  created_at: string;
}

export interface FarmMetrics {
  health_score: number;
  active_lots_count: number;
  total_birds: number;
  avg_mortality_rate: number;
  stock_alert_count: number;
  financial_balance: number;
  critical_alerts_count: number;
}

export interface DetectedPattern {
  id: string;
  pattern_type: string;
  pattern_name: string;
  description: string;
  confidence_score: number;
  impact_category: string;
  impact_severity: 'positive' | 'neutral' | 'negative';
  occurrences_count: number;
}

interface UniversalIntelligenceContextType {
  // État de la ferme
  farmMetrics: FarmMetrics | null;
  farmId: string | null;
  userId: string | null;

  // Alertes
  alerts: Alert[];
  criticalAlerts: Alert[];
  unreadAlertsCount: number;

  // Recommandations
  recommendations: Recommendation[];
  topRecommendations: Recommendation[];

  // Patterns
  patterns: DetectedPattern[];
  recentPatterns: DetectedPattern[];

  // État de chargement
  isLoading: boolean;
  lastUpdated: Date | null;

  // Actions sur alertes
  markAlertAsViewed: (alertId: string) => Promise<void>;
  markAlertAsDismissed: (alertId: string) => Promise<void>;
  markAlertActionTaken: (alertId: string, action: string) => Promise<void>;
  rateAlert: (alertId: string, rating: number) => Promise<void>;

  // Actions sur recommandations
  acceptRecommendation: (recommendationId: string) => Promise<void>;
  rejectRecommendation: (recommendationId: string, reason?: string) => Promise<void>;

  // Rafraîchissement
  refreshAll: () => Promise<void>;
  refreshAlerts: () => Promise<void>;
  refreshRecommendations: () => Promise<void>;
  refreshMetrics: () => Promise<void>;
}

const UniversalIntelligenceContext = createContext<UniversalIntelligenceContextType | undefined>(undefined);

// ==================== PROVIDER ====================

export const UniversalIntelligenceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // État principal
  const [userId, setUserId] = useState<string | null>(null);
  const [farmId, setFarmId] = useState<string | null>(null);
  const [farmMetrics, setFarmMetrics] = useState<FarmMetrics | null>(null);

  // Alertes et recommandations
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [patterns, setPatterns] = useState<DetectedPattern[]>([]);

  // État UI
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // ==================== INITIALISATION ====================

  useEffect(() => {
    initializeContext();
  }, []);

  const initializeContext = async () => {
    try {
      // Récupérer user et farm
      const supabase = await getSupabaseClient();
      if (!supabase) {
        console.warn('[UniversalContext] Supabase non disponible');
        setIsLoading(false);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsLoading(false);
        return;
      }

      setUserId(user.id);

      const { data: profile } = await supabase
        .from('profiles')
        .select('farm_id')
        .eq('id', user.id)
        .single();

      if (profile?.farm_id) {
        setFarmId(profile.farm_id);

        // Charger toutes les données
        await Promise.all([
          fetchAlerts(profile.farm_id),
          fetchRecommendations(profile.farm_id),
          fetchMetrics(profile.farm_id),
          fetchPatterns(profile.farm_id),
        ]);

        // Setup real-time subscriptions
        setupRealtimeSubscriptions(user.id, profile.farm_id);
      }

      setIsLoading(false);
      setLastUpdated(new Date());

      // Track page load
      dataCollector.trackPageView('UniversalContext');
    } catch (error) {
      console.error('[UniversalContext] Erreur initialisation:', error);
      dataCollector.trackError(error as Error, { context: 'initialization' });
      setIsLoading(false);
    }
  };

  // ==================== FETCH DONNÉES ====================

  const fetchAlerts = async (farmId: string) => {
    try {
      const supabase = await getSupabaseClient();
      if (!supabase) return;

      const { data, error } = await supabase
        .from('alerts')
        .select('*')
        .eq('farm_id', farmId)
        .in('status', ['active', 'viewed'])
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setAlerts(data || []);
    } catch (error) {
      console.error('[UniversalContext] Erreur fetch alerts:', error);
    }
  };

  const fetchRecommendations = async (farmId: string) => {
    try {
      const supabase = await getSupabaseClient();
      if (!supabase) return;

      const { data, error } = await supabase
        .from('ai_recommendations')
        .select('*')
        .eq('farm_id', farmId)
        .in('status', ['pending', 'shown'])
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setRecommendations(data || []);
    } catch (error) {
      console.error('[UniversalContext] Erreur fetch recommendations:', error);
    }
  };

  const fetchMetrics = async (farmId: string) => {
    try {
      const supabase = await getSupabaseClient();
      if (!supabase) {
        // Fallback : calculer localement
        const fallbackMetrics: FarmMetrics = {
          health_score: 85,
          active_lots_count: 0,
          total_birds: 0,
          avg_mortality_rate: 0,
          stock_alert_count: 0,
          financial_balance: 0,
          critical_alerts_count: alerts.filter(a => a.severity === 'critical').length,
        };
        setFarmMetrics(fallbackMetrics);
        return;
      }

      // Appel à une fonction Supabase qui calcule les métriques
      const { data, error } = await supabase.rpc('get_farm_metrics', {
        p_farm_id: farmId
      });

      if (error) throw error;
      setFarmMetrics(data);
    } catch (error) {
      console.error('[UniversalContext] Erreur fetch metrics:', error);

      // Fallback : calculer localement
      const fallbackMetrics: FarmMetrics = {
        health_score: 85,
        active_lots_count: 0,
        total_birds: 0,
        avg_mortality_rate: 0,
        stock_alert_count: 0,
        financial_balance: 0,
        critical_alerts_count: alerts.filter(a => a.severity === 'critical').length,
      };

      setFarmMetrics(fallbackMetrics);
    }
  };

  const fetchPatterns = async (farmId: string) => {
    try {
      const supabase = await getSupabaseClient();
      if (!supabase) return;

      const { data, error } = await supabase
        .from('detected_patterns')
        .select('*')
        .eq('farm_id', farmId)
        .eq('status', 'active')
        .order('last_detected_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setPatterns(data || []);
    } catch (error) {
      console.error('[UniversalContext] Erreur fetch patterns:', error);
    }
  };

  // ==================== REAL-TIME SUBSCRIPTIONS ====================

  const setupRealtimeSubscriptions = async (userId: string, farmId: string) => {
    const supabase = await getSupabaseClient();
    if (!supabase) return;

    // Subscription aux alertes
    const alertsSubscription = supabase
      .channel('alerts_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'alerts',
          filter: `farm_id=eq.${farmId}`,
        },
        (payload: any) => {
          console.log('[UniversalContext] Alert update:', payload);
          refreshAlerts();
        }
      )
      .subscribe();

    // Subscription aux recommandations
    const recoSubscription = supabase
      .channel('recommendations_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ai_recommendations',
          filter: `farm_id=eq.${farmId}`,
        },
        (payload: any) => {
          console.log('[UniversalContext] Recommendation update:', payload);
          refreshRecommendations();
        }
      )
      .subscribe();

    // Cleanup au démontage
    return () => {
      alertsSubscription.unsubscribe();
      recoSubscription.unsubscribe();
    };
  };

  // ==================== ACTIONS ALERTES ====================

  const markAlertAsViewed = useCallback(async (alertId: string) => {
    try {
      const supabase = await getSupabaseClient();
      if (!supabase) return;

      const { error } = await supabase
        .from('alerts')
        .update({
          viewed_at: new Date().toISOString(),
          status: 'viewed',
        })
        .eq('id', alertId);

      if (error) throw error;

      // Track action
      dataCollector.trackAlert('viewed', {
        alert_id: alertId,
        alert_type: alerts.find(a => a.id === alertId)?.alert_type || 'unknown',
        severity: alerts.find(a => a.id === alertId)?.severity || 'info',
      });

      await refreshAlerts();
    } catch (error) {
      console.error('[UniversalContext] Erreur mark as viewed:', error);
      dataCollector.trackError(error as Error, { action: 'markAlertAsViewed', alertId });
    }
  }, [alerts]);

  const markAlertAsDismissed = useCallback(async (alertId: string) => {
    try {
      const supabase = await getSupabaseClient();
      if (!supabase) return;

      const { error } = await supabase
        .from('alerts')
        .update({
          dismissed_at: new Date().toISOString(),
          status: 'dismissed',
        })
        .eq('id', alertId);

      if (error) throw error;

      dataCollector.trackAlert('dismissed', {
        alert_id: alertId,
        alert_type: alerts.find(a => a.id === alertId)?.alert_type || 'unknown',
        severity: alerts.find(a => a.id === alertId)?.severity || 'info',
      });

      await refreshAlerts();
    } catch (error) {
      console.error('[UniversalContext] Erreur dismiss alert:', error);
    }
  }, [alerts]);

  const markAlertActionTaken = useCallback(async (alertId: string, action: string) => {
    try {
      const supabase = await getSupabaseClient();
      if (!supabase) return;

      const alert = alerts.find(a => a.id === alertId);
      const timeToAction = alert
        ? Date.now() - new Date(alert.created_at).getTime()
        : 0;

      const { error } = await supabase
        .from('alerts')
        .update({
          action_taken_at: new Date().toISOString(),
          action_taken: action,
          time_to_action: `${Math.floor(timeToAction / 1000)} seconds`,
          status: 'resolved',
        })
        .eq('id', alertId);

      if (error) throw error;

      dataCollector.trackAlert('action_taken', {
        alert_id: alertId,
        alert_type: alert?.alert_type || 'unknown',
        severity: alert?.severity || 'info',
        time_to_action: timeToAction,
      });

      await refreshAlerts();
    } catch (error) {
      console.error('[UniversalContext] Erreur action taken:', error);
    }
  }, [alerts]);

  const rateAlert = useCallback(async (alertId: string, rating: number) => {
    try {
      const supabase = await getSupabaseClient();
      if (!supabase) return;

      const { error } = await supabase
        .from('alerts')
        .update({ user_feedback: rating })
        .eq('id', alertId);

      if (error) throw error;

      await refreshAlerts();
    } catch (error) {
      console.error('[UniversalContext] Erreur rate alert:', error);
    }
  }, []);

  // ==================== ACTIONS RECOMMANDATIONS ====================

  const acceptRecommendation = useCallback(async (recommendationId: string) => {
    try {
      const supabase = await getSupabaseClient();
      if (!supabase) return;

      const { error } = await supabase
        .from('ai_recommendations')
        .update({
          accepted_at: new Date().toISOString(),
          status: 'accepted',
        })
        .eq('id', recommendationId);

      if (error) throw error;

      const reco = recommendations.find(r => r.id === recommendationId);
      dataCollector.trackRecommendation('accepted', {
        recommendation_id: recommendationId,
        recommendation_type: reco?.recommendation_type || 'unknown',
        context: reco?.context || {},
      });

      await refreshRecommendations();
    } catch (error) {
      console.error('[UniversalContext] Erreur accept recommendation:', error);
    }
  }, [recommendations]);

  const rejectRecommendation = useCallback(async (recommendationId: string, reason?: string) => {
    try {
      const supabase = await getSupabaseClient();
      if (!supabase) return;

      const { error } = await supabase
        .from('ai_recommendations')
        .update({
          rejected_at: new Date().toISOString(),
          rejection_reason: reason,
          status: 'rejected',
        })
        .eq('id', recommendationId);

      if (error) throw error;

      const reco = recommendations.find(r => r.id === recommendationId);
      dataCollector.trackRecommendation('rejected', {
        recommendation_id: recommendationId,
        recommendation_type: reco?.recommendation_type || 'unknown',
        context: reco?.context || {},
      });

      await refreshRecommendations();
    } catch (error) {
      console.error('[UniversalContext] Erreur reject recommendation:', error);
    }
  }, [recommendations]);

  // ==================== REFRESH ====================

  const refreshAlerts = useCallback(async () => {
    if (farmId) await fetchAlerts(farmId);
  }, [farmId]);

  const refreshRecommendations = useCallback(async () => {
    if (farmId) await fetchRecommendations(farmId);
  }, [farmId]);

  const refreshMetrics = useCallback(async () => {
    if (farmId) await fetchMetrics(farmId);
  }, [farmId]);

  const refreshAll = useCallback(async () => {
    if (!farmId) return;

    setIsLoading(true);
    await Promise.all([
      fetchAlerts(farmId),
      fetchRecommendations(farmId),
      fetchMetrics(farmId),
      fetchPatterns(farmId),
    ]);
    setLastUpdated(new Date());
    setIsLoading(false);
  }, [farmId]);

  // ==================== COMPUTED VALUES ====================

  const criticalAlerts = alerts.filter(a => a.severity === 'critical');
  const unreadAlertsCount = alerts.filter(a => !a.viewed_at && a.status === 'active').length;
  const topRecommendations = recommendations.slice(0, 5);
  const recentPatterns = patterns.slice(0, 3);

  // ==================== CONTEXT VALUE ====================

  const contextValue: UniversalIntelligenceContextType = {
    // État
    farmMetrics,
    farmId,
    userId,

    // Alertes
    alerts,
    criticalAlerts,
    unreadAlertsCount,

    // Recommandations
    recommendations,
    topRecommendations,

    // Patterns
    patterns,
    recentPatterns,

    // Loading
    isLoading,
    lastUpdated,

    // Actions alertes
    markAlertAsViewed,
    markAlertAsDismissed,
    markAlertActionTaken,
    rateAlert,

    // Actions recommandations
    acceptRecommendation,
    rejectRecommendation,

    // Refresh
    refreshAll,
    refreshAlerts,
    refreshRecommendations,
    refreshMetrics,
  };

  return (
    <UniversalIntelligenceContext.Provider value={contextValue}>
      {children}
    </UniversalIntelligenceContext.Provider>
  );
};

// ==================== HOOK ====================

export const useUniversalIntelligence = () => {
  const context = useContext(UniversalIntelligenceContext);

  if (context === undefined) {
    throw new Error('useUniversalIntelligence must be used within UniversalIntelligenceProvider');
  }

  return context;
};

// ==================== HOOKS DÉRIVÉS ====================

// Hook pour alertes uniquement
export const useAlerts = () => {
  const { alerts, criticalAlerts, unreadAlertsCount, markAlertAsViewed, markAlertAsDismissed, markAlertActionTaken, rateAlert } = useUniversalIntelligence();
  return { alerts, criticalAlerts, unreadAlertsCount, markAlertAsViewed, markAlertAsDismissed, markAlertActionTaken, rateAlert };
};

// Hook pour recommandations uniquement
export const useRecommendations = () => {
  const { recommendations, topRecommendations, acceptRecommendation, rejectRecommendation } = useUniversalIntelligence();
  return { recommendations, topRecommendations, acceptRecommendation, rejectRecommendation };
};

// Hook pour métriques uniquement
export const useFarmMetrics = () => {
  const { farmMetrics, refreshMetrics } = useUniversalIntelligence();
  return { farmMetrics, refreshMetrics };
};