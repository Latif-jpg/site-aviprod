import { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '../config';
import { User } from '@supabase/supabase-js';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const sessionFoundRef = useRef(false); // Pour suivre si une session a été trouvée par le listener

  useEffect(() => {
    let mounted = true;

    // SAFETY VALVE: Force la fin du chargement après 3 secondes max, quoi qu'il arrive.
    // Cela empêche l'application de rester bloquée sur l'icône si Supabase/AsyncStorage ne répond pas.
    const safetyTimer = setTimeout(() => {
      if (mounted) setLoading(false);
    }, 3000);

    // 1. On configure d'abord l'écouteur pour capter la session le plus vite possible
    // Modification : Ne pas déstructurer immédiatement pour éviter le crash si data est null
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) {
        if (session) sessionFoundRef.current = true; // On marque qu'on a trouvé une session valide
        setUser(session?.user ?? null);
        setLoading(false);
      }
    });

    const checkUser = async () => {
      try {
        // Ajout d'un timeout pour éviter le blocage infini si AsyncStorage ne répond pas
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Session check timeout')), 10000)
        );

        const sessionPromise = supabase.auth.getSession();

        // Race entre la session et le timeout
        const { data, error } = await Promise.race([sessionPromise, timeoutPromise]) as any;

        if (error) {
          console.warn('⚠️ [Auth] Erreur ou timeout session:', error);
          // Si le token est invalide (déjà utilisé), on force la déconnexion pour nettoyer le cache
          const errMsg = error?.message || '';
          if (errMsg.includes('Invalid Refresh Token') || errMsg.includes('Already Used')) {
            console.log('♻️ [Auth] Token invalide détecté. Nettoyage de la session...');
            await supabase.auth.signOut().catch(() => { });
          }

          // CORRECTION : Ne mettre à null que si le listener n'a RIEN trouvé entre temps.
          // Cela évite de déconnecter l'utilisateur si le timeout se déclenche mais que la session est déjà là.
          if (mounted && !sessionFoundRef.current) setUser(null);
        } else {
          if (mounted) setUser(data?.session?.user ?? null);
        }
      } catch (error) {
        console.warn('⚠️ [Auth] Exception:', error);
        if (mounted && !sessionFoundRef.current) setUser(null);
      } finally {
        if (mounted) setLoading(false);
        clearTimeout(safetyTimer); // Annuler le timer de sécurité si tout s'est bien passé
      }
    };

    checkUser();

    return () => {
      mounted = false;
      // Utilisation de l'opérateur ?. pour éviter le crash si subscription n'existe pas
      data?.subscription?.unsubscribe();
    };
  }, []);

  return useMemo(() => ({ user, loading }), [user, loading]);
};
