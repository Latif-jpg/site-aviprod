import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Platform } from 'react-native'; // Needed for webStorage

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

/**
 * Construit l'URL publique pour une image de PRODUIT du marketplace.
 * @param imagePath - Le chemin de l'image dans le bucket 'marketplace-products'.
 * @returns L'URL publique complète de l'image.
 */
export const getMarketplaceImageUrl = (imagePath: string | null | undefined): string => {
  console.log('🖼️ getMarketplaceImageUrl called with:', imagePath);

  if (!imagePath) {
    console.log('⚠️ No image path provided, using placeholder');
    // Retourne une image placeholder si le chemin est manquant
    return 'https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?w=400&h=300&fit=crop';
  }

  // Nettoyer le chemin de l'image
  const cleanPath = imagePath.trim();

  if (cleanPath.startsWith('http')) {
    console.log('✅ Image path is already a full URL:', cleanPath);
    return cleanPath; // C'est déjà une URL complète
  }

  // Vérifier si c'est un chemin local (commence par file://)
  if (cleanPath.startsWith('file://')) {
    console.log('⚠️ Local file path detected, using placeholder:', cleanPath);
    return 'https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?w=400&h=300&fit=crop';
  }

  // Construire l'URL Supabase
  const fullUrl = `${supabaseUrl}/storage/v1/object/public/marketplace-products/${cleanPath}`;
  console.log('🔗 Constructed Supabase URL:', fullUrl);

  return fullUrl;
};

/**
 * Construit l'URL publique complète pour un fichier stocké dans un bucket Supabase (usage générique).
 * @param bucket - Le nom du bucket de stockage (ex: 'advertisements').
 * @param path - Le chemin du fichier dans le bucket.
 * @returns L'URL publique complète du fichier.
 */
export const getStorageUrl = (bucket: string, path: string | null | undefined): string => {
  if (!path) return 'https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?w=400&h=300&fit=crop';

  if (path.startsWith('http')) {
    return path;
  }
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${path}`;
};

// --- Supabase Utility Functions (from old app/integrations/supabase/client.ts) ---

// getSupabaseClient and ensureSupabaseInitialized can now simply return the exported 'supabase' instance
export async function getSupabaseClient(): Promise<SupabaseClient> {
  return supabase;
}

export async function ensureSupabaseInitialized(): Promise<SupabaseClient> {
  return supabase;
}

export async function testSupabaseConnection(throwOnError: boolean = false): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('🌐 Testing Supabase connection...');
    
    const client = supabase; // Use the already initialized client
    
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Connection timeout after 10 seconds')), 10000);
    });

    const testPromise = client
      .from('profiles')
      .select('count')
      .limit(1)
      .single();

    const { error } = await Promise.race([testPromise, timeoutPromise]) as any;

    if (error) {
      if (error.message?.includes('JWT') || error.message?.includes('expired')) {
        console.log('⚠️ Auth token expired, clearing session...');
        await client.auth.signOut();
        return { success: false, error: 'Session expirée. Veuillez vous reconnecter.' };
      }
      
      if (error.code === 'PGRST116' || error.message?.includes('not found')) {
        console.log('✅ Connection successful (table not found is OK for connection test)');
        return { success: true };
      }

      console.log('⚠️ Connection test failed:', error.message);
      return { 
        success: false, 
        error: getUserFriendlyErrorMessage(error)
      };
    }

    console.log('✅ Connection test successful');
    return { success: true };
  } catch (error: any) {
    console.log('⚠️ Connection test exception:', error.message || error);
    
    if (throwOnError) {
      throw error;
    }
    
    return { 
      success: false, 
      error: error.message || 'Erreur de connexion inconnue'
    };
  }
}

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

export function getUserFriendlyErrorMessage(error: any): string {
  if (!error) return 'Erreur inconnue';

  const message = error.message || '';
  const code = error.code || '';

  if (isProjectPausedError(error)) {
    return 'Le projet Supabase est en pause. Veuillez le réactiver dans le tableau de bord Supabase.';
  }

  if (message.includes('Failed to fetch') || message.includes('Network request failed')) {
    return 'Impossible de se connecter au serveur. Vérifiez votre connexion internet.';
  }

  if (message.includes('timeout')) {
    return 'La connexion a expiré. Le serveur met trop de temps à répondre.';
  }

  if (code === 'PGRST116' || message.includes('not found')) {
    return 'Ressource non trouvée. La table ou l\'enregistrement n\'existe pas.';
  }

  if (message.includes('JWT') || message.includes('expired')) {
    return 'Votre session a expiré. Veuillez vous reconnecter.';
  }

  if (message.includes('Invalid login credentials')) {
    return 'Email ou mot de passe incorrect.';
  }

  if (message.includes('Email not confirmed')) {
    return 'Email non confirmé. Vérifiez votre boîte de réception et cliquez sur le lien de confirmation.';
  }

  if (message.includes('User already registered')) {
    return 'Cet email est déjà enregistré. Essayez de vous connecter.';
  }

  if (message.includes('Password should be at least')) {
    return 'Le mot de passe doit contenir au moins 6 caractères.';
  }

  return message || 'Une erreur est survenue';
}