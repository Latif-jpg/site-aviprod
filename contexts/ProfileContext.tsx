import React, { createContext, useState, useEffect, useContext, ReactNode, useCallback } from 'react';
import { supabase } from '../config'; // Assurez-vous que le chemin est correct
import { Session, User } from '@supabase/supabase-js';

export interface Profile {
  id: string;
  full_name: string;
  role: string;
  subscription_plan_id?: string;
  subscription_status?: string | null;
  avicoins_balance?: number | null;
  farm_name?: string | null; // Ajout pour la cohérence
  // Ajoutez d'autres champs de profil si nécessaire
}

interface ProfileContextType {
  profile: Profile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>; // <-- AJOUTER CECI
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export const ProfileProvider = ({ children }: { children: ReactNode }) => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false); // <-- AJOUTER CECI
  const [user, setUser] = useState<User | null>(null);

  // --- CORRECTION MAJEURE : Logique de chargement unifiée et stable avec logs ---
  useEffect(() => {
    setLoading(true);
    console.log('🔄 [ProfileContext] Initialisation...');
    
    // 1. Récupérer la session au démarrage
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('ℹ️ [ProfileContext] Session initiale récupérée:', session ? `User ID: ${session.user.id}` : 'Aucune session');
      setUser(session?.user ?? null);
      // Ne pas arrêter le chargement ici, on attend le chargement du profil
    });
    
    // 2. Écouter les changements d'état d'authentification
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('🔄 [ProfileContext] Changement d\'état d\'authentification détecté. Nouvel utilisateur:', session?.user?.id || 'null');
      setUser(session?.user ?? null);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []); // <-- Ce hook ne s'exécute qu'une seule fois au montage

  // --- CORRECTION : Un useEffect dédié au chargement du profil (avec logs) ---
  useEffect(() => {
    const loadFullUserProfile = async () => {
      if (!user) {
        console.log('ℹ️ [ProfileContext] Aucun utilisateur, profil réinitialisé à null.');
        setProfile(null);
        setLoading(false);
        return;
      }

      console.log(`🔄 [ProfileContext] Utilisateur détecté (${user.id}). Chargement du profil complet...`);
      setLoading(true);

      try {
        // Utiliser Promise.all pour lancer les requêtes en parallèle
        const [profileRes, subscriptionRes, avicoinsRes] = await Promise.all([
          supabase.from('profiles').select('*').eq('user_id', user.id).single(),
          supabase.from('user_subscriptions').select('*').eq('user_id', user.id).eq('status', 'active').maybeSingle(),
          supabase.from('user_avicoins').select('balance').eq('user_id', user.id).maybeSingle()
        ]);

        if (profileRes.error && profileRes.error.code !== 'PGRST116') throw profileRes.error;
        if (subscriptionRes.error && subscriptionRes.error.code !== 'PGRST116') throw subscriptionRes.error;
        if (avicoinsRes.error && avicoinsRes.error.code !== 'PGRST116') throw avicoinsRes.error;

        // Fusionner les données en un seul objet profil
        const fullProfile: Profile = {
          ...(profileRes.data || {}),
          id: user.id,
          full_name: profileRes.data?.full_name || '',
          role: profileRes.data?.role || 'user',
          subscription_plan_id: subscriptionRes.data?.plan_id,
          subscription_status: subscriptionRes.data?.status || 'inactive',
          avicoins_balance: avicoinsRes.data?.balance || 0,
        };

        console.log('✅ [ProfileContext] Profil complet fusionné:');
        console.log(JSON.stringify(fullProfile, null, 2));

        setProfile(fullProfile);
      } catch (error: any) {
        console.error('❌ [ProfileContext] Erreur lors du chargement du profil complet:', error);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    };

    loadFullUserProfile();
  }, [user]); // Ce hook réagit au changement de l'utilisateur

  // Le `refreshProfile` exposé au reste de l'application
  const refreshProfile = useCallback(async () => {
    if (!user || refreshing) return;
    setRefreshing(true);
    try {
      const { data } = await supabase.from('profiles').select('*').eq('user_id', user.id).maybeSingle();
      if (data) {
        setProfile(data);
      }
    } finally {
      setRefreshing(false);
    }
  }, [user, refreshing]);

  return (
    // --- CORRECTION CRUCIALE #3 ---
    <ProfileContext.Provider value={{ profile, loading, refreshProfile }}>
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


// Ajout d'un export par défaut pour satisfaire Expo Router
export default () => null;