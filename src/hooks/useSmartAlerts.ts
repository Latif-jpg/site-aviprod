// src/hooks/useSmartAlerts.ts
import { useCallback } from 'react';
import { smartAlertSystem, AlertType, CreateAlertParams } from '../intelligence/core/SmartAlertSystem';

/**
 * HOOK POUR UTILISER LE SYSTÈME D'ALERTES INTELLIGENTES
 *
 * Fournit des méthodes faciles pour créer des alertes intelligentes
 * depuis n'importe quel composant React.
 */

export const useSmartAlerts = () => {
  const createAlert = useCallback(async (params: CreateAlertParams) => {
    return smartAlertSystem.createAlert(params);
  }, []);

  const createAlertsBatch = useCallback(async (alertsParams: CreateAlertParams[]) => {
    return smartAlertSystem.createAlertsBatch(alertsParams);
  }, []);

  // Helpers pour les types d'alertes courants
  const alertHighMortality = useCallback(async (
    lotId: string,
    lotName: string,
    mortalityRate: number,
    threshold: number = 5
  ) => {
    return smartAlertSystem.alertHighMortality(lotId, lotName, mortalityRate, threshold);
  }, []);

  const alertLowStock = useCallback(async (
    itemId: string,
    itemName: string,
    currentQuantity: number,
    threshold: number,
    unit: string
  ) => {
    return smartAlertSystem.alertLowStock(itemId, itemName, currentQuantity, threshold, unit);
  }, []);

  const alertOptimalSaleWindow = useCallback(async (
    lotId: string,
    lotName: string,
    daysRemaining: number,
    estimatedMargin: number
  ) => {
    return smartAlertSystem.alertOptimalSaleWindow(lotId, lotName, daysRemaining, estimatedMargin);
  }, []);

  const alertNegativeMargin = useCallback(async (
    margin: number,
    period: string = 'ce mois'
  ) => {
    return smartAlertSystem.alertNegativeMargin(margin, period);
  }, []);

  const alertVaccinationDue = useCallback(async (
    lotId: string,
    lotName: string,
    vaccineName: string,
    ageDays: number
  ) => {
    return smartAlertSystem.createAlert({
      type: AlertType.HEALTH_VACCINATION_DUE,
      context: {
        lot_name: lotName,
        vaccine_name: vaccineName,
        age_days: ageDays,
      },
      relatedEntityType: 'lot',
      relatedEntityId: lotId,
    });
  }, []);

  const alertGrowthDelayed = useCallback(async (
    lotId: string,
    lotName: string,
    delayPercentage: number
  ) => {
    return smartAlertSystem.createAlert({
      type: AlertType.LOT_GROWTH_DELAYED,
      context: {
        lot_name: lotName,
        delay_percentage: delayPercentage,
      },
      relatedEntityType: 'lot',
      relatedEntityId: lotId,
    });
  }, []);

  const alertNewOrder = useCallback(async (
    orderId: string,
    buyerName: string,
    productName: string
  ) => {
    return smartAlertSystem.createAlert({
      type: AlertType.MARKETPLACE_NEW_ORDER,
      context: {
        buyer_name: buyerName,
        product_name: productName,
      },
      relatedEntityType: 'order',
      relatedEntityId: orderId,
    });
  }, []);

  const alertPerformanceDegraded = useCallback(async (
    operationName: string,
    duration: number,
    threshold: number = 1000
  ) => {
    return smartAlertSystem.createAlert({
      type: AlertType.SYSTEM_PERFORMANCE_DEGRADED,
      context: {
        operation_name: operationName,
        duration_ms: duration,
        threshold_ms: threshold,
      },
    });
  }, []);

  const alertDataSyncFailed = useCallback(async (errorMessage: string) => {
    return smartAlertSystem.createAlert({
      type: AlertType.SYSTEM_DATA_SYNC_FAILED,
      context: {
        error_message: errorMessage,
      },
    });
  }, []);

  // Nettoyage des alertes expirées
  const cleanupExpiredAlerts = useCallback(async () => {
    return smartAlertSystem.cleanupExpiredAlerts();
  }, []);

  return {
    // Méthodes générales
    createAlert,
    createAlertsBatch,
    cleanupExpiredAlerts,

    // Helpers spécialisés
    alertHighMortality,
    alertLowStock,
    alertOptimalSaleWindow,
    alertNegativeMargin,
    alertVaccinationDue,
    alertGrowthDelayed,
    alertNewOrder,
    alertPerformanceDegraded,
    alertDataSyncFailed,
  };
};

// Hook pour les alertes de santé
export const useHealthAlerts = () => {
  const { alertHighMortality, alertVaccinationDue, alertGrowthDelayed } = useSmartAlerts();

  return {
    alertHighMortality,
    alertVaccinationDue,
    alertGrowthDelayed,
  };
};

// Hook pour les alertes de stock
export const useStockAlerts = () => {
  const { alertLowStock } = useSmartAlerts();

  return {
    alertLowStock,
  };
};

// Hook pour les alertes financières
export const useFinanceAlerts = () => {
  const { alertNegativeMargin } = useSmartAlerts();

  return {
    alertNegativeMargin,
  };
};

// Hook pour les alertes de lots
export const useLotAlerts = () => {
  const { alertOptimalSaleWindow, alertGrowthDelayed } = useSmartAlerts();

  return {
    alertOptimalSaleWindow,
    alertGrowthDelayed,
  };
};

// Hook pour les alertes marketplace
export const useMarketplaceAlerts = () => {
  const { alertNewOrder } = useSmartAlerts();

  return {
    alertNewOrder,
  };
};

// Hook pour les alertes système
export const useSystemAlerts = () => {
  const { alertPerformanceDegraded, alertDataSyncFailed } = useSmartAlerts();

  return {
    alertPerformanceDegraded,
    alertDataSyncFailed,
  };
};