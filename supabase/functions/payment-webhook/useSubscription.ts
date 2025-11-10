import { useState, useEffect, useCallback } from 'react';
import { ensureSupabaseInitialized } from '../app/integrations/supabase/client';
import { useAuth } from './useAuth';

interface SubscriptionPlan {
  id: string;
  name: string;
  features: Record<string, any>;
}

interface UserSubscription {
  id: string;
  status: 'active' | 'cancelled' | 'past_due';
  current_period_end: string;
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
          current_period_end,
          plan:subscription_plans (
            id,
            name,
            features
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
    if (!subscription || subscription.status !== 'active') {
      return false; // Pas d'accès si pas d'abonnement actif
    }
    // La fonctionnalité "freemium" est toujours accessible
    if (feature === 'freemium') return true;

    return subscription.plan?.features?.[feature] === true;
  };

  return {
    subscription,
    loading: authLoading || loading,
    hasAccess,
    refreshSubscription: fetchSubscription,
  };
}