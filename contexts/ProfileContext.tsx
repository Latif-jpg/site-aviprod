import React, { createContext, useState, useEffect, useContext, ReactNode, useCallback, useRef, useMemo } from 'react';
import { supabase } from '../config';
import { Session, User } from '@supabase/supabase-js';

export interface Profile {
  id: string;
  full_name: string;
  role: string;
  subscription_plan_id?: string;
  subscription_status?: string | null;
  avicoins_balance?: number | null;
  avicoins?: number | null; // Nouvelle colonne dans la table profiles
  farm_name?: string | null;
  phone?: string | null;
  location?: string | null;
  avatar_url?: string | null;
  country?: string | null;
  region?: string | null;
  email?: string | null;
}

interface ProfileContextType {
  profile: Profile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => void; // <-- AJOUTER
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export const ProfileProvider = ({ children }: { children: ReactNode }) => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const loadingRef = useRef(false);
  const lastLoadedUserId = useRef<string | null>(null);

  useEffect(() => {
    setLoading(true);
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const loadFullUserProfile = useCallback(async (currentUser: User, isRefresh = false) => {
    // Éviter les chargements redondants si l'ID n'a pas changé (sauf si c'est un refresh forcé)
    if (!isRefresh && currentUser.id === lastLoadedUserId.current) {
      setLoading(false);
      return;
    }

    if (loadingRef.current && !isRefresh) return;
    loadingRef.current = true;

    console.log(`🔄 [ProfileContext] Chargement du profil complet pour ${currentUser.id}... (isRefresh: ${isRefresh})`);

    // Ne mettre setLoading(true) que si on n'a pas encore de profil (chargement initial)
    // ou si ce n'est pas un simple rafraîchissement.
    // Cela évite que MainLayout ne démonte tout l'app pendant un refresh.
    if (!isRefresh || !profile) {
      setLoading(true);
    }

    try {
      const [profileRes, subscriptionRes, avicoinsRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('user_id', currentUser.id).single(),
        supabase.from('user_subscriptions').select('*').eq('user_id', currentUser.id).eq('status', 'active').maybeSingle(),
        supabase.from('user_avicoins').select('balance').eq('user_id', currentUser.id).maybeSingle()
      ]);

      if (profileRes.error && profileRes.error.code !== 'PGRST116') throw profileRes.error;
      if (subscriptionRes.error && subscriptionRes.error.code !== 'PGRST116') throw subscriptionRes.error;
      if (avicoinsRes.error && avicoinsRes.error.code !== 'PGRST116') throw avicoinsRes.error;

      const currentBalance = avicoinsRes.data?.balance ?? profileRes.data?.avicoins ?? 0;

      const fullProfile: Profile = {
        id: currentUser.id,
        full_name: profileRes.data?.full_name || '',
        role: profileRes.data?.role || 'user',
        farm_name: profileRes.data?.farm_name || null,
        subscription_plan_id: subscriptionRes.data?.plan_id,
        subscription_status: subscriptionRes.data?.status || 'inactive',
        avicoins_balance: currentBalance,
        avicoins: currentBalance,
        phone: profileRes.data?.phone,
        location: profileRes.data?.location,
        avatar_url: profileRes.data?.avatar_url,
        country: profileRes.data?.country,
        region: profileRes.data?.region,
        email: currentUser.email || profileRes.data?.email || null, // Utiliser le mail de currentUser en priorité
      };

      lastLoadedUserId.current = currentUser.id;
      console.log('✅ [ProfileContext] Profil complet fusionné:', fullProfile.id);
      setProfile(fullProfile);
    } catch (error: any) {
      console.error('❌ [ProfileContext] Erreur lors du chargement du profil complet:', error);
      // Ne pas mettre à null immédiatement en cas d'erreur de refresh pour éviter de tout déconnecter
      setProfile(prev => prev || null);
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, []);

  // --- ABONNEMENT TEMPS RÉEL AUX CHANGEMENTS DE PROFIL ---
  useEffect(() => {
    if (!user) return;

    console.log(`🔔 [ProfileContext] Abonnement aux mises à jour du profil pour ${user.id}`);

    const profileSubscription = supabase
      .channel(`public:profiles:user_id=eq.${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Écouter tous les événements (UPDATE, INSERT)
          schema: 'public',
          table: 'profiles',
          filter: `user_id=eq.${user.id}`
        },
        async (payload) => {
          console.log('🔄 [ProfileContext] Changement détecté sur la table profiles:', payload);
          // Recharger le profil complet pour s'assurer que toutes les jointures (abonnements, avicoins) sont à jour
          await loadFullUserProfile(user, true);
        }
      )
      .subscribe();

    return () => {
      console.log('🔌 [ProfileContext] Désabonnement des mises à jour du profil.');
      supabase.removeChannel(profileSubscription);
    };
  }, [user, loadFullUserProfile]);

  // --- ABONNEMENT TEMPS RÉEL AUX CHANGEMENTS D'ABONNEMENT ---
  useEffect(() => {
    if (!user) return;

    console.log(`🔔 [ProfileContext] Abonnement aux mises à jour de user_subscriptions pour ${user.id}`);

    const channelName = `public:user_subscriptions:user_id=eq.${user.id}`;
    if (!user.id) {
      console.warn('⚠️ [ProfileContext] user.id est vide, impossible de créer le canal.');
      return;
    }

    const subscriptionChannel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_subscriptions',
          filter: `user_id=eq.${user.id}`
        },
        async (payload) => {
          console.log('🔄 [ProfileContext] Changement détecté sur user_subscriptions:', payload);
          await loadFullUserProfile(user, true);
        }
      )
      .subscribe();

    return () => {
      console.log('🔌 [ProfileContext] Désabonnement des mises à jour d\'abonnement.');
      supabase.removeChannel(subscriptionChannel);
    };
  }, [user, loadFullUserProfile]);

  useEffect(() => {
    if (user) {
      loadFullUserProfile(user);
    } else {
      setProfile(null);
      setLoading(false);
    }
  }, [user?.id, loadFullUserProfile]);

  const lastRefreshTime = useRef<number>(0);
  const userRef = useRef<User | null>(null);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const refreshProfile = useCallback(async () => {
    const now = Date.now();
    if (now - lastRefreshTime.current < 2000) {
      console.log('⏳ [ProfileContext] Refresh ignoré (cooldown 2s)');
      return;
    }

    if (userRef.current) {
      lastRefreshTime.current = now;
      await loadFullUserProfile(userRef.current, true);
    }
  }, [loadFullUserProfile]);

  // --- NOUVELLE FONCTION ---
  const updateProfile = useCallback((updates: Partial<Profile>) => {
    setProfile(prevProfile => {
      if (prevProfile) {
        console.log('🔄 [ProfileContext] Mise à jour du profil local:', updates);
        return { ...prevProfile, ...updates };
      }
      return null;
    });
  }, []);

  const contextValue = useMemo(() => ({
    profile,
    loading,
    refreshProfile,
    updateProfile
  }), [profile, loading, refreshProfile, updateProfile]);

  return (
    <ProfileContext.Provider value={contextValue}>
      {children}
    </ProfileContext.Provider>
  );
};

export const useProfile = () => {
  const context = useContext(ProfileContext);
  if (context === undefined) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
};

export default () => null;