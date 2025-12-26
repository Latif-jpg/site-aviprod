import React, { createContext, useState, useEffect, useContext, ReactNode, useCallback } from 'react';
import { supabase } from '../config';
import { useProfile } from './ProfileContext'; // Importer le hook de profil

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
  const { profile, loading: profileLoading } = useProfile(); // Utiliser le profil
  const [allPlans, setAllPlans] = useState<SubscriptionPlan[]>([]);
  const [activeSubscription, setActiveSubscription] = useState<ActiveSubscription | null>(null);
  const [loading, setLoading] = useState(true);

  // --- CORRECTION : La fonction dépend maintenant du profil de manière stable et claire ---
  const fetchSubscriptionData = useCallback(async () => {
    try {
      // 1. Charger tous les plans disponibles
      const { data: plansData, error: plansError } = await supabase
        .from('subscription_plans')
        .select('*')
        .order('price_monthly', { ascending: true });

      if (plansError) throw plansError;
      setAllPlans(plansData || []);

      // 2. Utiliser le profil DÉJÀ CHARGÉ par ProfileContext pour déterminer l'abonnement
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
  }, [profile]); // <-- La dépendance est maintenant 'profile'. Quand le profil change, on recalcule.

  useEffect(() => {
    // Ne pas charger si le profil est encore en cours de chargement
    if (!profileLoading) {
      setLoading(true);
      fetchSubscriptionData().finally(() => setLoading(false));
    }
  }, [profile, profileLoading, fetchSubscriptionData]); // <-- Réagit au changement de profil et de son état de chargement.

  const value = {
    subscription: activeSubscription,
    allPlans,
    loading: loading || profileLoading, // Le chargement est actif si le profil OU les abos chargent
    refreshSubscription: fetchSubscriptionData,
  };

  return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>;
};

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
};