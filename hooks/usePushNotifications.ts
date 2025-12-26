import { useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { supabase } from '../config';
import { useAuth } from './useAuth';
import { stockOptimizerAgent } from '../src/intelligence/agents/StockOptimizerAgent';

// --- NOUVEAU : Fonction de configuration extraite et robuste ---
async function setupNotificationChannels() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('critical_alerts_v4', {
      name: 'Alertes Critiques',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      showBadge: true,
    });

    await Notifications.setNotificationChannelAsync('feeding_reminders', {
      name: 'Rappels Alimentation',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
      vibrationPattern: [0, 500, 200, 500],
    });
  }
}

async function registerForPushNotificationsAsync(): Promise<string | undefined> {
  // On configure d'abord les canaux (fonctionne aussi sur émulateur pour le local)
  await setupNotificationChannels();

  if (!Device.isDevice) {
    console.log("[PushNotifications] Mode Débogage: Les notifications Push ne fonctionnent que sur un appareil physique.");
    return;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') {
    console.warn("[PushNotifications] Permission Requise: La permission pour les notifications n'a pas été accordée.");
    return;
  }

  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  if (!projectId) {
    console.error("[PushNotifications] Erreur de Configuration: L'identifiant du projet (projectId) est manquant dans app.config.js.");
    return;
  }

  try {
    return (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  } catch (error: any) {
    console.error(`[PushNotifications] Erreur Réseau: Impossible d'obtenir le token. Détails: ${error?.message || error}`);
    return;
  }
}

export function usePushNotifications() {
  const { user } = useAuth();

  // Fonction extraite pour pouvoir être appelée manuellement
  const syncToken = async () => {
    if (!user || !user.id) return;

    console.log("[PushNotifications] 🔄 Tentative de synchronisation du token...");
    const token = await registerForPushNotificationsAsync();

    if (!token) {
      console.log("[PushNotifications] ❌ Aucun token généré (Émulateur ou refus).");
      return;
    }

    console.log("[PushNotifications] ✅ Token généré:", token);

    // Utilisation de upsert pour être sûr que ça passe même si le profil est incomplet
    const { error } = await supabase
      .from('profiles')
      .update({ push_token: token })
      .eq('user_id', user.id);

    if (error) {
      console.error("[PushNotifications] ❌ Erreur DB:", error.message);
    } else {
      console.log("[PushNotifications] ✅ Token sauvegardé en base avec succès.");
    }
  };

  useEffect(() => {
    if (user) syncToken();
  }, [user]); // Se déclenche uniquement lorsque la session change

  const sendLocalNotification = async (title: string, body: string, data?: any) => {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: 'default', // S'assurer que le son est demandé
          // IMPORTANT : Lier la notification locale au canal haute priorité
          // Sans ça, Android peut la masquer de la barre d'état
          ...(Platform.OS === 'android' ? { channelId: 'critical_alerts_v4', color: '#FF231F7C' } : {}),
          priority: Notifications.AndroidNotificationPriority.MAX, // Pour les anciennes versions d'Android
        },
        trigger: null,
      });
    } catch (error) {
      console.error("Error sending local notification:", error);
    }
  };

  // --- NOUVEAU : Planification des rappels d'alimentation ---
  const scheduleFeedingReminders = useCallback(async () => {
    if (!user || !user.id) return;

    // --- CORRECTION : S'assurer que les canaux sont créés AVANT de planifier ---
    await setupNotificationChannels();

    try {
      // 1. Calculer la consommation totale journalière via l'agent intelligent
      const consumption = await stockOptimizerAgent.calculateFarmTotalConsumption(user.id);
      const totalKg = consumption.total_daily_consumption;
      const birdCount = consumption.activeBirdCount || 0;

      // Si pas de consommation (pas de lots), on ne planifie rien ou on annule
      if (totalKg <= 0) return null;

      const halfRation = (totalKg / 2).toFixed(1); // Divisé par 2 pour matin/soir

      // 2. Annuler les anciens rappels d'alimentation pour éviter les doublons/erreurs
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      for (const notif of scheduled) {
        if (notif.content.data?.type === 'feeding_reminder') {
          await Notifications.cancelScheduledNotificationAsync(notif.identifier);
        }
      }

      const bodyMessage = `Il est 7h. Préparez environ ${halfRation} kg d'aliment pour vos ${birdCount} sujets.`;

      // 3. Planifier pour 7h00 (Matin)
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🐔 Heure du repas (Matin)',
          body: bodyMessage,
          data: { type: 'feeding_reminder', ration: halfRation, total: totalKg, birds: birdCount },
          sound: 'default',
          // --- AJOUT : Utiliser le canal spécifique ---
          ...(Platform.OS === 'android' ? { channelId: 'feeding_reminders', color: '#FF231F7C' } : {}),
        },
        trigger: {
          hour: 7,
          minute: 0,
          repeats: true, // Répéter chaque jour
        },
      });

      // 4. Planifier pour 16h00 (Soir)
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🐔 Heure du repas (Soir)',
          body: `Il est 16h. Préparez environ ${halfRation} kg pour la ration du soir.`,
          data: { type: 'feeding_reminder', ration: halfRation },
          sound: 'default',
          // --- AJOUT : Utiliser le canal spécifique ---
          ...(Platform.OS === 'android' ? { channelId: 'feeding_reminders', color: '#FF231F7C' } : {}),
        },
        trigger: {
          hour: 16,
          minute: 0,
          repeats: true,
        },
      });

      console.log(`[PushNotifications] 📅 Rappels : ${halfRation}kg (Total: ${totalKg}kg pour ${birdCount} oiseaux).`);
      return { ration: halfRation, total: totalKg.toFixed(1), birds: birdCount };
    } catch (error) {
      console.error("[PushNotifications] Erreur lors de la planification des repas:", error);
      return null;
    }
  }, [user]);

  return { sendLocalNotification, syncToken, scheduleFeedingReminders };
}