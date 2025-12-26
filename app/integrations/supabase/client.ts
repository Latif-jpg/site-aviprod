import { createClient, SupabaseClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import 'react-native-url-polyfill/auto';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase URL or Anon Key is not set. Please check your .env file.');
}

// --- CORRECTION : Créer un adaptateur de stockage sécurisé pour le rendu côté serveur ---
// Cet adaptateur vérifie si `localStorage` existe avant de l'utiliser.
const safeLocalStorage = {
  getItem: (key: string) => {
    // Si `localStorage` n'est pas défini (ex: côté serveur), retourner null.
    return typeof localStorage === 'undefined' ? null : localStorage.getItem(key);
  },
  setItem: (key: string, value: string) => {
    // N'écrire que si `localStorage` est disponible.
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, value);
    }
  },
  removeItem: (key: string) => {
    // Ne supprimer que si `localStorage` est disponible.
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(key);
    }
  },
};

// Déterminer le stockage à utiliser en fonction de la plateforme
const storage = Platform.OS === 'web' ? safeLocalStorage : AsyncStorage;

export const supabase = createClient(supabaseUrl!, supabaseAnonKey!, {
  auth: {
    storage: storage, // Utilise l'adaptateur sécurisé pour le web
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Default export for React Router compatibility
// This prevents React Router from treating this as a route
export default supabase;

// Also export as a named export for consistency
export { supabase as supabaseClient };

export async function ensureSupabaseInitialized(): Promise<SupabaseClient> {
  return supabase;
}

export async function getSupabaseClient(): Promise<SupabaseClient> {
  return supabase;
}