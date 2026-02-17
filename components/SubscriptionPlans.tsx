import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, commonStyles } from '../styles/commonStyles';
import Icon from './Icon';
import { supabase } from '../config';
import { router } from 'expo-router';
import { useSubscription } from '../contexts/SubscriptionContext';
// import { usePayments } from '../hooks/usePayments';
// import PaymentModal from './PaymentModal';

interface SubscriptionPlan {
  id: string;
  name: string;
  display_name: string;
  description: string;
  price_monthly: number;
  price_yearly: number;
  features: {
    ai_analyses_per_month: number;
    max_lots: number;
    auto_feeding: boolean;
    advanced_feeding?: boolean;
    optimized_feeding?: boolean;
    product_recommendations?: boolean;
    full_history?: boolean;
    sell_on_marketplace?: boolean;
    export_reports?: boolean;
    advanced_alerts?: boolean;
    delivery_discount?: number;
    delivery_free?: boolean;
    product_discount?: number;
    priority_support?: boolean;
    dedicated_support?: boolean;
    avicoins_amount?: number;
    ai_analysis_cost?: number;
    auto_feeding_cost?: number;
    premium_feature_cost?: number;
    pro_feature_cost?: number;
    avicoins_allowed?: boolean; // Ajout de la clé pour les packs Avicoins
  };
}

export default function SubscriptionPlans() {
  // --- CORRECTION : Utiliser directement les données du contexte ---
  // Plus besoin de charger les plans localement, le contexte s'en charge.
  // 'allPlans' contient tous les plans, 'subscription' l'abonnement actif.
  const { subscription: currentSubscription, allPlans: fetchedPlans, loading: subscriptionLoading } = useSubscription();

  // --- OVERRIDE TEMPORAIRE (Demande Client) ---
  // Forcer le prix du plan Pro à 15000 CFA dans le code en attendant la mise à jour DB.
  const plans = fetchedPlans.map(plan => {
    if (plan.name === 'pro') {
      return { ...plan, price_monthly: 15000 };
    }
    return plan;
  });

  // MODE PAIEMENT ACTUEL : MANUEL (avec validation admin)
  // Pour basculer vers PayDunya automatique : remplacer handleSubscribe par handleSubscribePayDunya
  const handleSubscribe = (plan: SubscriptionPlan) => {
    if (plan.name === 'freemium' || currentSubscription?.plan?.id === plan.id) {
      return;
    }

    const itemType = plan.name.startsWith('avicoins_') ? 'avicoin' : 'abonnement';

    router.push({
      pathname: '/order-payment',
      params: {
        itemType,
        itemId: plan.id,
        amount: plan.price_monthly,
        planName: plan.display_name,
      },
    });
  };

  /*
  // CONFIGURATION PAYDUNYA (COMMENTÉE - Peut être réactivée si nécessaire)
  const handleSubscribePayDunya = async (plan: SubscriptionPlan) => {
    if (plan.name === 'freemium' || currentSubscription?.plan?.id === plan.id) {
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Erreur', 'Vous devez être connecté pour souscrire à un abonnement.');
        return;
      }

      // Appeler la fonction PayDunya pour créer le paiement
      const { data, error } = await supabase.functions.invoke('create-payment', {
        body: {
          amount: plan.price_monthly,
          paymentMethod: 'paydunya',
          paymentType: plan.name.startsWith('avicoins_') ? 'avicoins_purchase' : 'subscription',
          referenceType: 'subscription_plan',
          referenceId: plan.id,
          description: `${plan.display_name} - ${plan.price_monthly} CFA`,
          userId: user.id
        }
      });

      if (error) {
        console.error('Erreur PayDunya:', error);
        Alert.alert('Erreur', 'Impossible de créer le paiement. Veuillez réessayer.');
        return;
      }

      if (data?.payment_url) {
        // Ouvrir PayDunya dans le navigateur
        await Linking.openURL(data.payment_url);
      } else {
        Alert.alert('Erreur', 'URL de paiement non reçue.');
      }

    } catch (error: any) {
      console.error('Erreur lors de la souscription:', error);
      Alert.alert('Erreur', 'Impossible de traiter votre demande. Veuillez réessayer.');
    }
  };
  */

  /*
  const handlePaymentSuccess = async () => {
    await refreshSubscription();

    if (selectedPlan?.name.startsWith('avicoins_')) {
      const avicoinsAmount = selectedPlan.features.avicoins_amount;
      Alert.alert('Succès', `Vous avez reçu ${avicoinsAmount} Avicoins !`);

      const { DeviceEventEmitter } = require('react-native');
      DeviceEventEmitter.emit('refreshAvicoins');
    }

    setShowPaymentModal(false);
    setSelectedPlan(null);
  };

  const handlePaymentError = (error: string) => {
    Alert.alert('Erreur de paiement', error);
    setShowPaymentModal(false);
    setSelectedPlan(null);
  };
  */

  const getPlanIcon = (planName: string) => {
    switch (planName) {
      case 'freemium': return 'card-outline';
      case 'premium': return 'flash-outline';
      case 'pro': return 'diamond-outline';
      case 'avicoins_25':
      case 'avicoins_50':
      case 'avicoins_100': return 'cash-outline';
      default: return 'help-circle';
    }
  };

  const getPlanColor = (planName: string) => {
    switch (planName) {
      case 'freemium': return colors.primary;
      case 'premium': return colors.success;
      case 'pro': return colors.accentSecondary;
      case 'avicoins_25':
      case 'avicoins_50':
      case 'avicoins_100': return colors.warning;
      default: return colors.textSecondary;
    }
  };

  const renderFeature = (feature: string, value: any, plan: SubscriptionPlan) => {
    let displayValue = '';
    let icon = 'checkmark-circle-outline';
    let iconColor = colors.success;

    // Si la fonctionnalité n'est pas définie ou est fausse (et n'est pas un quota 0), on ne l'affiche pas
    if (value === undefined || value === false) {
      return null;
    }

    switch (feature) {
      // --- GESTION DES QUOTAS ---
      case 'ai_analyses_per_month':
        if (value === -1) displayValue = 'Analyses IA illimitées';
        else if (value === 0) return null;
        else displayValue = `${value} analyses IA/mois`;
        break;
      case 'max_lots':
        if (value === -1) displayValue = 'Lots illimités';
        else displayValue = `Jusqu'à ${value} lot${value > 1 ? 's' : ''}`;
        break;

      // --- GESTION DES FONCTIONNALITÉS PREMIUM/PRO ---
      case 'auto_feeding': displayValue = 'Rations automatiques IA'; break;
      case 'advanced_feeding': displayValue = 'Analyses IA (Stock & Finance)'; break;
      case 'optimized_feeding': displayValue = 'Optimisation des coûts IA'; break;
      case 'product_recommendations': displayValue = 'Recommandations de produits'; break;
      case 'prophylaxy': displayValue = 'Accès à la prophylaxie médicale'; break;
      case 'full_history': displayValue = 'Historique complet'; break;
      case 'sell_on_marketplace': displayValue = 'Vendre sur la marketplace'; break;
      case 'export_reports': displayValue = 'Export de rapports'; break;
      case 'advanced_alerts': displayValue = 'Alertes avancées'; break;
      case 'delivery_discount': displayValue = `Réduction sur la livraison`; break;
      case 'delivery_free': displayValue = 'Livraison gratuite'; break;
      case 'product_discount': displayValue = `Réduction sur les produits`; break;
      case 'priority_support': displayValue = 'Support prioritaire'; break;
      case 'dedicated_support': displayValue = 'Support dédié'; break;

      // --- GESTION DES AVICOINS ---
      case 'avicoins_amount': displayValue = `${value} Avicoins`; break;
      case 'avicoins_allowed': displayValue = 'Paiement à l\'usage avec Avicoins'; break;

      // Les coûts ne sont pas des "features" à afficher, donc on les ignore
      case 'ai_analysis_cost':
      default: return null; // Ignorer les clés inconnues ou non destinées à l'affichage
    }

    return (
      <View key={feature} style={styles.featureItem}>
        <Icon name={icon} size={16} color={iconColor} />
        <Text style={styles.featureText}>{displayValue}</Text>
      </View>
    );
  };

  const renderPlanCard = (plan: SubscriptionPlan) => {
    const isCurrentPlan = currentSubscription?.plan?.id === plan.id;
    const planColor = getPlanColor(plan.name);

    return (
      <View key={plan.id} style={[styles.planCard, isCurrentPlan && { borderColor: planColor, borderWidth: 2 }]}>
        {isCurrentPlan && (
          <View style={[styles.currentPlanBadge, { backgroundColor: planColor }]}>
            <Text style={styles.currentPlanText}>ACTIF</Text>
          </View>
        )}

        <View style={styles.planHeader}>
          <View style={[styles.planIcon, { backgroundColor: planColor + '20' }]}>
            <Icon name={getPlanIcon(plan.name)} size={32} color={planColor} />
          </View>
          <View style={styles.planInfo}>
            <Text style={styles.planName}>{plan.display_name}</Text>
            <Text style={styles.planDescription}>{plan.description}</Text>
          </View>
        </View>

        <View style={styles.planPricing}>
          {plan.price_monthly === 0 ? (
            <Text style={[styles.planPrice, { color: planColor }]}>GRATUIT</Text>
          ) : (
            <>
              <Text style={[styles.planPrice, { color: planColor }]}>
                {plan.price_monthly.toLocaleString()} CFA
              </Text>
              <Text style={styles.planPeriod}>{plan.name.startsWith('avicoins_') ? 'unique' : '/mois'}</Text>
            </>
          )}
        </View>

        <View style={styles.planFeatures}>
          {Object.entries(plan.features).map(([feature, value]) =>
            renderFeature(feature, value, plan)
          )}
        </View>

        <TouchableOpacity
          style={[styles.subscribeButton, { backgroundColor: planColor }, isCurrentPlan && styles.currentPlanButton]}
          onPress={() => handleSubscribe(plan)}
          disabled={isCurrentPlan}
        >
          <Text style={styles.subscribeButtonText}>
            {isCurrentPlan ? 'Plan Actif' :
              plan.price_monthly === 0 ? 'Activé' :
                plan.name.startsWith('avicoins_') ? 'Acheter' : 'Souscrire'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  if (subscriptionLoading) {
    return (
      <SafeAreaView style={commonStyles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Chargement des abonnements...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={commonStyles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Icon name="arrow-back-outline" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Abonnements & Avicoins</Text>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <Text style={styles.title}>Choisissez votre plan</Text>
          <Text style={styles.subtitle}>
            Débloquez tout le potentiel d'Aviprod avec nos offres adaptées.
          </Text>
          <View style={styles.plansContainer}>
            {plans.filter(p => !p.name.startsWith('avicoins_')).map(renderPlanCard)}
          </View>

          <Text style={styles.title}>Acheter des Avicoins</Text>
          <Text style={styles.subtitle}>
            Utilisez les Avicoins pour accéder aux fonctionnalités premium à la carte.
          </Text>
          <View style={styles.plansContainer}>
            {plans.filter(p => p.name.startsWith('avicoins_')).map(renderPlanCard)}
          </View>

          <View style={styles.infoSection}>
            <Text style={styles.infoTitle}>💡 Informations importantes</Text>
            <Text style={styles.infoText}>
              • Les abonnements sont renouvelés automatiquement chaque mois.{'\n'}
              • Vous pouvez changer ou annuler votre plan à tout moment.{'\n'}
              • Les Avicoins achetés ne sont pas remboursables.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/*
      {selectedPlan && (
        <PaymentModal
          isVisible={showPaymentModal}
          onClose={() => {
            setShowPaymentModal(false);
            setSelectedPlan(null);
          }}
          amount={selectedPlan.price_monthly}
          description={`Abonnement ${selectedPlan.display_name} - ${selectedPlan.price_monthly} CFA/mois`}
          paymentType="subscription"
          referenceType="subscription_plan"
          referenceId={selectedPlan.id}
          onSuccess={handlePaymentSuccess}
          onError={handlePaymentError}
        />
      )}
      */}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
    marginTop: 16,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  plansContainer: {
    gap: 20,
    marginBottom: 32,
  },
  planCard: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.border,
    position: 'relative',
  },
  currentPlanBadge: {
    position: 'absolute',
    top: -12,
    right: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  currentPlanText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.white,
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  planIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  planInfo: {
    flex: 1,
  },
  planName: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  planDescription: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  planPricing: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 20,
  },
  planPrice: {
    fontSize: 32,
    fontWeight: '800',
  },
  planPeriod: {
    fontSize: 16,
    color: colors.textSecondary,
    marginLeft: 4,
  },
  planFeatures: {
    marginBottom: 24,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  featureText: {
    fontSize: 14,
    color: colors.text,
    marginLeft: 8,
    flex: 1,
  },
  subscribeButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  currentPlanButton: {
    opacity: 0.6,
  },
  subscribeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
  infoSection: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: colors.textSecondary,
  },
});