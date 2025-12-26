// Cache-busting comment
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Dimensions, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../styles/commonStyles';
import SimpleBottomSheet from '../components/BottomSheet';
import { router } from 'expo-router'; // Importation correcte
import { supabase } from '../config'; // Import supabase directly
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from '../components/Icon';
import BottomNavigation from '../components/BottomNavigation';
import ManualRationForm from '../components/ManualRationForm';
import RationAdvisorDashboard from '../src/intelligence/ui/RationAdvisorDashboard';

const { width } = Dimensions.get('window');

interface Lot {
  id: string;
  name: string;
  breed: string;
  quantity: number;
  age: number;
  poids_moyen: number;
  status: string;
  bird_type?: string;
}

interface CustomFeedRation {
  id: string;
  user_id: string;
  lot_id?: string;
  name: string;
  daily_consumption_per_bird_grams: number;
  protein_percentage: number;
  energy_kcal: number;
  notes?: string;
  created_at: string;
}

interface LotAssignment {
  lot_id: string;
  stock_item_id: string;
  daily_quantity_per_bird: number;
}

const LotCardSkeleton = () => {
  // Simple skeleton without animation for now
  return (
    <View style={styles.lotCard}>
      <View style={{ backgroundColor: '#e0e0e0', height: 24, width: '40%', borderRadius: 4, marginBottom: 16 }} />
      <View style={styles.lotStatsGrid}>
        <View style={[styles.statItem, {backgroundColor: '#f0f0f0'}]} />
        <View style={[styles.statItem, {backgroundColor: '#f0f0f0'}]} />
        <View style={[styles.statItem, {backgroundColor: '#f0f0f0'}]} />
      </View>
      <View style={{ backgroundColor: '#f0f0f0', height: 100, borderRadius: 16, marginBottom: 16 }} />
      <View style={styles.actionButtons}>
        <View style={{ backgroundColor: '#e0e0e0', flex: 1, height: 48, borderRadius: 12 }} />
        <View style={{ backgroundColor: '#e0e0e0', flex: 1, height: 48, borderRadius: 12 }} />
      </View>
    </View>
  );
};

interface UserSubscription {
  subscription_type: string;
  features: {
    automatic_ration: boolean;
    ai_health: boolean;
  };
  expires_at: string | null;
}

export default function FeedingScreen() {
  const [lots, setLots] = useState<Lot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedLot, setSelectedLot] = useState<Lot | null>(null);
  const [calculatedRation, setCalculatedRation] = useState<any>(null);
  const [showRationModal, setShowRationModal] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [showManualForm, setShowManualForm] = useState(false);
  const [showRationAdvisor, setShowRationAdvisor] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [userSubscription, setUserSubscription] = useState<UserSubscription | null>(null);
  const [lotRations, setLotRations] = useState<{[lotId: string]: CustomFeedRation | null}>({});
  const [lotAssignments, setLotAssignments] = useState<{[lotId: string]: LotAssignment | null}>({});

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (lots.length > 0) {
      loadLotRations();
      loadLotAssignments();
    }
  }, [lots]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      await Promise.all([
        loadUserSubscription(),
        loadLots(),
        loadLotAssignments(),
      ]);
    } catch (error: any) {
      console.error('❌ Error loading data:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadData();
  };

  const loadUserSubscription = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) return;

      setCurrentUserId(user.id);

      const { data, error } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      setUserSubscription(data);
    } catch (error: any) {
      console.error('❌ Error loading subscription:', error);
    }
  };

  const loadLots = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setLots([]);
        return;
      }

      const { data, error } = await supabase
        .from('lots')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // --- CORRECTION : Calcul de l\'âge dynamique ---
      const lotsWithDynamicAge = (data || []).map(lot => {
        const entryDate = new Date(lot.entry_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        entryDate.setHours(0, 0, 0, 0);

        const daysOnFarm = Math.floor((today.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24));
        const dynamicAge = (lot.age || 0) + daysOnFarm;

        return { ...lot, age: dynamicAge };
      });

      setLots(lotsWithDynamicAge);
    } catch (error: any) {
      console.error('❌ Error loading lots:', error);
      Alert.alert('❌ Erreur', 'Impossible de charger les lots');
    }
  };

  const loadLotRations = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) return;

      const { data, error } = await supabase
        .from('custom_feed_rations')
        .select('*')
        .eq('user_id', user.id)
        .not('lot_id', 'is', null)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const rationsByLot: {[lotId: string]: CustomFeedRation | null} = {};
      lots.forEach(lot => {
        rationsByLot[lot.id] = null;
      });

      data?.forEach((ration: CustomFeedRation) => {
        if (ration.lot_id && !rationsByLot[ration.lot_id]) {
          rationsByLot[ration.lot_id] = ration;
        }
      });

      setLotRations(rationsByLot);
    } catch (error: any) {
      console.error('❌ Error loading lot rations:', error);
    }
  };

  const loadLotAssignments = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('lot_stock_assignments')
        .select('lot_id, stock_item_id, daily_quantity_per_bird')
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (error) throw error;

      const assignmentsByLot: {[lotId: string]: LotAssignment | null} = {};
      lots.forEach(lot => {
        assignmentsByLot[lot.id] = null;
      });

      data?.forEach((assignment: LotAssignment) => {
        if (assignment.lot_id) {
          assignmentsByLot[assignment.lot_id] = assignment;
        }
      });

      setLotAssignments(assignmentsByLot);
    } catch (error: any) {
      console.error('❌ Error loading lot assignments:', error);
    }
  };

  const hasAutomaticRationAccess = (): boolean => {
    return true; // Temporarily enabled for testing
  };

  const refreshLotRations = () => {
    loadLotRations();
  };

  const handleUpgradeToPremium = () => {
    setShowPremiumModal(false);
    Alert.alert(
      '🌟 Passer à Premium',
      'Contactez-nous pour débloquer toutes les fonctionnalités avancées.',
      [
        { text: 'Plus tard', style: 'cancel' },
        { text: 'Contacter', onPress: () => console.log('Contact support') }
      ]
    );
  };

  // Analytics calculation
  const analytics = {
    totalBirds: lots.reduce((sum, l) => sum + l.quantity, 0),
    totalDailyFeed: lots.reduce((sum, l) => {
      const ration = lotRations[l.id];
      return sum + (ration ? ration.daily_consumption_per_bird_grams * l.quantity : 0);
    }, 0),
    averageFeedPerBird: lots.length > 0 ?
      lots.reduce((sum, l) => {
        const ration = lotRations[l.id];
        return sum + (ration ? ration.daily_consumption_per_bird_grams : 0);
      }, 0) / lots.length : 0,
    rationedLots: Object.values(lotRations).filter(r => r !== null).length,
  };

  // AI Insights
  const getAIInsights = () => {
    const insights = [];

    // Feed efficiency alert
    if (analytics.averageFeedPerBird > 120) {
      insights.push({
        type: 'warning',
        title: 'Surconsommation Détectée',
        description: `Moyenne: ${analytics.averageFeedPerBird.toFixed(0)}g/oiseau/jour`,
        action: 'Vérifier la qualité de l\'aliment',
        icon: 'warning',
        confidence: 91
      });
    }

    // Cost optimization
    const dailyCostEstimate = (analytics.totalDailyFeed / 1000) * 250; // 250 FCFA/kg estimate
    if (dailyCostEstimate > 5000) {
      insights.push({
        type: 'info',
        title: 'Optimisation des Coûts',
        description: `Coût quotidien estimé: ${dailyCostEstimate.toFixed(0)} FCFA`,
        action: 'Analyser les fournisseurs alternatifs',
        icon: 'cash',
        confidence: 87
      });
    }

    // Ration coverage
    if (analytics.rationedLots < lots.length) {
      insights.push({
        type: 'critical',
        title: 'Alimentation Manquante',
        description: `${lots.length - analytics.rationedLots} lot(s) sans alimentation`,
        action: "Configurer l'alimentation manquante",
        icon: 'alert-circle',
        confidence: 95
      });
    }

    // Good practice
    if (analytics.rationedLots === lots.length && analytics.averageFeedPerBird <= 120) {
      insights.push({
        type: 'success',
        title: 'Gestion Optimale',
        description: 'Tous vos lots ont une alimentation configurée',
        action: 'Continuez cette bonne pratique',
        icon: 'checkmark-circle',
        confidence: 98
      });
    }

    return insights;
  };

  const renderAnalyticsCards = () => (
    <View style={styles.analyticsContainer}>
      <View style={styles.analyticsRow}>
        <View style={[styles.analyticsCard, { backgroundColor: '#3b82f6' }]}>
          <View style={styles.analyticsIcon}>
            <Icon name="nutrition" size={24} color="#fff" />
          </View>
          <Text style={styles.analyticsValue}>{(analytics.totalDailyFeed / 1000).toFixed(1)} kg</Text>
          <Text style={styles.analyticsLabel}>Aliment/Jour</Text>
        </View>

        <View style={[styles.analyticsCard, { backgroundColor: '#10b981' }]}>
          <View style={styles.analyticsIcon}>
            <Icon name="speedometer" size={24} color="#fff" />
          </View>
          <Text style={styles.analyticsValue}>{analytics.averageFeedPerBird.toFixed(0)}g</Text>
          <Text style={styles.analyticsLabel}>Moy/Oiseau</Text>
        </View>
      </View>

      <View style={styles.analyticsRow}>
        <View style={[styles.analyticsCard, { backgroundColor: '#f59e0b' }]}>
          <View style={styles.analyticsIcon}>
            <Icon name="layers" size={24} color="#fff" />
          </View>
          <Text style={styles.analyticsValue}>{analytics.totalBirds}</Text>
          <Text style={styles.analyticsLabel}>Total Oiseaux</Text>
        </View>

        <View style={[styles.analyticsCard, { backgroundColor: '#8b5cf6' }]}>
          <View style={styles.analyticsIcon}>
            <Icon name="checkmark-circle" size={24} color="#fff" />
          </View>
          <Text style={styles.analyticsValue}>{analytics.rationedLots}/{lots.length}</Text>
          <Text style={styles.analyticsLabel}>Alim. Config.</Text>
        </View>
      </View>
    </View>
  );

  const renderAIInsights = () => {
    const insights = getAIInsights();
    if (insights.length === 0) return null;

    return (
      <View style={styles.insightsContainer}>
        <View style={styles.insightsHeader}>
          <View style={styles.insightsIconContainer}>
            <Icon name="bulb" size={20} color="#fff" />
          </View>
          <Text style={styles.insightsTitle}>Recommandations IA</Text>
          <View style={styles.liveIndicator}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>Live</Text>
          </View>
        </View>

        {insights.map((insight, index) => (
          <View key={index} style={[
            styles.insightCard,
            insight.type === 'critical' && styles.insightCritical,
            insight.type === 'warning' && styles.insightWarning,
            insight.type === 'success' && styles.insightSuccess,
            insight.type === 'info' && styles.insightInfo,
          ]}>
            <View style={styles.insightHeader}>
              <Icon name={insight.icon as any} size={22} color={
                insight.type === 'critical' ? '#ef4444' :
                insight.type === 'warning' ? '#f59e0b' :
                insight.type === 'success' ? '#10b981' : '#3b82f6'
              } />
              <View style={styles.insightContent}>
                <Text style={styles.insightTitle}>{insight.title}</Text>
                <Text style={styles.insightDescription}>{insight.description}</Text>
              </View>
            </View>
            <View style={styles.insightFooter}>
              <Text style={styles.insightAction}>💡 {insight.action}</Text>
              <View style={styles.confidenceContainer}>
                <View style={styles.confidenceBar}>
                  <View style={[styles.confidenceFill, { width: `${insight.confidence}%` }]} />
                </View>
                <Text style={styles.confidenceText}>{insight.confidence}%</Text>
              </View>
            </View>
          </View>
        ))}
      </View>
    );
  };

  const renderLotCard = (lot: Lot) => {
    if (!lot) return null;

    const lotName = lot.name || 'Lot sans nom';
    const lotQuantity = lot.quantity || 0;
    const lotAge = lot.age || 0;
    const lotWeight = lot.poids_moyen || 0;
    const lotBreed = lot.breed || 'Non spécifié';
    const currentAssignment = lotAssignments[lot.id];
    const currentRation = lotRations[lot.id];

    return (
      <View key={lot.id} style={styles.lotCard}>
        <View style={styles.lotHeader}>
          <View style={styles.lotTitleContainer}>
            <Text style={styles.lotName}>{lotName}</Text>
            <Text style={styles.lotBreed}>🐔 {lotBreed}</Text>
          </View>
          {hasAutomaticRationAccess() && (
            <View style={styles.premiumBadge}>
              <Text style={styles.premiumBadgeText}>⭐ Pro</Text>
            </View>
          )}
        </View>

        <View style={styles.lotStatsGrid}>
          <View style={styles.statItem}>
            <View style={styles.statIcon}>
              <Icon name="layers" size={18} color="#3b82f6" />
            </View>
            <Text style={styles.statValue}>{lotQuantity}</Text>
            <Text style={styles.statLabel}>Oiseaux</Text>
          </View>

          <View style={styles.statItem}>
            <View style={styles.statIcon}>
              <Icon name="calendar" size={18} color="#10b981" />
            </View>
            <Text style={styles.statValue}>{lotAge}j</Text>
            <Text style={styles.statLabel}>Âge</Text>
          </View>

          <View style={styles.statItem}>
            <View style={styles.statIcon}>
              <Icon name="speedometer" size={18} color="#f59e0b" />
            </View>
            <Text style={styles.statValue}>{lotWeight}g</Text>
            <Text style={styles.statLabel}>Poids Moy.</Text>
          </View>
        </View>

        {(currentAssignment || currentRation) && (
          <View style={[styles.currentRation, { backgroundColor: '#10b98110', borderColor: '#10b98130' }]}>
            <View style={styles.rationBadge}>
              <Icon name="checkmark-circle" size={16} color="#10b981" />
              <Text style={styles.rationBadgeText}>Alimentation Active</Text>
            </View>
            <Text style={styles.currentRationName}>{currentRation?.name || 'Alimentation assignée via le stock'}</Text>
            <View style={styles.rationDetails}>
              <View style={styles.rationDetailItem}>
                <Text style={styles.rationDetailLabel}>Protéines</Text> 
                <Text style={styles.rationDetailValue}>{currentRation?.protein_percentage || 'N/A'}%</Text>
              </View>
              <View style={styles.rationDetailItem}>
                <Text style={styles.rationDetailLabel}>Énergie</Text>
                <Text style={styles.rationDetailValue}>{currentRation?.energy_kcal || 'N/A'} kcal</Text>
              </View>
              <View style={styles.rationDetailItem}>
                <Text style={styles.rationDetailLabel}>Par oiseau</Text>
                <Text style={styles.rationDetailValue}>
                  {currentAssignment ? (currentAssignment.daily_quantity_per_bird * 1000).toFixed(0) : currentRation?.daily_consumption_per_bird_grams || 0}g/j
                </Text>
              </View>
            </View>
            <View style={styles.totalDailyContainer}>
              <Text style={styles.totalDailyLabel}>Total journalier</Text>
              <Text style={styles.totalDailyValue}>
                {currentAssignment 
                  ? (currentAssignment.daily_quantity_per_bird * lotQuantity).toFixed(2) 
                  : ((currentRation?.daily_consumption_per_bird_grams || 0) * lotQuantity / 1000).toFixed(2)} kg
              </Text>
            </View>
          </View>
        )}

        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.autoButton}
            onPress={() => {
              setSelectedLot(lot);
              if (hasAutomaticRationAccess()) {
                setShowRationAdvisor(true);
              } else {
                setShowPremiumModal(true);
              }
            }}
          >
            <View style={[styles.buttonGradient, { backgroundColor: '#3b82f6' }]}>
              <Icon name="flash" size={18} color="#fff" />
              <Text style={styles.buttonText}>Auto</Text>
            </View>
          </TouchableOpacity>
  
          <TouchableOpacity
            style={styles.manualButton}
            onPress={() => {
              setSelectedLot(lot);
              setShowManualForm(true);
            }}
          >
            <View style={[styles.buttonGradient, { backgroundColor: '#10b981' }]}>
              <Icon name="create" size={18} color="#fff" />
              <Text style={styles.buttonText}>Manuel</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderPremiumModal = () => (
    <View style={styles.premiumModalContent}>
      <View style={[styles.premiumHeader, { backgroundColor: '#f59e0b' }]}>
        <Text style={styles.premiumIcon}>⭐</Text>
        <Text style={styles.premiumTitle}>Fonctionnalité Premium</Text>
      </View>

      <View style={styles.premiumBody}>
        <Text style={styles.premiumDescription}>
          Débloquez le calcul automatique de l\'alimentation avec l\'IA et accédez à :
        </Text>

        <View style={styles.premiumFeatures}>
          {[
            { icon: 'flash', text: 'Calcul automatique IA' },
            { icon: 'analytics', text: 'Recommandations personnalisées' },
            { icon: 'trending-up', text: 'Suivi consommation avancé' },
            { icon: 'sparkles', text: 'Optimisation des coûts' },
          ].map((feature, index) => (
            <View key={index} style={styles.premiumFeature}>
              <View style={styles.featureIconContainer}>
                <Icon name={feature.icon as any} size={20} color="#10b981" />
              </View>
              <Text style={styles.premiumFeatureText}>{feature.text}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity onPress={handleUpgradeToPremium}>
          <View style={[styles.upgradeButton, { backgroundColor: '#f59e0b' }]}>
            <Icon name="star" size={20} color="#fff" />
            <Text style={styles.upgradeButtonText}>Passer à Premium</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.manualAccessButton}
          onPress={() => {
            setShowPremiumModal(false);
            setShowManualForm(true);
          }}
        >
          <Text style={styles.manualAccessText}>Saisir manuellement (Gratuit)</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <LinearGradient
          colors={['#1e293b', '#0f172a']}
          style={styles.header}
        >
          <View style={styles.headerContent}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.replace('/dashboard')}
            >
              <Icon name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <View>
              <Text style={styles.headerTitle}>Alimentation</Text>
              <Text style={styles.headerSubtitle}>Gestion intelligente de l\'alimentation</Text>
            </View>
          </View>
        </LinearGradient>
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            {/* Skeleton for analytics cards */}
            <View style={styles.analyticsContainer}>
              <View style={styles.analyticsRow}>
                <View style={[styles.analyticsCard, { backgroundColor: '#e0e0e0' }]} />
                <View style={[styles.analyticsCard, { backgroundColor: '#e0e0e0' }]} />
              </View>
              <View style={styles.analyticsRow}>
                <View style={[styles.analyticsCard, { backgroundColor: '#e0e0e0' }]} />
                <View style={[styles.analyticsCard, { backgroundColor: '#e0e0e0' }]} />
              </View>
            </View>
            {/* Skeleton for AI insights */}
            <View style={[styles.insightsContainer, { backgroundColor: '#e0e0e0', height: 150, marginBottom: 20 }]} />
            
            {/* Skeleton for AI advisor button */}
            <View style={[styles.aiAdvisorButton, { backgroundColor: '#e0e0e0', height: 80, borderRadius: 20, overflow: 'hidden' }]} />

            <Text style={styles.sectionTitle}>Lots Actifs</Text>
            {[1, 2].map((i) => <LotCardSkeleton key={`skeleton-${i}`} />)}
          </View>
        </ScrollView>
        <BottomNavigation />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient
        colors={['#1e293b', '#0f172a']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.replace('/dashboard')}
          >
            <Icon name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>Alimentation</Text>
            <Text style={styles.headerSubtitle}>Gestion intelligente de l\'alimentation</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor="#3b82f6"
          />
        }
      >
        <View style={styles.content}>
          {renderAnalyticsCards()}
          {renderAIInsights()}

          <Text style={styles.sectionTitle}>Lots Actifs</Text>
          {lots.length === 0 ? (
            <View style={styles.emptyState}>
              <LinearGradient
                colors={['#3b82f620', '#2563eb20']}
                style={styles.emptyIconContainer}
              >
                <Icon name="nutrition" size={48} color="#3b82f6" />
              </LinearGradient>
              <Text style={styles.emptyStateTitle}>Aucun lot actif</Text>
              <Text style={styles.emptyStateText}>
                Ajoutez des lots pour configurer l\'alimentation
              </Text>
            </View>
          ) : (
            lots.map(renderLotCard)
          )}
        </View>
      </ScrollView>

      <BottomNavigation />

      <SimpleBottomSheet isVisible={showPremiumModal} onClose={() => setShowPremiumModal(false)}>
        {renderPremiumModal()}
      </SimpleBottomSheet>

      <SimpleBottomSheet
        isVisible={showManualForm}
        onClose={() => setShowManualForm(false)}
      >
        <ManualRationForm />
      </SimpleBottomSheet>

      {/* Ce BottomSheet est maintenant utilisé par le bouton "Auto" de chaque lot */}
      <SimpleBottomSheet
        isVisible={showRationAdvisor}
        onClose={() => setShowRationAdvisor(false)}
      >
        {selectedLot && currentUserId && (
            <RationAdvisorDashboard
                lot={selectedLot}
                userId={currentUserId}
                onClose={() => setShowRationAdvisor(false)}
            />
        )}
      </SimpleBottomSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    paddingBottom: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 100,
  },
  analyticsContainer: {
    marginBottom: 20,
  },
  analyticsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  analyticsCard: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    minHeight: 110,
    justifyContent: 'center',
  },
  analyticsIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#ffffff30',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  analyticsValue: {
    fontSize: 28,
    fontWeight: '900',
    color: '#fff',
    marginBottom: 4,
  },
  analyticsLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffffdd',
  },
  insightsContainer: {
    backgroundColor: '#1e293b',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
  },
  insightsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  insightsIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  insightsTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#fff',
    flex: 1,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
  },
  liveText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#10b981',
  },
  insightCard: {
    backgroundColor: '#ffffff15',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
  },
  insightCritical: {
    borderLeftColor: '#ef4444',
  },
  insightWarning: {
    borderLeftColor: '#f59e0b',
  },
  insightSuccess: {
    borderLeftColor: '#10b981',
  },
  insightInfo: {
    borderLeftColor: '#3b82f6',
  },
  insightHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  insightContent: {
    marginLeft: 12,
    flex: 1,
  },
  insightTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  insightDescription: {
    fontSize: 13,
    color: '#94a3b8',
  },
  insightFooter: {
    marginTop: 8,
  },
  insightAction: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10b981',
    marginBottom: 8,
  },
  confidenceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  confidenceBar: {
    flex: 1,
    height: 6,
    backgroundColor: '#ffffff20',
    borderRadius: 3,
    overflow: 'hidden',
  },
  confidenceFill: {
    height: '100%',
    backgroundColor: '#10b981',
    borderRadius: 3,
  },
  confidenceText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1e293b',
    marginBottom: 16,
  },
  lotCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  lotHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  lotTitleContainer: {
    flex: 1,
  },
  lotName: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1e293b',
    marginBottom: 4,
  },
  lotBreed: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  premiumBadge: {
    backgroundColor: '#f59e0b',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  premiumBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  lotStatsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statItem: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1e293b',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },
  currentRation: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#10b98130',
  },
  rationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  rationBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#10b981',
  },
  currentRationName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 12,
  },
  rationDetails: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  rationDetailItem: {
    flex: 1,
    backgroundColor: '#ffffff80',
    borderRadius: 10,
    padding: 10,
  },
  rationDetailLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 4,
  },
  rationDetailValue: {
    fontSize: 15,
    fontWeight: '900',
    color: '#1e293b',
  },
  totalDailyContainer: {
    backgroundColor: '#10b98120',
    borderRadius: 10,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalDailyLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#059669',
  },
  totalDailyValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#059669',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  autoButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  manualButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 20,
  },
  emptyIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1e293b',
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 15,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 22,
  },
  premiumModalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    overflow: 'hidden',
  },
  premiumHeader: {
    padding: 24,
    alignItems: 'center',
  },
  premiumIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  premiumTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#fff',
  },
  premiumBody: {
    padding: 24,
  },
  premiumDescription: {
    fontSize: 15,
    color: '#64748b',
    lineHeight: 22,
    marginBottom: 20,
    textAlign: 'center',
  },
  premiumFeatures: {
    gap: 12,
    marginBottom: 24,
  },
  premiumFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 12,
  },
  featureIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#10b98120',
    alignItems: 'center',
    justifyContent: 'center',
  },
  premiumFeatureText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
    flex: 1,
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  upgradeButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
  },
  manualAccessButton: {
    marginTop: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  manualAccessText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748b',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#64748b',
    fontWeight: '600',
  },
  aiAdvisorButton: {
    marginBottom: 24,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  aiAdvisorGradient: {
    padding: 20,
  },
  aiAdvisorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  aiAdvisorText: {
    flex: 1,
  },
  aiAdvisorTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#fff',
    marginBottom: 2,
  },
  aiAdvisorSubtitle: {
    fontSize: 14,
    color: '#ffffffdd',
    fontWeight: '600',
  },
});