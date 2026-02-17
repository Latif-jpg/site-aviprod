import React, { createContext, useState, useEffect, useContext, ReactNode, useCallback, useMemo, useRef } from 'react';
import { supabase } from '../config';
import { useProfile } from './ProfileContext';

export interface SubscriptionPlan {
  id: string;
  name: string;
  display_name: string;
  description: string;
  price_monthly: number;
  price_yearly: number;
  features: Record<string, any>;
  is_active: boolean;
}

export interface ActiveSubscription {
  id: string;
  plan_id: string;
  status: 'active' | 'inactive' | 'past_due' | 'canceled';
  plan: SubscriptionPlan | null;
}

interface SubscriptionContextType {
  subscription: ActiveSubscription | null;
  allPlans: SubscriptionPlan[];
  loading: boolean;
  refreshSubscription: () => void;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const SubscriptionProvider = ({ children }: { children: ReactNode }) => {
  const { profile, loading: profileLoading } = useProfile();
  const [allPlans, setAllPlans] = useState<SubscriptionPlan[]>([]);
  const [activeSubscription, setActiveSubscription] = useState<ActiveSubscription | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSubscriptionData = useCallback(async () => {
    try {
      const { data: plansData, error: plansError } = await supabase
        .from('subscription_plans')
        .select('*')
        .order('price_monthly', { ascending: true });

      if (plansError) throw plansError;
      setAllPlans(plansData || []);

      if (profile && profile.subscription_status === 'active' && profile.subscription_plan_id) {
        const activePlan = (plansData || []).find(p => p.id === profile.subscription_plan_id);
        setActiveSubscription({
          id: profile.id,
          plan_id: profile.subscription_plan_id,
          status: 'active',
          plan: activePlan || null,
        });
        console.log('✅ [SubscriptionContext] Abonnement actif trouvé:', activePlan?.display_name);
      } else {
        setActiveSubscription(null);
        console.log('ℹ️ [SubscriptionContext] Aucun abonnement actif trouvé pour l\'utilisateur.');
      }
    } catch (error) {
      console.error("Erreur lors du chargement des abonnements:", error);
    }
  }, [profile]);

  // Ref pour éviter les rechargements inutiles si le profil change (ex: solde avicoins) mais pas l'abonnement
  const lastProfileKey = useRef<string>('');

  useEffect(() => {
    if (!profileLoading) {
      // Générer une clé unique basée uniquement sur les champs pertinents pour l'abonnement
      const currentProfileKey = profile
        ? `${profile.id}|${profile.subscription_plan_id}|${profile.subscription_status}`
        : 'null';

      // Si la clé n'a pas changé, on ne refait pas le fetch (évite le flicker de loading)
      if (currentProfileKey === lastProfileKey.current) {
        return;
      }

      lastProfileKey.current = currentProfileKey;
      setLoading(true);
      fetchSubscriptionData().finally(() => setLoading(false));
    }
  }, [profile, profileLoading, fetchSubscriptionData]);

  const contextValue = useMemo(() => ({
    subscription: activeSubscription,
    allPlans,
    loading: loading || profileLoading,
    refreshSubscription: fetchSubscriptionData,
  }), [activeSubscription, allPlans, loading, profileLoading, fetchSubscriptionData]);

  return <SubscriptionContext.Provider value={contextValue}>{children}</SubscriptionContext.Provider>;
};

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
};
