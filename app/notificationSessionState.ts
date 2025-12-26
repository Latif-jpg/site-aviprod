// c/Users/tifla/Downloads/elevage/services/notificationSessionState.ts

/**
 * Cet objet simple sert de stockage en mémoire pour la session de l'application.
 * Contrairement à un état React (useState, useRef), sa valeur persiste tant que
 * l'application n'est pas complètement fermée et redémarrée.
 */
export const notificationSessionState = {
  dismissedBlinkingNotificationId: null as string | null,
  lastPushNotificationSignature: null as string | null, // --- NOUVEAU : Pour les notifications push ---
};