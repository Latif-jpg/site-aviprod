import React, { useEffect, useState } from 'react';
import { router, Slot, Tabs } from 'expo-router'; // Importer router et Slot
import { ProfileProvider, useProfile } from '../contexts/ProfileContext';
import { SubscriptionProvider } from '../contexts/SubscriptionContext';
import { NotificationProvider, useNotifications } from '../components/NotificationContext';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useAuth } from '../hooks/useAuth'; // Importer le hook d'authentification
import { supabase } from '../config'; // Importer le client Supabase
import Toast from 'react-native-toast-message'; // Pour afficher les notifications
import { Alert, AppState } from 'react-native';
import Constants from 'expo-constants';
import Icon from '../components/Icon'; // Importer Icon
// import * as Notifications from 'expo-notifications';
import * as Updates from 'expo-updates';
import { ThemeProvider } from '../contexts/ThemeContext';
import { logInfo, logError } from '../utils/sendLog'; // --- AJOUT : Importer notre logger ---
import * as SplashScreen from 'expo-splash-screen';
// import { usePushNotifications } from '../hooks/usePushNotifications'; // --- AJOUT : Importer le hook de notifications push ---

// Maintenir le Splash Screen visible jusqu'à ce que l'app soit prête
SplashScreen.preventAutoHideAsync().catch(() => {
  /* reloading the app might trigger some race conditions, ignore them */
});

const RealtimeNotificationHandler = () => {
  const { user } = useAuth();
  const { fetchUnreadCount, fetchNotifications } = useNotifications(); // Obtenir les fonctions pour rafraîchir

  useEffect(() => {
    if (!user) {
      return;
    }

    console.log(`🔔 [Realtime] Abonnement au canal de notifications pour l'utilisateur: ${user.id}`);

    // S'abonner au canal privé de l'utilisateur
    const channel = supabase.channel(`user:${user.id}:notifications`, {
      config: {
        broadcast: {
          self: true, // Recevoir les messages que l'on envoie soi-même (utile pour le test)
        },
      },
    });

    // Écouter l'événement 'notification_created' que nous avons défini dans le trigger
    channel.on('broadcast', { event: 'notification_created' }, (payload) => {
      console.log('🎉 [Realtime] Nouvelle notification reçue !', payload);

      // --- CORRECTION : Logique d'extraction du payload plus robuste ---
      // Le payload peut être à différents niveaux selon la source (trigger, broadcast direct, etc.)
      const newNotification = payload?.payload?.record || payload?.payload?.payload?.new || payload?.payload;

      if (!newNotification) {
        console.error("❌ [Realtime] Impossible d'extraire les données de la notification depuis le payload:", payload);
        return;
      }

      // Rafraîchir le compteur de notifications non lues et la liste complète
      fetchUnreadCount();
      fetchNotifications(); // --- AJOUT : Rafraîchit la liste complète des notifications dans le contexte ---

      // Afficher un Toast (notification in-app) qui est maintenant cliquable
      Toast.show({
        type: 'info', // ou 'success', 'error'
        text1: newNotification.title || 'Nouvelle Notification',
        text2: newNotification.message,
        visibilityTime: 5000, // 5 secondes
        position: 'top',
        // --- AJOUT : Gérer le clic sur la notification ---
        onPress: () => {
          Toast.hide(); // Cacher le toast immédiatement
          const action = newNotification.data?.action;
          const orderId = newNotification.data?.order_id;

          if (action === 'pay_order' && orderId) {
            console.log(`🚀 Redirection vers le paiement pour la commande: ${orderId}`);
            router.push({ pathname: '/order-payment', params: { orderId: orderId } });
          }
        }
      });
    });

    channel.subscribe((status, err) => {
      // --- CORRECTION : Journalisation complète du statut de la souscription ---
      console.log(`[Realtime] Statut du canal de notification: ${status}`);
      if (status === 'SUBSCRIBED') {
        console.log('✅ [Realtime] Connecté avec succès au canal de notifications.');
      }
      if (status === 'CHANNEL_ERROR') {
        console.error('❌ [Realtime] Erreur sur le canal de notification:', err);
      }
      if (status === 'TIMED_OUT') {
        console.warn('⌛ [Realtime] Le canal de notification a expiré (timeout).');
      }
    });

    // Nettoyer l'abonnement quand le composant est démonté ou l'utilisateur change
    return () => {
      console.log('🔌 [Realtime] Désabonnement du canal de notifications.');
      supabase.removeChannel(channel);
    };
  }, [user]);

  return null; // Ce composant n'affiche rien, il gère juste la logique en arrière-plan.
};

const MainLayout = () => {
  // usePushNotifications(); // --- AJOUT : Activer la gestion des notifications push ---
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const { unreadCount } = useNotifications();

  // Rediriger vers l'authentification si l'utilisateur n'est pas connecté
  useEffect(() => {
    if (!authLoading && !user) {
      // Si le chargement est terminé et qu'il n'y a pas d'utilisateur,
      // cela signifie que la session est invalide ou a expiré.
      router.replace('/auth');
    }
  }, [user, authLoading]);

  // Afficher un écran de chargement pendant que l'authentification et le profil se chargent
  if (authLoading || profileLoading) {
    return null; // Ou un écran de chargement
  }

  // Si l'utilisateur est connecté, afficher la navigation principale
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#007AFF',
      }}
    >
      <Tabs.Screen name="dashboard" options={{ title: 'Accueil', tabBarIcon: ({ color }) => <Icon name="home" color={color} /> }} />
      <Tabs.Screen name="marketplace" options={{ title: 'Marché', tabBarIcon: ({ color }) => <Icon name="storefront" color={color} /> }} />
      <Tabs.Screen name="ai-analysis" options={{ title: 'Analyse IA', tabBarIcon: ({ color }) => <Icon name="camera" color={color} /> }} />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color }) => <Icon name="person" color={color} />,
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
        }}
      />
      {/* Masquer les autres routes de la barre d'onglets */}
      <Tabs.Screen name="auth" options={{ href: null }} />
      <Tabs.Screen name="seller-orders" options={{ href: null }} />
      <Tabs.Screen name="delivery-driver" options={{ href: null }} />
    </Tabs>
  );
};

/* -----------------------------------------------------------------
   Fonction hideSplash – sécurisée
----------------------------------------------------------------- */
const hideSplash = async () => {
  try {
    // Attendre que les assets critiques soient prêts (fonts, images…)
    await new Promise(res => setTimeout(res, 500));
    await SplashScreen.hideAsync();
  } catch (e) {
    console.warn('Erreur lors du masquage du splash screen :', e);
  }
};

/* -----------------------------------------------------------------
   OTA – version sécurisée
----------------------------------------------------------------- */
const checkAndApplyUpdate = async () => {
  if (__DEV__) {
    console.log('Mode dev : OTA désactivé');
    return;
  }
  try {
    logInfo('🔄 [OTA] Recherche d’une mise à jour…');
    const update = await Updates.checkForUpdateAsync();

    if (!update.isAvailable) {
      logInfo('✅ [OTA] Application à jour.');
      return;
    }

    logInfo('📲 [OTA] Mise à jour trouvée, téléchargement…', { manifestId: update.manifest.id });
    await Updates.fetchUpdateAsync();
    logInfo('✅ [OTA] Mise à jour téléchargée.');

    Alert.alert(
      'Mise à jour disponible',
      "Une nouvelle version a été téléchargée. Redémarrer maintenant pour l’appliquer ?",
      [
        { text: 'Plus tard', style: 'cancel' },
        {
          text: 'Redémarrer',
          onPress: async () => {
            try {
              logInfo('🔄 [OTA] Redémarrage de l\'application pour appliquer la mise à jour...');
              await Updates.reloadAsync();
            } catch (e) {
              logError('❌ [OTA] Erreur au redémarrage.', {
                message: e.message,
                stack: e.stack
              });
            }
          },
        },
      ]
    );
  } catch (error) {
    console.warn(`⚠️ [OTA] Erreur lors de la vérification : ${error}`);
    logError('❌ [OTA] Erreur lors de la vérification.', {
      message: error.message,
      stack: error.stack
    });
  }
};


export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);

  // 1. Gérer le splash screen et l'état de préparation de l'app
  useEffect(() => {
    logInfo('🚀 Application en cours de démarrage...');
    hideSplash().then(() => setIsReady(true));
  }, []);

  // 2. Gérer la mise à jour OTA une fois que l'app est prête
  useEffect(() => {
    if (isReady) {
      checkAndApplyUpdate();
    }
  }, [isReady]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <ProfileProvider>
          <NotificationProvider>
            <SubscriptionProvider>
              <RealtimeNotificationHandler />
              {/* Slot rendra soit MainLayout (Tabs) soit un autre écran comme Auth */}
              <Slot />
              <Toast />
            </SubscriptionProvider>
          </NotificationProvider>
        </ProfileProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}