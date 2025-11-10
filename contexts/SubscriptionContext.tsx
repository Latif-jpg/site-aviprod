
import React, { createContext, useState, useEffect, useCallback, useContext, ReactNode } from 'react';
import { ensureSupabaseInitialized } from '../app/integrations/supabase/client';
import { useAuth } from '../hooks/useAuth';

// Interfaces
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

interface AvicoinsData {
  balance: number;
  total_earned: number;
  total_spent: number;
}

interface SubscriptionContextType {
  subscription: UserSubscription | null;
  avicoins: AvicoinsData | null;
  loading: boolean;
  hasAccess: (feature: string) => boolean;
  getFeatureCost: (feature: string) => number;
  canAffordFeature: (feature: string) => boolean;
  refreshSubscription: () => Promise<void>;
}

// Create Context
const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

// Provider Component
export const SubscriptionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, loading: authLoading } = useAuth();
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [avicoins, setAvicoins] = useState<AvicoinsData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSubscription = useCallback(async () => {
    if (!user) {
      setSubscription(null);
      setAvicoins(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const supabase = await ensureSupabaseInitialized();

      const { data: subscriptionData, error: subscriptionError } = await supabase
        .from('user_subscriptions')
        .select('id, status, current_period_end, plan:subscription_plans(id, name, display_name, features)')
        .eq('user_id', user.id)
        .in('status', ['active', 'past_due'])
        .maybeSingle();

      if (subscriptionError) throw subscriptionError;
      setSubscription(subscriptionData as UserSubscription | null);

      const { data: avicoinsData, error: avicoinsError } = await supabase
        .from('user_avicoins')
        .select('balance, total_earned, total_spent')
        .eq('user_id', user.id)
        .maybeSingle();

      if (avicoinsError && avicoinsError.code !== 'PGRST116') {
        console.error('❌ Error fetching avicoins:', avicoinsError);
      }
      setAvicoins(avicoinsData as AvicoinsData | null);

    } catch (error) {
      console.error('❌ Error fetching user subscription:', error);
      setSubscription(null);
      setAvicoins(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    fetchSubscription();
    if (!user) return;

    const supabasePromise = ensureSupabaseInitialized();
    const setupRealtimeSubscription = async () => {
      const supabase = await supabasePromise;
      const channel = supabase.channel(`user-updates-${user.id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'user_subscriptions', filter: `user_id=eq.${user.id}` }, () => fetchSubscription())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'user_avicoins', filter: `user_id=eq.${user.id}` }, () => fetchSubscription())
        .subscribe();
      return () => { supabase.removeChannel(channel); };
    };

    const cleanupPromise = setupRealtimeSubscription();
    return () => { cleanupPromise.then(cleanup => cleanup()); };
  }, [authLoading, user, fetchSubscription]);

  const hasAccess = (feature: string): boolean => {
    if (feature === 'freemium') return true;
    if (subscription && subscription.status === 'active') {
      const planFeature = subscription.plan?.features?.[feature];
      if (typeof planFeature === 'number') return planFeature === -1 || planFeature > 0;
      return planFeature === true;
    }
    const payableFeatures = ['auto_feeding', 'advanced_feeding', 'product_recommendations', 'full_history', 'export_reports', 'advanced_alerts'];
    if (avicoins && avicoins.balance > 0 && payableFeatures.includes(feature)) {
      return true;
    }
    return false;
  };

  const getFeatureCost = (feature: string): number => {
    const costs: Record<string, number> = { 'auto_feeding': 5, 'advanced_feeding': 10, 'product_recommendations': 3, 'full_history': 2, 'export_reports': 8, 'advanced_alerts': 5, 'ai_analysis': 5, 'sell_on_marketplace': 2 };
    return costs[feature] || 0;
  };

  const canAffordFeature = (feature: string): boolean => {
    const cost = getFeatureCost(feature);
    return avicoins ? avicoins.balance >= cost : false;
  };

  const value = {
    subscription,
    avicoins,
    loading: authLoading || loading,
    hasAccess,
    getFeatureCost,
    canAffordFeature,
    refreshSubscription: fetchSubscription,
  };

  return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>;
};

// Custom Hook
export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
};
