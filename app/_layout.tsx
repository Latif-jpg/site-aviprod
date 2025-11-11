import { Stack } from 'expo-router';
import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase, testSupabaseConnection, getUserFriendlyErrorMessage, isProjectPausedError } from '../config'; // Utiliser le client Supabase consolidé
import { useAuth } from '../hooks/useAuth';
import { router, useSegments, usePathname } from 'expo-router';
import ErrorBoundary from '../components/ErrorBoundary';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Alert, Linking, Platform } from 'react-native';
import { colors } from '../styles/commonStyles';
import Icon from '../components/Icon';
import { setupErrorLogging } from '../utils/errorLogger';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import WebVersionChecker from '../components/WebVersionChecker';
import { ThemeProvider } from '../contexts/ThemeContext';
import { SubscriptionProvider } from '../contexts/SubscriptionContext';
import { UniversalIntelligenceProvider } from '../src/contexts/UniversalIntelligenceContext';
import Toast from 'react-native-toast-message';

const styles = StyleSheet.create({
  gestureRoot: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: colors.text,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: 30,
  },
  errorIcon: {
    marginBottom: 20,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
  },
  errorButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 12,
    minWidth: 200,
    alignItems: 'center',
  },
  errorButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.backgroundAlt,
  },
  secondaryButton: {
    backgroundColor: colors.backgroundAlt,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    minWidth: 200,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  statusText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 20,
    textAlign: 'center',
  },
  warningBox: {
    backgroundColor: colors.warning + '20',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.warning,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.warning,
    marginBottom: 8,
  },
  warningText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
});

function RootLayoutContent() {
  const { user, loading: authLoading } = useAuth();
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isProjectPaused, setIsProjectPaused] = useState(false);
  const segments = useSegments();
  const pathname = usePathname();
  useEffect(() => {
    // Setup error logging
    try {
      setupErrorLogging();
      console.log('🚀 App starting... Platform:', Platform.OS);
      
      // Log version info on web
      if (Platform.OS === 'web') {
        console.log('🌐 Web version: 1.0.1');
        console.log('📅 Build timestamp:', new Date().toISOString());
      }
    } catch (error) {
      console.log('⚠️ Error setting up error logging:', error);
    }
  }, []);

  // Handle navigation based on auth state
  useEffect(() => {
    if (authLoading) {
      return;
    }

    const inAuthGroup = segments[0] === 'auth'; // Only consider 'auth' as auth group
    const isWelcomePage = pathname === '/welcome';

    if (user && (inAuthGroup || isWelcomePage)) {
      // User is signed in but is in the auth group or on welcome page.
      // Redirect them to the main app screen.
      router.replace('/dashboard');
    } else if (!user && !inAuthGroup && !isWelcomePage) {
      // User is not signed in and is not on auth or welcome page.
      // Redirect them to the welcome screen.
      router.replace('/welcome');
    }
  }, [user, authLoading, segments, pathname]);

  // Show loading screen
  if (authLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>
          Chargement de l&apos;application...
        </Text>
      </View>
    );
  }

  // Show error screen if there's a connection error (this part remains, but connectionError is set elsewhere if needed)
  if (connectionError) {
    return (
      <View style={styles.errorContainer}>
        <View style={styles.errorIcon}>
          <Icon 
            name="cloud-offline"
            size={64} 
            color={isProjectPaused ? colors.warning : colors.error} 
          />
        </View>
        
        <Text style={styles.errorTitle}>
          {isProjectPaused ? 'Projet en Pause' : 'Problème de Connexion'}
        </Text>
        
        <Text style={styles.errorMessage}>
          {connectionError}
        </Text>

        {isProjectPaused && (
          <View style={styles.warningBox}>
            <Text style={styles.warningTitle}>💡 Comment résoudre?</Text>
            <Text style={styles.warningText}>
              1. Ouvrez le tableau de bord Supabase{'\n'}
              2. Sélectionnez le projet "AviprodApp"{/* Corrected: escaped quote */}
              3. Cliquez sur "Restore project"{/* Corrected: escaped quote */}
              4. Revenez à l&apos;application et réessayez
            </Text>
          </View>
        )}

        <TouchableOpacity 
          style={styles.errorButton}
          onPress={() => {
            // Ici, on pourrait re-tenter la connexion Supabase si nécessaire
            // Pour l'instant, on se contente de réinitialiser l'erreur et laisser useAuth refaire son travail
            setConnectionError(null);
            setIsProjectPaused(false);
          }}
        >
          <Text style={styles.errorButtonText}>
            Réessayer
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.secondaryButton}
          onPress={() => {
            // Permettre de continuer en mode démo si la connexion échoue
            setConnectionError(null);
            router.replace('/'); // Rediriger vers le tableau de bord en mode non authentifié
          }}
        >
          <Text style={styles.secondaryButtonText}>
            Continuer en Mode Démo
          </Text>
        </TouchableOpacity>

        <Text style={styles.statusText}>
          {isProjectPaused 
            ? 'Le projet doit être réactivé pour utiliser toutes les fonctionnalités.'
            : 'Vous pouvez continuer en mode démo avec des données de test.'
          }
        </Text>
      </View>
    );
  }

  // Render the main app with Stack navigator
  console.log('📺 Rendering Stack navigator, user authenticated:', !!user);
  return (
    <>
      <WebVersionChecker />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: {
            backgroundColor: Platform.OS === 'web' ? '#ffffff' : colors.background
          },
          animation: 'slide_from_right',
          gestureEnabled: true,
          gestureDirection: 'horizontal',
          presentation: 'card',
        }}
      >
        <Stack.Screen name="dashboard" options={{ headerShown: false }} />
        <Stack.Screen name="welcome" />
        <Stack.Screen name="auth" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="health" />
        <Stack.Screen name="feeding" />
        <Stack.Screen name="finance" />
        <Stack.Screen name="marketplace" />
        <Stack.Screen name="lots" />
        <Stack.Screen name="connection-check" />
        <Stack.Screen name="ngrok-help" />
        <Stack.Screen name="verify-setup" />
        <Stack.Screen name="ai-history" />
        <Stack.Screen name="marketplace-messages" />
        <Stack.Screen name="subscription-plans" />
        <Stack.Screen name="delivery-driver" />
        <Stack.Screen name="order-tracking" />
        <Stack.Screen name="delivery-dashboard" />
        <Stack.Screen name="delivery" />
        <Stack.Screen name="driver-registration" />
        <Stack.Screen name="admin-driver-validation" />
        <Stack.Screen name="seller-orders" />
        <Stack.Screen name="notifications" />
        <Stack.Screen name="admin-ai-evolution-dashboard" options={{ headerShown: false }} />
        <Stack.Screen name="financial-dashboard" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  console.log('🎬 RootLayout rendering');
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <SubscriptionProvider>
          <UniversalIntelligenceProvider>
            <GestureHandlerRootView style={styles.gestureRoot}>
              <RootLayoutContent />
              <Toast />
            </GestureHandlerRootView>
          </UniversalIntelligenceProvider>
        </SubscriptionProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}