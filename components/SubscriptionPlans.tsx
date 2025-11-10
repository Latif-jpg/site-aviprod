import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, commonStyles } from '../styles/commonStyles';
import Icon from './Icon'; // Importation correcte
import { supabase } from '../config'; // Import supabase directly
import { router } from 'expo-router';
import { usePayments } from '../hooks/usePayments';
import PaymentModal from './PaymentModal';

// --- NOUVEAU : Import du hook d'abonnement ---
import { useSubscription } from '../contexts/SubscriptionContext';

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
  };
}

export default function SubscriptionPlans() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const { processSubscriptionPayment, isProcessing } = usePayments();

  // --- NOUVEAU : Utilisation du hook pour gérer l'état de l'abonnement ---
  const { subscription: currentSubscription, loading: subscriptionLoading, refreshSubscription } = useSubscription();

  useEffect(() => {
    const initialLoad = async () => {
      try {
        setIsLoading(true);
        await loadPlans();
      } catch (error: any) {
        console.error('❌ Error loading subscription data:', error);
        Alert.alert('Erreur', 'Impossible de charger les données d\'abonnement');
      } finally {
        setIsLoading(false);
      }
    };
    initialLoad();
  }, []);
  
  const loadPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('price_monthly', { ascending: true });

      if (error) throw error;
      setPlans(data || []);
    } catch (error: any) {
      console.error('❌ Error loading plans:', error);
    }
  };

  const handleSubscribe = async (plan: SubscriptionPlan) => {
    if (plan.name === 'freemium') {
      Alert.alert('Freemium', 'Le plan Freemium est gratuit et activé par défaut.');
      return;
    }

    // Handle Avicoins purchases differently
    if (plan.name.startsWith('avicoins_')) {
      setSelectedPlan(plan);
      setShowPaymentModal(true);
      return;
    }

    // Open payment modal instead of confirmation alert
    setSelectedPlan(plan);
    setShowPaymentModal(true);
  };

  const handlePaymentSuccess = async () => {
    // --- NOUVEAU : Rafraîchir l'état de l'abonnement après un paiement réussi ---
    await refreshSubscription();

    // Show success message for Avicoins purchase
    if (selectedPlan?.name.startsWith('avicoins_')) {
      const avicoinsAmount = selectedPlan.features.avicoins_amount;
      Alert.alert('Succès', `Vous avez reçu ${avicoinsAmount} Avicoins !`);

      // Rafraîchir le solde Avicoins sur le dashboard
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

  const getPlanIcon = (planName: string) => {
    switch (planName) {
      case 'freemium': return 'gift';
      case 'premium': return 'rocket';
      case 'pro': return 'diamond';
      case 'avicoins_25':
      case 'avicoins_50':
      case 'avicoins_100': return 'cash';
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
    let icon = 'checkmark-circle';
    let iconColor = colors.success;

    switch (feature) {
      case 'ai_analyses_per_month':
        if (value === -1) displayValue = 'Analyses IA illimitées';
        else if (value === 0) displayValue = 'Analyses IA non incluses';
        else displayValue = `${value} analyses IA/mois`;
        break;
      case 'max_lots':
        if (value === -1) displayValue = 'Lots illimités';
        else displayValue = `Jusqu'à ${value} lot${value > 1 ? 's' : ''}`;
        break;
      case 'auto_feeding':
        displayValue = 'Rations automatiques';
        break;
      case 'advanced_feeding':
        displayValue = 'Rations avancées';
        break;
      case 'optimized_feeding':
        displayValue = 'Rations optimisées';
        break;
      case 'product_recommendations':
        if (value === -1) displayValue = 'Recommandations illimitées';
        else if (value === 0) displayValue = 'Recommandations non incluses';
        else displayValue = `${value} recommandation${value > 1 ? 's' : ''}/mois`;
        break;
      case 'full_history':
        displayValue = 'Historique complet';
        break;
      case 'sell_on_marketplace':
        if (value === -1) displayValue = 'Ventes illimitées';
        else if (value === 0) displayValue = 'Ventes non autorisées';
        else displayValue = `${value} vente${value > 1 ? 's' : ''}/mois`;
        break;
      case 'export_reports':
        displayValue = 'Export de rapports';
        break;
      case 'advanced_alerts':
        displayValue = 'Alertes avancées';
        break;
      case 'delivery_discount':
        displayValue = `-${value * 100}% livraison`;
        break;
      case 'delivery_free':
        displayValue = 'Livraison gratuite';
        break;
      case 'product_discount':
        displayValue = `-${value * 100}% produits`;
        break;
      case 'priority_support':
        displayValue = 'Support prioritaire';
        break;
      case 'dedicated_support':
        displayValue = 'Support dédié';
        break;
      case 'avicoins_amount':
        displayValue = `${value} Avicoins`;
        break;
      case 'ai_analysis_cost':
        displayValue = `${value} Avicoins par analyse IA`;
        break;
      case 'auto_feeding_cost':
        displayValue = `${value} Avicoins par ration auto`;
        break;
      case 'premium_feature_cost':
        displayValue = `${value} Avicoins par fonction premium`;
        break;
      case 'pro_feature_cost':
        displayValue = `${value} Avicoins par fonction pro`;
        break;
      default:
        return null;
    }

    // Vérifier si la fonctionnalité est disponible dans ce plan
    if (!plan.features[feature as keyof typeof plan.features]) {
      icon = 'close-circle';
      iconColor = colors.error;
      displayValue += ' (non inclus)';
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
      <View key={plan.id} style={[styles.planCard, isCurrentPlan && styles.currentPlanCard]}>
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
          ) : plan.name.startsWith('avicoins_') ? (
            <>
              <Text style={[styles.planPrice, { color: planColor }]}>
                {plan.price_monthly.toLocaleString()} CFA
              </Text>
              <Text style={styles.planPeriod}>unique</Text>
            </>
          ) : (
            <>
              <Text style={[styles.planPrice, { color: planColor }]}>
                {plan.price_monthly.toLocaleString()} CFA
              </Text>
              <Text style={styles.planPeriod}>/mois</Text>
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
          disabled={isCurrentPlan || isProcessing}
        >
          {isProcessing ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <Text style={styles.subscribeButtonText}>
              {isCurrentPlan ? 'Plan Actif' :
               plan.price_monthly === 0 ? 'Activé' :
               plan.name.startsWith('avicoins_') ? 'Acheter' : 'Souscrire'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  if (isLoading || subscriptionLoading) {
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
          <Icon name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Abonnements</Text>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <Text style={styles.title}>Choisissez votre plan</Text>
          <Text style={styles.subtitle}>
            Débloquez tout le potentiel d'Aviprod avec nos offres adaptées à vos besoins
          </Text>

          <View style={styles.plansContainer}>
            {plans.map(renderPlanCard)}
          </View>

          <View style={styles.infoSection}>
            <Text style={styles.infoTitle}>💡 Informations importantes</Text>
            <Text style={styles.infoText}>
              • Les abonnements sont renouvelés automatiquement chaque mois{'\n'}
              • Vous pouvez changer de plan à tout moment{'\n'}
              • Annulation possible à tout moment{'\n'}
              • Support technique inclus selon le plan
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Payment Modal */}
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
  currentPlanCard: {
    borderColor: colors.primary,
    borderWidth: 2,
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