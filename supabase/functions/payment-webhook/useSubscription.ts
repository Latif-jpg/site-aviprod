import { useState, useEffect, useCallback } from 'react';
import { ensureSupabaseInitialized } from '../app/integrations/supabase/client';
import { useAuth } from './useAuth';

interface SubscriptionPlan {
  id: string;
  name: string;
  features: Record<string, any>;
  // Ajout des champs pour la nouvelle structure
  price_monthly: number;
}

interface UserSubscription {
  id: string;
  status: 'active' | 'cancelled' | 'past_due';
  expires_at: string; // Renommé pour correspondre à la DB
  usage_limits: Record<string, number>; // Pour suivre l'utilisation (ex: ai_health_used)
  plan: SubscriptionPlan | null;
}

export function useSubscription() {
  const { user, loading: authLoading } = useAuth();
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSubscription = useCallback(async () => {
    if (!user) {
      setSubscription(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const supabase = await ensureSupabaseInitialized();
      const { data, error } = await supabase
        .from('user_subscriptions')
        .select(`
          id,
          status,
          expires_at,
          usage_limits,
          plan:subscription_plans (
            id,
            name,
            features,
            price_monthly
          )
        `)
        .eq('user_id', user.id)
        .in('status', ['active', 'past_due']) // On vérifie les abonnements actifs ou en retard de paiement
        .maybeSingle();

      if (error) throw error;

      setSubscription(data as UserSubscription | null);
    } catch (error) {
      console.error('❌ Error fetching user subscription:', error);
      setSubscription(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading) {
      fetchSubscription();
    }
  }, [authLoading, fetchSubscription]);

  const hasAccess = (feature: string): boolean => {
    // Freemium a toujours accès aux fonctionnalités de base
    if (subscription?.plan?.name === 'freemium') {
        // Ici, on peut définir les accès de base pour le plan gratuit
        const freemiumFeatures = ['manual_feeding', 'basic_stock', 'basic_finance'];
        if (freemiumFeatures.includes(feature)) return true;
    }

    if (!subscription || !['active', 'past_due'].includes(subscription.status)) {
      return false;
    }

    const featureValue = subscription.plan?.features?.[feature];

    // Gère les accès illimités (valeur -1) ou les quotas > 0
    if (typeof featureValue === 'number') {
      return featureValue === -1 || featureValue > 0;
    }

    // Gère les accès booléens (true/false)
    if (typeof featureValue === 'boolean') {
      return featureValue;
    }

    return false;
  };

  return {
    subscription,
    loading: authLoading || loading,
    hasAccess,
    refreshSubscription: fetchSubscription,
  };
}