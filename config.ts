import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

// -------------------------------------------------------------
// ⚠️ RÉCUPÉRATION DES VARIABLES ENV DEPUIS Expo (correct pour Windows)
// -------------------------------------------------------------
const supabaseUrl = Constants.expoConfig?.extra?.EXPO_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = Constants.expoConfig?.extra?.EXPO_PUBLIC_SUPABASE_ANON_KEY || "";

console.log(`🔌 [Config] URL Supabase: ${supabaseUrl ? supabaseUrl : '⚠️ VIDE (Placeholder sera utilisé)'}`);
console.log(`🔑 [Config] Anon Key: ${supabaseAnonKey ? 'Présente' : '⚠️ VIDE'}`);

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('❌ Supabase URL ou Anon Key manquante. Vérifiez votre .env et app.config.js');
}

// Utilisation de valeurs par défaut pour éviter le crash de createClient si les variables sont vides
const validUrl = supabaseUrl || "https://placeholder.supabase.co";
const validKey = supabaseAnonKey || "placeholder";

// -------------------------------------------------------------
// ✔️ INITIALISATION DU CLIENT SUPABASE
// -------------------------------------------------------------
export const supabase = createClient(validUrl, validKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    storageKey: 'supabase.auth.token',
  },
});

// -------------------------------------------------------------
// ✔️ STOCKAGE EN MÉMOIRE
// -------------------------------------------------------------
// This is a workaround for Expo Router to prevent it from treating this file as a route.
// It ensures that this configuration file does not cause warnings in the development environment.
const ConfigWorkaround = () => null;
export default ConfigWorkaround;

export const notificationSessionState = {
  dismissedBlinkingNotificationId: null as string | null,
  lastPushNotificationSignature: null as string | null,
};

// -------------------------------------------------------------
// ✔️ FONCTION : URL d’image marketplace
// -------------------------------------------------------------
export const getMarketplaceImageUrl = (imagePath: string | null | undefined): string => {
  console.log('🖼️ getMarketplaceImageUrl called with:', imagePath);

  if (!imagePath) {
    console.log('⚠️ No image path provided, using placeholder');
    return 'https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?w=400&h=300&fit=crop';
  }

  const cleanPath = imagePath.trim();

  if (cleanPath.startsWith('http')) {
    console.log('✅ Full URL detected:', cleanPath);
    return cleanPath;
  }

  if (cleanPath.startsWith('file://')) {
    console.log('⚠️ Local path detected. Using placeholder.');
    return 'https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?w=400&h=300&fit=crop';
  }

  const fullUrl =
    `${supabaseUrl}/storage/v1/object/public/marketplace-products/${cleanPath}`;

  console.log('🔗 Constructed Supabase URL:', fullUrl);

  return fullUrl;
};

// -------------------------------------------------------------
// ✔️ FONCTION : URL générique storage
// -------------------------------------------------------------
export const getStorageUrl = (bucket: string, path: string | null | undefined): string => {
  if (!path) {
    return 'https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?w=400&h=300&fit=crop';
  }

  if (path.startsWith('http')) return path;

  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${path}`;
};

// -------------------------------------------------------------
// ✔️ FONCTIONS SUPABASE UTILITAIRES
// -------------------------------------------------------------
export async function getSupabaseClient(): Promise<SupabaseClient> {
  return supabase;
}

export async function ensureSupabaseInitialized(): Promise<SupabaseClient> {
  return supabase;
}

// -------------------------------------------------------------
// ✔️ TEST DE CONNEXION SUPABASE
// -------------------------------------------------------------
export async function testSupabaseConnection(
  throwOnError: boolean = false
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('🌐 Testing Supabase connection...');

    const client = supabase;

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Connection timeout after 10 seconds')), 10000)
    );

    const testPromise = client
      .from('profiles')
      .select('count')
      .limit(1)
      .single();

    const { error } = await Promise.race([testPromise, timeoutPromise]) as any;

    if (error) {
      if (error.message?.includes('JWT') || error.message?.includes('expired')) {
        return { success: false, error: 'Session expirée. Veuillez vous reconnecter.' };
      }

      if (error.code === 'PGRST116' || error.message?.includes('not found')) {
        return { success: true };
      }

      return { success: false, error: getUserFriendlyErrorMessage(error) };
    }

    console.log('✅ Connection OK');
    return { success: true };
  } catch (error: any) {
    console.log('⚠️ Connection error:', error.message || error);
    if (throwOnError) throw error;

    return { success: false, error: error.message || 'Erreur inconnue' };
  }
}

// -------------------------------------------------------------
// ✔️ DÉTECTION "PROJET SUPABASE EN PAUSE"
// -------------------------------------------------------------
export function isProjectPausedError(error: any): boolean {
  if (!error) return false;

  const message = error.message?.toLowerCase() || '';
  const code = error.code?.toLowerCase() || '';

  return (
    message.includes('pause') ||
    message.includes('inactive') ||
    message.includes('suspended') ||
    message.includes('timeout') ||
    message.includes('connection terminated') ||
    code === 'project_paused' ||
    code === '57p03'
  );
}

// -------------------------------------------------------------
// ✔️ MESSAGE D’ERREUR LISIBLE POUR L’UTILISATEUR
// -------------------------------------------------------------
export function getUserFriendlyErrorMessage(error: any): string {
  if (!error) return 'Erreur inconnue';

  const message = error.message || '';
  const code = error.code || '';

  if (isProjectPausedError(error)) {
    return 'Le projet Supabase est en pause. Veuillez le réactiver dans le dashboard Supabase.';
  }

  if (message.includes('Failed to fetch') || message.includes('Network request failed')) {
    return 'Impossible de se connecter au serveur. Vérifiez votre connexion internet.';
  }

  if (message.includes('timeout')) {
    return 'La connexion a expiré.';
  }

  if (code === 'PGRST116' || message.includes('not found')) {
    return 'Ressource introuvable.';
  }

  if (message.includes('JWT') || message.includes('expired')) {
    return 'Votre session a expiré. Veuillez vous reconnecter.';
  }

  if (message.includes('Invalid login credentials')) {
    return 'Email ou mot de passe incorrect.';
  }

  if (message.includes('Email not confirmed')) {
    return 'Email non confirmé.';
  }

  if (message.includes('User already registered')) {
    return 'Cet email est déjà enregistré.';
  }

  if (message.includes('Password should be at least')) {
    return 'Le mot de passe doit contenir au moins 6 caractères.';
  }

  return message || 'Une erreur est survenue';
}
