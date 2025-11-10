
import { useState, useEffect } from 'react';
import { ensureSupabaseInitialized } from '../config'; // Utiliser le client Supabase consolidé
import { User } from '@supabase/supabase-js';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      try {
        const supabase = await ensureSupabaseInitialized();
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('Error getting session:', error);
          setUser(null);
        } else {
          setUser(session?.user ?? null);
        }
      } catch (error) {
        console.error('Error in auth hook:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkUser();

    const supabasePromise = ensureSupabaseInitialized();

    const getAuthListener = async () => {
        const supabase = await supabasePromise;
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
        });

        return subscription;
    };

    const subscriptionPromise = getAuthListener();

    return () => {
      subscriptionPromise.then(subscription => subscription?.unsubscribe());
    };
  }, []);

  return { user, loading };
};
