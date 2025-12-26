import { useEffect, useState } from 'react';
import { supabase } from './config'; // Chemin corrigé pour pointer vers config.ts
import { Session } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const subscription = Linking.addEventListener('url', ({ url }) => {
      console.log('🔗 [Deep Link] URL reçue :', url);
      // La librairie Supabase gère l'URL, mais nous la loggons pour le débogage.
      // Vérifions s'il y a une erreur explicite dans l'URL
      try {
        const parsedUrl = new URL(url);
        const error = parsedUrl.searchParams.get('error');
        const errorDescription = parsedUrl.searchParams.get('error_description');
        if (error) {
          console.error(`🚨 [Deep Link Error] Erreur dans l'URL : ${error} - ${errorDescription}`);
        }
      } catch (e) {
        console.error("🚨 [Deep Link Error] Impossible de parser l'URL", e);
      }
    });

    // Récupère la session initiale et met à jour le token si elle existe
    supabase.auth.getSession().then(({ data, error }) => {
      if (error) {
        console.error('🚨 [Session Error] Erreur getSession:', error);
        setLoading(false);
        return;
      }
      const session = data?.session ?? null;
      console.log('🔍 [Session Check] Session initiale :', session ? 'trouvée' : 'absente');
      setSession(session);
      setLoading(false);
    }).catch((err) => {
      console.error('🚨 [Session Error] Erreur récupération session:', err);
      setLoading(false);
    });

    // Écoute les changements d'état d'authentification (ex: nouvelle connexion)
    const { data } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log(`🔔 [Auth State Change] Événement : ${event}`, session ? 'Session présente' : 'Session absente');
        setSession(session);
      }
    );

    // Nettoyage des écouteurs
    return () => {
      subscription.remove();
      data?.subscription?.unsubscribe();
    };
  }, []);

  return { session, user: session?.user, loading };
}