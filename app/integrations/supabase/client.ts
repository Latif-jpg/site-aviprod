import { createClient, SupabaseClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import 'react-native-url-polyfill/auto';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase URL or Anon Key is not set. Please check your .env file.');
}

// Web-specific storage adapter with cache busting
const webStorage = Platform.OS === 'web' ? {
  getItem: async (key: string) => {
    try {
      // Add version check for web
      if (key === 'supabase.auth.token') {
        const version = localStorage.getItem('app_version');
        const currentVersion = '1.0.1'; // Match app.json version

        if (version && version !== currentVersion) {
          console.log('🔄 Version mismatch detected, clearing auth cache');
          localStorage.removeItem(key);
          localStorage.setItem('app_version', currentVersion);
          return null;
        }
      }

      return localStorage.getItem(key);
    } catch (error) {
      console.log('⚠️ Error reading from localStorage:', error);
      return null;
    }
  },
  setItem: async (key: string, value: string) => {
    try {
      localStorage.setItem(key, value);

      // Set version when storing auth token
      if (key === 'supabase.auth.token') {
        localStorage.setItem('app_version', '1.0.1');
      }
    } catch (error) {
      console.log('⚠️ Error writing to localStorage:', error);
    }
  },
  removeItem: async (key: string) => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.log('⚠️ Error removing from localStorage:', error);
    }
  },
} : AsyncStorage;

export const supabase = createClient(supabaseUrl!, supabaseAnonKey!, {
  auth: {
    storage: webStorage, // Use webStorage for web, AsyncStorage for others
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