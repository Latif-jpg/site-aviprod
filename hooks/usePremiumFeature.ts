import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../config';
import { useSubscription } from '../contexts/SubscriptionContext';
import { useProfile } from '../contexts/ProfileContext';
import { consumeAvicoins } from '../lib/avicoins';

interface UsePremiumFeatureParams {
  featureKey: string;
  featureName: string;
  cost: number;
}

interface RequestAccessResult {
  granted: boolean;
  reason?: 'limit_reached' | 'insufficient_funds' | 'payment_failed' | 'user_cancelled';
}

/**
 * Hook pour gérer l'accès aux fonctionnalités premium.
 * Il gère les abonnements, les limites d'utilisation et les paiements par Avicoins.
 */
export const usePremiumFeature = ({ featureKey, featureName, cost }: UsePremiumFeatureParams) => {
  const [isLoading, setIsLoading] = useState(false);
  const [showTunnel, setShowTunnel] = useState(false);
  const { subscription, loading: subLoading } = useSubscription();
  const { profile, updateProfile, loading: profLoading } = useProfile();

  const isReady = !subLoading && !profLoading;

  const requestAccess = useCallback(async (metadata: Record<string, any> = {}): Promise<RequestAccessResult> => {
    // Si les données ne sont pas prêtes, on attend ou on renvoie une erreur ?
    // Idéalement, le composant appelant doit attendre isReady.
    // Mais par sécurité, si on appelle requestAccess alors que ça charge, on peut tenter une petite attente ou assumer le risque.

    setIsLoading(true);

    try {
      // 1. Vérifier l'accès illimité via l'abonnement
      // --- MODIFICATION : Vérification robuste pour le plan PRO (ID ou NOM) ---
      const planId =
        subscription?.plan_id ||
        subscription?.plan?.id ||
        profile?.subscription_plan_id;

      const planName = subscription?.plan?.name;

      const unlimitedKeywords = ['pro', 'professional', 'expert', 'business'];

      // Vérification sur l'ID
      if (planId && unlimitedKeywords.some(keyword => planId.toLowerCase().trim().includes(keyword))) {
        return { granted: true };
      }

      // Vérification sur le NOM (si l'ID est un UUID par exemple)
      if (planName && unlimitedKeywords.some(keyword => planName.toLowerCase().trim().includes(keyword))) {
        return { granted: true };
      }

      const hasUnlimitedAccess = subscription?.plan?.features?.[featureKey] === -1;
      if (hasUnlimitedAccess) {
        return { granted: true };
      }

      // 2. Vérifier les limites d'utilisation pour les plans gratuits/limités
      const { data: usageAllowed, error: usageError } = await supabase.rpc('check_usage_limit', {
        feature_key: featureKey
      });
      if (usageError) throw new Error("Impossible de vérifier les limites d'utilisation.");
      if (usageAllowed) {
        return { granted: true };
      }

      // 3. Limite atteinte, tenter le paiement par Avicoins
      const avicoinsBalance = profile?.avicoins || 0;
      if (avicoinsBalance < cost) {
        // --- MODIFICATION : Afficher le Tunnel Malin au lieu d'une Alerte ---
        setShowTunnel(true);
        return { granted: false, reason: 'insufficient_funds' };
      }

      // 4. Demander confirmation à l'utilisateur
      const userConfirmed = await new Promise<boolean>((resolve) => {
        Alert.alert(
          'Utiliser Avicoins',
          `Continuer avec ${cost} Avicoins pour "${featureName}" ?\nVotre solde : ${avicoinsBalance} Avicoins.`,
          [
            { text: 'Annuler', style: 'cancel', onPress: () => resolve(false) },
            { text: 'Confirmer', onPress: () => resolve(true) }
          ]
        );
      });

      if (!userConfirmed) {
        return { granted: false, reason: 'user_cancelled' };
      }

      // 5. Procéder au paiement
      const paymentResult = await consumeAvicoins({
        task_type: featureKey,
        cost,
        metadata,
      });

      if (paymentResult.success && paymentResult.balance !== null) {
        updateProfile({
          avicoins: paymentResult.balance,
          avicoins_balance: paymentResult.balance
        });
        return { granted: true };
      } else {
        throw new Error(paymentResult.message || 'Le paiement avec Avicoins a échoué.');
      }
    } catch (err: any) {
      Alert.alert('Erreur', err.message);
      return { granted: false, reason: 'payment_failed' };
    } finally {
      setIsLoading(false);
    }
  }, [subscription, profile, featureKey, featureName, cost, updateProfile]);

  return {
    isLoading,
    isReady,
    requestAccess,
    showTunnel,
    setShowTunnel,
    tunnelProps: {
      isVisible: showTunnel,
      onClose: () => setShowTunnel(false),
      featureName,
      requiredAvicoins: cost,
      currentAvicoins: profile?.avicoins || 0,
      onAdRewarded: () => {
        // Optionnel : on pourrait re-tenter requestAccess ici si on voulait
        // Mais laisser l'utilisateur re-cliquer est plus sûr
      }
    }
  };
};
