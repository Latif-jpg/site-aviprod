import { useCallback, useMemo } from 'react';
import { dataCollector, EventType, EventPriority } from '../intelligence/core/DataCollector';

/**
 * HOOK POUR UTILISER LE COLLECTEUR DE DONNÉES
 *
 * Fournit des méthodes faciles pour tracker les événements
 * depuis n'importe quel composant React.
 */

export const useDataCollector = () => {
  const collect = useCallback((
    eventType: EventType,
    context: Record<string, any>,
    priority: EventPriority = EventPriority.MEDIUM,
    outcome?: 'success' | 'failure' | 'partial',
    error?: string
  ) => {
    return dataCollector.collect(eventType, context, priority, outcome, error);
  }, []);

  // Méthodes spécialisées pour les événements courants
  const trackPageView = useCallback((pageName: string, additionalContext?: Record<string, any>) => {
    return dataCollector.trackPageView(pageName, additionalContext);
  }, []);

  const trackAction = useCallback((actionName: string, context: Record<string, any> = {}) => {
    return dataCollector.trackAction(actionName, context);
  }, []);

  const trackDataLoading = useCallback(async <T>(
    operationName: string,
    asyncFunction: () => Promise<T>
  ): Promise<T> => {
    const startTime = performance.now();
    try {
      const result = await asyncFunction();
      const duration = performance.now() - startTime;
      dataCollector.trackSlowOperation(operationName, duration);
      return result;
    } catch (error: any) {
      const duration = performance.now() - startTime;
      dataCollector.trackError(error, {
        operation: operationName,
        duration_ms: duration,
      });
      // Re-throw the error so the calling function can handle it
      throw error;
    }
  }, []);



  const trackLotEvent = useCallback((
    action: 'created' | 'updated' | 'archived',
    lotData: any
  ) => {
    return dataCollector.trackLotEvent(action, lotData);
  }, []);

  const trackHealthEvent = useCallback((
    eventType: 'analysis_requested' | 'vaccination' | 'mortality',
    data: any
  ) => {
    return dataCollector.trackHealthEvent(eventType, data);
  }, []);

  const trackAlert = useCallback((
    action: 'generated' | 'viewed' | 'dismissed' | 'action_taken',
    alertData: {
      alert_id: string;
      alert_type: string;
      severity: string;
      time_to_action?: number;
    }
  ) => {
    return dataCollector.trackAlert(action, alertData);
  }, []);

  const trackRecommendation = useCallback((
    action: 'shown' | 'accepted' | 'rejected',
    recommendationData: {
      recommendation_id: string;
      recommendation_type: string;
      context: any;
    }
  ) => {
    return dataCollector.trackRecommendation(action, recommendationData);
  }, []);

  const trackError = useCallback((
    error: Error,
    context: Record<string, any> = {}
  ) => {
    return dataCollector.trackError(error, context);
  }, []);

  const trackSlowOperation = useCallback((
    operationName: string,
    duration: number,
    threshold: number = 1000
  ) => {
    return dataCollector.trackSlowOperation(operationName, duration, threshold);
  }, []);

  // Méthodes de performance tracking
  const trackPerformance = useCallback((
    operationName: string,
    startTime: number,
    additionalContext?: Record<string, any>
  ) => {
    const duration = performance.now() - startTime;
    return dataCollector.trackSlowOperation(operationName, duration);
  }, []);

  // Méthodes de navigation
  const trackNavigation = useCallback((
    fromScreen: string,
    toScreen: string,
    context?: Record<string, any>
  ) => {
    return dataCollector.collect(
      EventType.PAGE_VIEW,
      {
        from_screen: fromScreen,
        to_screen: toScreen,
        ...context,
      },
      EventPriority.LOW
    );
  }, []);

  // Méthodes marketplace
  const trackProductView = useCallback((
    productId: string,
    productName: string,
    context?: Record<string, any>
  ) => {
    return dataCollector.collect(
      EventType.PRODUCT_VIEWED,
      {
        product_id: productId,
        product_name: productName,
        ...context,
      },
      EventPriority.LOW
    );
  }, []);

  const trackAddToCart = useCallback((
    productId: string,
    quantity: number,
    context?: Record<string, any>
  ) => {
    return dataCollector.collect(
      EventType.PRODUCT_ADDED_TO_CART,
      {
        product_id: productId,
        quantity,
        ...context,
      },
      EventPriority.MEDIUM
    );
  }, []);

  const trackOrderPlaced = useCallback((
    orderId: string,
    totalAmount: number,
    itemsCount: number,
    context?: Record<string, any>
  ) => {
    return dataCollector.collect(
      EventType.ORDER_PLACED,
      {
        order_id: orderId,
        total_amount: totalAmount,
        items_count: itemsCount,
        ...context,
      },
      EventPriority.HIGH,
      'success'
    );
  }, []);

  // Méthodes financières
  const trackTransaction = useCallback((
    type: 'income' | 'expense',
    amount: number,
    category: string,
    context?: Record<string, any>
  ) => {
    return dataCollector.collect(
      EventType.TRANSACTION_ADDED,
      {
        transaction_type: type,
        amount,
        category,
        ...context,
      },
      EventPriority.MEDIUM
    );
  }, []);

  // Méthodes de livraison
  const trackDeliveryEvent = useCallback((
    action: 'accepted' | 'completed',
    deliveryId: string,
    context?: Record<string, any>
  ) => {
    const eventType = action === 'accepted'
      ? EventType.DELIVERY_ACCEPTED
      : EventType.DELIVERY_COMPLETED;

    return dataCollector.collect(
      eventType,
      {
        delivery_id: deliveryId,
        ...context,
      },
      EventPriority.MEDIUM,
      'success'
    );
  }, []);

  // Méthodes de chat/marketplace messages
  const trackMessageSent = useCallback((
    conversationId: string,
    messageType: 'text' | 'image' | 'offer',
    context?: Record<string, any>
  ) => {
    return dataCollector.collect(
      EventType.MESSAGE_SENT,
      {
        conversation_id: conversationId,
        message_type: messageType,
        ...context,
      },
      EventPriority.LOW
    );
  }, []);

  // Méthodes d'analyse IA
  const trackAIAnalysis = useCallback((
    analysisType: string,
    duration: number,
    success: boolean,
    context?: Record<string, any>
  ) => {
    return dataCollector.collect(
      EventType.HEALTH_ANALYSIS_COMPLETED,
      {
        analysis_type: analysisType,
        duration_ms: duration,
        success,
        ...context,
      },
      EventPriority.MEDIUM,
      success ? 'success' : 'failure'
    );
  }, []);

  // Méthodes d'authentification
  const trackAuthEvent = useCallback((
    event: 'login' | 'logout',
    method?: string,
    context?: Record<string, any>
  ) => {
    const eventType = event === 'login' ? EventType.USER_LOGIN : EventType.USER_LOGOUT;

    return dataCollector.collect(
      eventType,
      {
        auth_method: method,
        ...context,
      },
      EventPriority.MEDIUM,
      'success'
    );
  }, []);

  // Méthodes de formulaire
  const trackFormSubmit = useCallback((
    formName: string,
    success: boolean,
    context?: Record<string, any>
  ) => {
    return dataCollector.collect(
      EventType.FORM_SUBMIT,
      {
        form_name: formName,
        success,
        ...context,
      },
      EventPriority.MEDIUM,
      success ? 'success' : 'failure'
    );
  }, []);

  // Méthodes de recherche
  const trackSearch = useCallback((
    searchQuery: string,
    resultsCount: number,
    context?: Record<string, any>
  ) => {
    return dataCollector.collect(
      EventType.BUTTON_CLICK,
      {
        action_type: 'search',
        search_query: searchQuery,
        results_count: resultsCount,
        ...context,
      },
      EventPriority.LOW
    );
  }, []);

  // Informations sur la queue
  const getQueueSize = useCallback(() => {
    return dataCollector.getQueueSize();
  }, []);

  // Force flush
  const forceFlush = useCallback(async () => {
    return dataCollector.forceFlush();
  }, []);

  return useMemo(() => ({
    // Méthodes de base
    collect,
    getQueueSize,
    forceFlush,

    // Tracking spécialisé
    trackPageView,
    trackAction,
    trackDataLoading,
    trackNavigation,
    trackPerformance,
    trackError,
    trackSlowOperation,

    // Événements métier
    trackLotEvent,
    trackHealthEvent,
    trackAlert,
    trackRecommendation,
    trackProductView,
    trackAddToCart,
    trackOrderPlaced,
    trackTransaction,
    trackDeliveryEvent,
    trackMessageSent,
    trackAIAnalysis,
    trackAuthEvent,
    trackFormSubmit,
    trackSearch,
  }), [
    collect, getQueueSize, forceFlush, trackPageView, trackAction, trackDataLoading,
    trackNavigation, trackPerformance, trackError, trackSlowOperation,
    trackLotEvent, trackHealthEvent, trackAlert, trackRecommendation,
    trackProductView, trackAddToCart, trackOrderPlaced, trackTransaction,
    trackDeliveryEvent, trackMessageSent, trackAIAnalysis, trackAuthEvent,
    trackFormSubmit, trackSearch
  ]);
};

// Hook spécialisé pour le tracking de performance
export const usePerformanceTracker = () => {
  const { trackPerformance, trackSlowOperation } = useDataCollector();

  const startTracking = useCallback((operationName: string) => {
    return {
      operationName,
      startTime: performance.now(),
    };
  }, []);

  const endTracking = useCallback((
    tracking: { operationName: string; startTime: number },
    additionalContext?: Record<string, any>
  ) => {
    return trackPerformance(tracking.operationName, tracking.startTime, additionalContext);
  }, [trackPerformance]);

  const trackAsyncOperation = useCallback(async (
    operationName: string,
    operation: () => Promise<any>,
    threshold: number = 1000
  ) => {
    const startTime = performance.now();

    try {
      const result = await operation();
      const duration = performance.now() - startTime;

      trackSlowOperation(operationName, duration, threshold);

      return result;
    } catch (error) {
      const duration = performance.now() - startTime;

      trackSlowOperation(operationName, duration, threshold);

      throw error;
    }
  }, [trackSlowOperation]);

  return useMemo(() => ({
    startTracking,
    endTracking,
    trackAsyncOperation,
  }), [startTracking, endTracking, trackAsyncOperation]);
};

// Hook spécialisé pour le tracking utilisateur
export const useUserTracker = () => {
  const { trackAuthEvent, trackPageView, trackAction } = useDataCollector();

  const trackLogin = useCallback((method: string = 'email') => {
    return trackAuthEvent('login', method);
  }, [trackAuthEvent]);

  const trackLogout = useCallback(() => {
    return trackAuthEvent('logout');
  }, [trackAuthEvent]);

  const trackScreenView = useCallback((screenName: string) => {
    return trackPageView(screenName);
  }, [trackPageView]);

  const trackUserAction = useCallback((actionName: string, context?: Record<string, any>) => {
    return trackAction(actionName, context);
  }, [trackAction]);

  return useMemo(() => ({
    trackLogin,
    trackLogout,
    trackScreenView,
    trackUserAction,
  }), [trackLogin, trackLogout, trackScreenView, trackUserAction]);
};
