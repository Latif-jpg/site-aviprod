// src/intelligence/index.ts
// Point d'entrée principal du système d'intelligence Aviprod

// ==================== CORE ====================
export { dataCollector } from './core/DataCollector';
export { smartAlertSystem } from './core/SmartAlertSystem';

// ==================== AGENTS ====================
export * from './agents';

// ==================== UI ====================
export * from './ui';

// ==================== CONTEXT ====================
export { UniversalIntelligenceProvider, useIntelligence } from '../contexts/UniversalIntelligenceContext';

// ==================== HOOKS ====================
export { useDataCollector } from '../hooks/useDataCollector';
export { useSmartAlerts } from '../hooks/useSmartAlerts';

// ==================== TYPES ====================
export interface IntelligenceConfig {
  enableTracking: boolean;
  enablePredictions: boolean;
  enableAlerts: boolean;
  dataRetentionDays: number;
  mlModelUpdateFrequency: 'daily' | 'weekly' | 'monthly';
}

export const defaultIntelligenceConfig: IntelligenceConfig = {
  enableTracking: true,
  enablePredictions: true,
  enableAlerts: true,
  dataRetentionDays: 90,
  mlModelUpdateFrequency: 'weekly',
};

// ==================== INITIALISATION ====================

/**
 * Initialise le système d'intelligence complet
 */
export async function initializeIntelligence(config: Partial<IntelligenceConfig> = {}) {
  const finalConfig = { ...defaultIntelligenceConfig, ...config };

  try {
    console.log('🚀 Initialisation du système d\'intelligence Aviprod...');

    // Initialiser le DataCollector
    if (finalConfig.enableTracking) {
      await dataCollector.initialize();
      console.log('✅ DataCollector initialisé');
    }

    // Initialiser le système d'alertes
    if (finalConfig.enableAlerts) {
      await smartAlertSystem.initialize();
      console.log('✅ SmartAlertSystem initialisé');
    }

    // Démarrer la surveillance continue
    if (finalConfig.enablePredictions) {
      startContinuousMonitoring();
      console.log('✅ Surveillance continue démarrée');
    }

    console.log('🎉 Système d\'intelligence Aviprod opérationnel!');
    return true;

  } catch (error) {
    console.error('❌ Erreur initialisation intelligence:', error);
    return false;
  }
}

/**
 * Démarre la surveillance continue de tous les agents
 */
function startContinuousMonitoring() {
  // Surveillance des lots toutes les 6 heures
  setInterval(async () => {
    try {
      const { lotIntelligenceAgent } = await import('./agents');
      // Cette fonction pourrait être appelée depuis un contexte avec userId
      // Pour l'instant, on laisse vide car nécessite un farmId
    } catch (error) {
      console.error('Erreur surveillance continue:', error);
    }
  }, 6 * 60 * 60 * 1000); // 6 heures
}

/**
 * Fonction utilitaire pour analyser n'importe quelle entité
 */
export async function analyzeEntity(entityType: string, entityId: string) {
  const { analyzeEntity } = await import('./agents');
  return await analyzeEntity(entityType, entityId);
}

/**
 * Obtenir les métriques de tous les agents
 */
export async function getSystemMetrics() {
  const { getAllAgentsMetrics } = await import('./agents');
  return await getAllAgentsMetrics();
}

// ==================== MONITORING ====================

/**
 * Fonction de monitoring du système d'intelligence
 */
export async function getIntelligenceHealth() {
  try {
    const metrics = await getSystemMetrics();
    const dataCollectorHealth = await dataCollector.getHealthStatus();
    const alertSystemHealth = await smartAlertSystem.getHealthStatus();

    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      components: {
        dataCollector: dataCollectorHealth,
        alertSystem: alertSystemHealth,
        agents: metrics,
      },
      uptime: process.uptime?.() || 0,
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}