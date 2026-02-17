import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity, Dimensions, Alert, Animated, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
// NOTE: J'ai supposé que 'colors' et 'useThemeColors' existent et fournissent un fond clair (background)
import { colors, commonStyles, useThemeColors } from '../styles/commonStyles';
import { useData } from '../hooks/useData';
import { useAds } from '../hooks/useAds';
import FloatingActionButton from '../components/FloatingActionButton';
import { heuristicsModel } from '../lib/liveAI';
import BottomNavigation from '../components/BottomNavigation';
import Icon from '../components/Icon';
import BlinkingNotification from '../components/BlinkingNotification';
import { router, useFocusEffect } from 'expo-router';
import { supabase, getMarketplaceImageUrl, notificationSessionState } from '../config'; // --- CORRECTION : Importer depuis config.ts ---
import { useProfile } from '../contexts/ProfileContext'; // Import useProfile
import { useSubscription } from '../contexts/SubscriptionContext';
import { useNotifications } from '../components/NotificationContext';
import AviprodLogo from '../components/AviprodLogo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AdBanner from '../components/AdBanner';
import GoogleAdBanner from '../components/GoogleAdBanner';
import { useAuth } from '../hooks/useAuth';
import { marketingAgent, Product } from '../lib/marketingAgent'; // Import marketingAgent and Product type
import { Drawer } from 'react-native-drawer-layout';
import { useDataCollector } from '../src/hooks/useDataCollector';
import { useRewardedAd } from '../components/AdRewarded'; // --- AJOUT : Importer le hook de publicité récompensée ---
import { stockOptimizerAgent, OptimizationSuggestion } from '../src/intelligence/agents/StockOptimizerAgent'; // --- NOUVEAU : Importer l'agent d'optimisation ---
import { usePushNotifications } from '../hooks/usePushNotifications';
import * as Notifications from 'expo-notifications';
import * as Updates from 'expo-updates';

// --- IMPORTANT : Force l'affichage de la notification même si l'app est ouverte ---
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});


const getDefaultImageForCategory = (category: string | undefined) => {
  return 'https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?w=400&h=300&fit=crop';
};

// Définir les dimensions de l'écran pour les calculs de grille
const screenWidth = Dimensions.get('window').width;

// --- NOUVEAU : Composant pour les placeholders (Skeleton Loader) ---
const SkeletonPlaceholder = ({ width, height, style }: { width: number | string, height: number, style?: any }) => {
  const opacityAnim = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0.5,
          duration: 700,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [opacityAnim]);

  return <Animated.View style={[{ width, height, backgroundColor: colors.border, borderRadius: 8, opacity: opacityAnim }, style]} />;
};

const styles = StyleSheet.create({
  // --- Général ---
  scrollView: {
    flex: 1,
  },
  sectionContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },

  // --- Header ---
  header: {
    padding: 20,
    paddingBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    position: 'relative',
  },
  menuButton: {
    padding: 4,
  },
  pageTitle: {
    fontSize: 26, // Légèrement plus petit pour l'espace mobile
    fontWeight: 'bold',
    textAlign: 'center',
    flex: 1,
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },

  // --- Infos Utilisateur / Avicoins ---
  userInfoBlock: {
    paddingHorizontal: 20,
    paddingBottom: 10,
    marginTop: 0, // Rapprocher du header
  },
  userInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  userNameContainer: {
    flexDirection: 'column',
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  farmName: {
    fontSize: 14,
    fontWeight: '500',
  },
  subscriptionInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 6,
    borderRadius: 6,
    borderWidth: 1, // Bordure très fine pour délimiter le bloc d'infos
    backgroundColor: 'white',
  },
  avicoinsInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    // Rendre le fond des Avicoins moins flashy que l'original
    backgroundColor: colors.warning + '10',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  subscriptionInfoText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // --- Confirmation Block (Callout Notion) ---
  confirmationBlock: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    marginHorizontal: 20,
    marginBottom: 10,
    borderLeftWidth: 4,
    flexDirection: 'row',
    alignItems: 'center',
    // Styles minimalistes: PAS d'ombre forte
    borderWidth: 1,
  },
  confirmationEmoji: {
    fontSize: 18,
    marginRight: 10,
  },
  confirmationText: {
    fontSize: 14,
    flex: 1,
  },

  // --- Promo Block (Publicité Intégrée) ---
  promoBlock: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    marginHorizontal: 20,
    marginBottom: 20,
    borderLeftWidth: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
  },
  promoContent: {

  },
  promoTitle: {
    fontSize: 14, // Taille légèrement réduite pour le style Notion
    fontWeight: '600',
  },
  promoButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 4,
  },
  promoButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // --- Titre de Section (Aperçu Rapide / Fonctionnalités) ---
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    // Ajout d'une ligne de séparation fine au-dessus du titre (Style Notion)
    borderTopWidth: 1,
    paddingTop: 20,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
  },

  // --- Grille KPI (2 Colonnes) ---
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  kpiBlock: {
    width: (screenWidth - 40 - 10) / 2,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: 'white',
    alignItems: 'center',
    marginBottom: 10,
  },
  kpiIcon: {
    fontSize: 22,
    marginBottom: 8,
  },
  kpiValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  kpiDetail: {
    fontSize: 12,
    marginBottom: 8,
  },
  kpiLabel: {
    fontSize: 14,
    fontWeight: '600',
  },

  // --- Grille Fonctionnalités (3 Colonnes) ---
  modulesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  moduleLink: {
    width: (screenWidth - 40 - 2 * 10) / 3,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    // --- Styles d'ombre pour iOS ---
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 3.84,
    // --- Style d'ombre pour Android ---
    elevation: 5,
  },
  moduleEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  profitContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  profitSeparator: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  moduleText: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },

  // --- Autres Styles (Drawer, Loading, etc.) ---
  bottomPadding: {
    height: 100,
  },
  // ... (Conserver les styles de badge, loading, drawer, etc.)
  badge: {
    position: 'absolute',
    right: -6,
    top: -4,
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  badgeText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  drawerContent: {
    flex: 1,
    paddingTop: 50,
    paddingHorizontal: 20,
  },
  drawerHeader: {
    paddingBottom: 10, // Réduit l'espace
    borderBottomWidth: 1,
  },
  drawerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  drawerMenu: {
    paddingTop: 10, // Réduit l'espace
  },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12, // Réduit l'espace vertical des éléments
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  drawerProfile: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingBottom: 10, // Réduit l'espace
  },
  drawerAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginRight: 15,
  },
  drawerAvatarText: {
    fontSize: 24,
    fontWeight: 'bold' as const,
  },
  drawerProfileInfo: {
    flex: 1,
  },
  drawerProfileName: {
    fontSize: 18,
    fontWeight: 'bold' as const,
    marginBottom: 2,
  },
  drawerProfileEmail: {
    fontSize: 14,
    marginBottom: 8,
  },
  drawerSubscription: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
  },
  drawerSubscriptionText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  drawerAvicoins: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: colors.warning + '20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  drawerAvicoinsText: {
    fontSize: 12,
    fontWeight: '600' as const,
    marginLeft: 4,
  },
  drawerDivider: {
    height: 1,
    backgroundColor: '#ddd',
    marginVertical: 15,
  },
  drawerLogout: {
    marginTop: 10,
  },
  drawerItemText: {
    fontSize: 16,
    marginLeft: 15,
  },
  iconWrapper: {
    position: 'relative',
  },
  signature: {
    position: 'absolute',
    bottom: 2,
    right: 12,
    fontSize: 10,
    fontWeight: '600',
    fontStyle: 'italic',
    color: '#3B82F6',
    opacity: 0.7,
  },
  // --- NOUVEAU : Styles pour les suggestions d'optimisation ---
  suggestionCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  suggestionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  suggestionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  suggestionDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  suggestionSavings: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  suggestionActions: {
    borderTopWidth: 1,
    paddingTop: 12,
    marginTop: 8,
    borderColor: '#e5e7eb',
  },
  suggestionActionText: {
    fontSize: 13,
    lineHeight: 18,
  },
  bottomNavContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  // --- NOUVEAU : Styles pour les publicités récompensées (Drawer) ---
  rewardAdContainer: {
    gap: 12,
  },
  rewardAdHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rewardAdTextContainer: {
    flex: 1,
  },
  rewardAdTitle: {
    fontWeight: '700',
    marginBottom: 2,
  },
  rewardAdSubtitle: {
    fontSize: 11,
  },
  rewardAdButton: {
    backgroundColor: colors.warning,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 8,
  },
  rewardAdButtonDisabled: {
    backgroundColor: colors.textSecondary,
    opacity: 0.5,
  },
  rewardAdButtonText: {
    fontWeight: '700',
    color: colors.white,
  },
});

// --- Composant de module animé ---
// ... (existing AnimatedModuleLink component) ...

import { Lot } from '../types'; // Assurez-vous que le type Lot est importé

// ... (le reste des imports)

// ... (le reste du fichier jusqu'au composant)

// --- NOUVEAU : Composant pour les cartes de modules avec infobulle ---
const ModuleCard = ({
  title,
  emoji,
  path,
  description,
  badgeCount,
  dynamicColors
}: {
  title: string,
  emoji: string,
  path: any,
  description: string,
  badgeCount?: number,
  dynamicColors: any
}) => (
  <TouchableOpacity
    style={[styles.moduleLink, { backgroundColor: dynamicColors.background, borderColor: dynamicColors.border, position: 'relative' }]}
    onPress={() => router.push(path)}
  >
    {/* Icône d'aide (Infobulle) */}
    <TouchableOpacity
      style={{ position: 'absolute', top: 4, right: 4, zIndex: 10, padding: 4 }}
      onPress={(e) => {
        e.stopPropagation();
        Alert.alert(title, description);
      }}
    >
      <Icon name="help-circle-outline" size={16} color={dynamicColors.textSecondary} />
    </TouchableOpacity>

    <View style={styles.iconWrapper}>
      <Text style={styles.moduleEmoji}>{emoji}</Text>
      {badgeCount && badgeCount > 0 ? (
        <View style={[styles.badge, { backgroundColor: colors.error, top: -8, right: -12 }]}>
          <Text style={styles.badgeText}>{badgeCount}</Text>
        </View>
      ) : null}
    </View>
    <Text style={[styles.moduleText, { color: dynamicColors.text }]}>{title}</Text>
  </TouchableOpacity>
);

function FarmerDashboard() {
  // --- LOG 1: Détecter le montage du composant ---
  console.log("🔵 [Dashboard] Le composant est en cours de montage/rendu.");

  const themeColors = useThemeColors();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [marketplaceProducts, setMarketplaceProducts] = useState<Product[]>([]);
  const {
    notifications: bannerNotifications,
    loadStock,
    loadNotifications,
    stock, // --- CORRECTION : Récupérer la liste des stocks ---
  } = useData();
  const [sponsoredRecommendations, setSponsoredRecommendations] = useState<Product[]>([]);
  const [optimizationSuggestions, setOptimizationSuggestions] = useState<OptimizationSuggestion[]>([]); // --- NOUVEAU : État pour les suggestions ---
  const [vaccinations, setVaccinations] = useState<any[]>([]);
  const [refreshingData, setRefreshingData] = useState(false);
  const [lots, setLots] = useState<Lot[] | null>(null); // --- CORRECTION : Initialiser à null pour le chargement ---
  const [isLoading, setIsLoading] = useState(true); // --- NOUVEAU : État de chargement principal ---

  const { sendLocalNotification, syncToken, scheduleFeedingReminders } = usePushNotifications(); // --- AJOUT : Hook de notifications ---
  // CORRECTION : scheduleFeedingReminders doit être récupéré ici

  const { trackAction } = useDataCollector(); // Garder trackAction
  const sirenAnim = useRef(new Animated.Value(1)).current;
  const lastNotifiedAlertSignature = useRef<string | null>(null); // --- CORRECTION : Mémoriser la signature des alertes ---
  const lastNotificationTime = useRef<number>(0); // Garder lastNotificationTime
  const NOTIFICATION_COOLDOWN = 30000; // 30 secondes entre les notifications // Garder NOTIFICATION_COOLDOWN

  const {
    unreadCount: unreadNotificationsCount,
    unreadMessagesCount,
    notifications: allNotifications,
    fetchNotifications: refreshGlobalNotifications, // --- AJOUT : Récupérer la fonction de refresh ---
    fetchUnreadMessagesCount,
  } = useNotifications();



  // --- NOUVEAU : Vérifier et proposer les mises à jour OTA ---
  const checkForUpdates = async (isManual = false) => {
    if (__DEV__ || Platform.OS === 'web') {
      if (isManual && __DEV__) Alert.alert('Mode DEV', 'Les mises à jour EAS ne fonctionnent pas en mode développement.');
      return;
    }
    try {
      const update = await Updates.checkForUpdateAsync();
      if (update.isAvailable) {
        await Updates.fetchUpdateAsync();
        Alert.alert(
          'Mise à jour disponible',
          'Une nouvelle version est disponible. Voulez-vous redémarrer pour l\'appliquer ?',
          [
            { text: 'Plus tard', style: 'cancel' },
            { text: 'Redémarrer', onPress: () => Updates.reloadAsync() }
          ]
        );
      } else if (isManual) {
        Alert.alert(
          'Diagnostic Technique',
          `État : Aucune mise à jour trouvée\n\nChannel: ${Updates.channel || 'null'}\nRuntime: ${Updates.runtimeVersion}\nEmbedded: ${Updates.isEmbeddedUpdate}\nUpdateID: ${Updates.updateId ? Updates.updateId.slice(0, 8) : 'N/A'}`
        );
      }
    } catch (error: any) {
      console.log('Erreur lors de la vérification des mises à jour:', error);
      if (isManual) Alert.alert('Erreur', `Impossible de vérifier les mises à jour: ${error.message}`);
    }
  };

  useEffect(() => {
    // Vérifier après un court délai (3s) pour ne pas ralentir le démarrage
    const timer = setTimeout(() => checkForUpdates(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  const { user } = useAuth(); // Garder useAuth

  // --- NOUVEAU : Animation du cœur ---
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const heartBeatAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.25, // Grossit à 125%
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1, // Revient à la taille normale
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.delay(1000) // Pause d'une seconde entre les battements
      ])
    );
    heartBeatAnimation.start();
  }, []);

  const { subscription, loading: subscriptionLoading } = useSubscription(); // Utilise le contexte d'abonnement
  const { profile, loading: profileLoading, refreshProfile } = useProfile(); // Utilise le contexte de profil

  // --- CORRECTION DÉFINITIVE : Remplacement de useFinance par une logique de chargement locale et fiable ---
  // Le hook useFinance retournait des données incorrectes. Nous réintégrons la logique de chargement
  // qui a prouvé sa fiabilité dans d'autres composants.
  const [financialSummary, setFinancialSummary] = useState<any | null>(null);
  const [financeLoading, setFinanceLoading] = useState(true);

  const [overdueVaccinations, setOverdueVaccinations] = useState<any[]>([]);

  const loadVaccinations = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('vaccinations')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;
      setVaccinations(data || []);
    } catch (error) {
      console.error('Error loading vaccinations:', error);
      setVaccinations([]);
    }
  }, [user?.id]);

  // useNotifications moved up
  const { ads, isLoading: adsLoading } = useAds();
  const { showRewardedAd, canWatchAd, isLoading: adLoading, nextAvailableTime, checkEligibility } = useRewardedAd(); // --- AJOUT : Hook rewarded ad ---
  const [healthOverview, setHealthOverview] = useState<any | null>(null);

  const loadHealthOverview = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase.rpc('get_health_dashboard_overview', { p_user_id: user.id });
      if (error) throw error;
      setHealthOverview(data);
    } catch (error) {
      console.error('Error loading health overview:', error);
      setHealthOverview(null); // Set to null on error
    }
  }, [user?.id]);

  // --- NOUVEAU : Fonction de chargement des lots locale au dashboard ---
  const loadDashboardLots = useCallback(async () => {
    if (!user) {
      // --- CORRECTION : Retourner une promesse résolue pour Promise.allSettled ---
      setLots([]); // S'assurer que les lots sont vides si pas d'utilisateur
      return Promise.resolve();
    }
    try {
      console.log('📊 Dashboard: Loading lots locally...');
      const { data, error } = await supabase
        .from('lots')
        .select('*, taux_mortalite')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error loading dashboard lots:', error);
        setLots([]);
        return;
      }

      console.log(`✅ Dashboard: Loaded ${data?.length || 0} lots locally.`);

      const mappedLots: Lot[] = (data || []).map(lot => ({
        id: lot.id,
        name: lot.name || '',
        birdType: lot.bird_type || 'broilers',
        breed: lot.breed || '',
        quantity: lot.quantity || 0,
        age: lot.age || 0,
        entryDate: lot.created_at || new Date().toISOString(),
        dateCreated: lot.created_at || new Date().toISOString(),
        status: lot.status || 'active',
        healthStatus: lot.health_status || 'good',
        initial_quantity: lot.initial_quantity || 0,
        feedConsumption: lot.feed_consumption || 0,
        mortality: lot.mortality || 0,
        averageWeight: parseFloat(lot.poids_moyen || '0'),
        sellingPrice: lot.selling_price || 0,
        stage: lot.stage || 'grower',
        taux_mortalite: lot.taux_mortalite || 0,
        treatmentsDone: [], // Simplifié car nous ne chargeons pas les vaccinations ici
        treatmentsPending: [], // Simplifié
      }));

      setLots(mappedLots);
    } catch (error) {
      console.error('❌ Error in loadDashboardLots:', error);
      // Ne pas réinitialiser les lots pour éviter les scintillements en cas d'erreur de rafraîchissement
    }
  }, [user?.id]);

  const loadOverdueVaccinations = useCallback(async () => {
    // Ne charge les vaccins que si l'utilisateur a accès à la fonctionnalité
    if (!subscription || !subscription.plan?.features?.sanitary_prophylaxis) {
      setOverdueVaccinations([]);
      return;
    }
    try {
      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('vaccinations')
        .select('*')
        .eq('user_id', user?.id)
        .lt('due_date', today) // En retard
        .eq('status', 'pending'); // Pas encore fait

      if (error) throw error;

      if (data && data.length > 0) {
        console.log(`⚠️ ${data.length} vaccinations en retard trouvées.`);
        setOverdueVaccinations(data);
      } else {
        setOverdueVaccinations([]);
      }
    } catch (error) {
      console.error("❌ Erreur chargement vaccinations en retard:", error);
      setOverdueVaccinations([]);
    }
  }, [user?.id, subscription]);

  // --- NOUVEAU : Charger les produits du marketplace ---
  const loadMarketplaceProducts = useCallback(async () => {
    if (!user) return;
    try {
      console.log('🛒 Dashboard: Loading marketplace products...');
      const { data, error } = await supabase
        .from('marketplace_products')
        .select('*')
        .order('created_at', { ascending: false });

      console.log(`✅ Dashboard: Loaded ${data?.length || 0} marketplace products.`);
      setMarketplaceProducts(data || []);
    } catch (error) {
      console.error('❌ Dashboard: Error loading marketplace products:', error);
    }
  }, [user?.id]);

  const loadFinancialSummary = useCallback(async () => {
    if (!user) {
      console.log("⏳ [loadFinancialSummary] Attente de l'utilisateur...");
      setFinanceLoading(false);
      return;
    }
    console.log('💰 [Dashboard] Chargement du résumé financier...');
    setFinanceLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_dashboard_financial_summary', {
        p_user_id: user.id,
      });

      if (error) throw error;

      if (data) {
        const normalizedData: { [key: string]: any } = {};
        for (const key in data) {
          normalizedData[key.toLowerCase()] = data[key];
        }
        console.log('✅ [Dashboard] Données financières normalisées reçues:', JSON.stringify(normalizedData, null, 2));
        setFinancialSummary(normalizedData);
      } else {
        console.log('⚠️ [Dashboard] Aucune donnée financière reçue.');
        setFinancialSummary(null);
      }

    } catch (error: any) {
      console.error("❌ Erreur chargement résumé financier pour le dashboard:", error);
      setFinancialSummary(null);
    } finally {
      setFinanceLoading(false);
    }
  }, [user?.id]);



  // --- STATISTIQUES ET CALCULS (DÉPLACÉS POUR ÉVITER LE HOISTING) ---

  const { globalHealthScore, activeLots, totalBirds, cumulativeMortalityRate, cumulativeMortalityStatus, healthScoreColor } = useMemo(() => {
    const activeLots = lots?.filter(lot => lot.status?.toLowerCase() === 'active') || [];
    const lotsForCalc = activeLots.filter(
      (lot) => typeof lot.initial_quantity === 'number' && lot.initial_quantity > 0
    );

    const totalBirds = activeLots.reduce((sum, lot) => sum + (lot.quantity || 0), 0);
    const totalMortalityCalc = lotsForCalc.reduce((sum, lot) => sum + (lot.mortality || 0), 0);
    const totalInitialQuantity = lotsForCalc.reduce((sum, lot) => sum + lot.initial_quantity, 0);
    const cumulativeMortalityRate = totalInitialQuantity > 0 ? (totalMortalityCalc / totalInitialQuantity) * 100 : 0;
    const cumulativeMortalityStatus = cumulativeMortalityRate > 1 ? 'Élevé' : 'Normal';

    const globalHealthScore = healthOverview?.kpis?.global_health_score;

    const getHealthScoreColor = (score: number | undefined) => {
      if (score === undefined) return colors.textSecondary;
      if (score >= 80) return '#10996E';
      if (score >= 50) return '#FF9800';
      return '#E53935';
    };
    const healthScoreColor = getHealthScoreColor(globalHealthScore);

    return { globalHealthScore, activeLots, totalBirds, cumulativeMortalityRate, cumulativeMortalityStatus, healthScoreColor };
  }, [lots, healthOverview]);

  // --- CORRECTION : Centralisation du calcul des alertes critiques ---
  const computedCriticalAlertsCount = useMemo(() => {
    const criticalNotifs = allNotifications?.filter(n => !n.read && (n.type === 'error' || n.type === 'warning')) || [];
    const lowStock = stock?.filter(item => item.quantity <= (item.min_threshold || 5)) || [];
    const overdueVaccineCount = overdueVaccinations?.length || 0;

    const total = criticalNotifs.length + lowStock.length + overdueVaccineCount;

    const getKpiColor = (count: number) => {
      if (count > 5) return '#E53935'; // Rouge
      if (count > 0) return '#FF9800'; // Orange
      return '#10996E'; // Vert
    };

    const alertDetails = [];
    if (criticalNotifs.length > 0) alertDetails.push(`${criticalNotifs.length} alerte(s) critique(s)`);
    if (lowStock.length > 0) alertDetails.push(`${lowStock.length} stock(s) bas`);
    if (overdueVaccineCount > 0) alertDetails.push(`${overdueVaccineCount} vaccin(s) en retard`);

    const subtitle = alertDetails.length > 0 ? alertDetails.join(', ') : 'Aucune alerte';

    return {
      count: total,
      subtitle: subtitle,
      kpiColor: getKpiColor(total),
    };
  }, [allNotifications, stock, overdueVaccinations]);

  // --- CORRECTION : Logique de notification améliorée pour éviter les répétitions ---
  useEffect(() => {
    const currentAlertSignature = computedCriticalAlertsCount.subtitle;
    const now = Date.now();

    const hasNewAlerts = computedCriticalAlertsCount.count > 0;
    const alertsHaveChanged = currentAlertSignature !== notificationSessionState.lastPushNotificationSignature;
    const isCooldownOver = (now - lastNotificationTime.current) > NOTIFICATION_COOLDOWN;

    if (hasNewAlerts && alertsHaveChanged && isCooldownOver) {
      console.log(' [Notification] Nouvelles alertes détectées, envoi de la notification.');
      sendLocalNotification(
        '🚨 Alertes Critiques',
        computedCriticalAlertsCount.subtitle,
        { type: 'alert', count: computedCriticalAlertsCount.count }
      );
      notificationSessionState.lastPushNotificationSignature = currentAlertSignature;
      lastNotificationTime.current = now;
    }
  }, [computedCriticalAlertsCount]);

  useEffect(() => {
    // Définir l'animation de clignotement par opacité
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(sirenAnim, {
          toValue: 0.3, // Devient presque transparent
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(sirenAnim, {
          toValue: 1, // Revient à pleine opacité
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.delay(200), // Pause entre les clignotements
      ])
    );

    if (computedCriticalAlertsCount.count > 0) {
      animation.start(); // Démarrer l'animation s'il y a des alertes
    } else {
      animation.stop(); // Arrêter l'animation sinon
      sirenAnim.setValue(1); // S'assurer que l'icône est visible
    }

    return () => animation.stop(); // Nettoyer l'animation
  }, [computedCriticalAlertsCount.count]);

  const trackingNotificationsCount = useMemo(() => {
    const trackingTypes = ['new_order', 'delivery_request', 'order_confirmed', 'driver_en_route', 'delivery_in_progress', 'package_picked_up'];
    if (!allNotifications) {
      return 0;
    }
    return allNotifications.filter(n => !n.read && trackingTypes.includes(n.type)).length;
  }, [allNotifications]);

  // --- CORRECTION MAJEURE : Centraliser et fiabiliser le chargement des données ---
  useFocusEffect(
    useCallback(() => {
      if (user) {
        const loadAllData = async () => {
          // Ne pas afficher le loader principal si on a déjà des données (cas du rafraîchissement)
          if (lots === null) {
            setIsLoading(true); // Loader principal pour le premier chargement
          }
          setRefreshingData(true); // Indicateur de rafraîchissement pour les re-focus

          try {
            console.log('🔄 Dashboard: Refreshing all data...');
            // Utiliser Promise.allSettled pour s'assurer que tout se termine, même en cas d'erreur
            const results = await Promise.allSettled([ // La logique de chargement est maintenant plus ciblée
              loadDashboardLots(), // Données principales du dashboard
              loadStock(), // Données principales du dashboard
              loadOverdueVaccinations(), // Données principales du dashboard
              loadFinancialSummary(), // Données principales du dashboard
              loadMarketplaceProducts(), // Données principales du dashboard
              loadHealthOverview(), // Données principales du dashboard
              refreshGlobalNotifications(), // --- AJOUT : Forcer le refresh des notifs globales ---
              fetchUnreadMessagesCount(),
              scheduleFeedingReminders(), // --- AJOUT : Mettre à jour les rappels d'alimentation ---
            ]);

            results.forEach((result, index) => {
              if (result.status === 'rejected') {
                console.error(`❌ Failed to load data at index ${index}:`, result.reason);
              }
            });

          } finally {
            setIsLoading(false);
            setRefreshingData(false);
          }
        };
        loadAllData();
        checkEligibility(); // --- AJOUT : Vérifier l'éligibilité pour les ads ---
      }
    }, [user?.id, refreshGlobalNotifications, fetchUnreadMessagesCount, scheduleFeedingReminders, checkEligibility, loadDashboardLots, loadStock, loadOverdueVaccinations, loadFinancialSummary, loadMarketplaceProducts, loadHealthOverview]) // --- CORRECTION : Ajouter toutes les dépendances ---
  );

  // --- NOUVEAU : MISE EN PLACE DES ABONNEMENTS TEMPS RÉEL ---
  useEffect(() => {
    if (!user) return;

    console.log('🔔 Setting up real-time subscriptions for dashboard...');

    // Abonnement aux changements sur la table 'lots'
    const lotsSubscription = supabase
      .channel('dashboard-lots-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'lots', filter: `user_id=eq.${user.id}` },
        (payload) => {
          console.log('🔄 Real-time change detected in lots table, reloading:', payload.new);
          loadDashboardLots();
        }
      )
      .subscribe();

    // Nettoyage de l'abonnement lors du démontage du composant
    return () => {
      console.log('🔌 Unsubscribing from lots real-time changes.');
      supabase.removeChannel(lotsSubscription);
    };
  }, [user, loadDashboardLots]);

  // --- NOUVEAU : Générer les recommandations quand les données sont prêtes ---
  useEffect(() => { // Utiliser profile de useProfile
    if (profile && marketplaceProducts?.length > 0 && marketingAgent) {
      console.log('🤖 Dashboard: Generating enhanced sponsored recommendations...');

      // 1. Créer un contexte enrichi pour l'agent IA
      const agentContext = {
        profile: profile as any,
        health: {
          score: globalHealthScore,
          alerts: computedCriticalAlertsCount.subtitle,
        },
        finance: {
          profitMargin: financialSummary?.monthlyProfitMargin || 0,
        }
      };

      try {
        // --- CORRECTION : Filtrer uniquement les produits sponsorisés ---
        // La section "Recommandations" ne doit afficher que les produits boostés/sponsorisés.
        const sponsoredProducts = marketplaceProducts.filter((product: any) => product.is_sponsored === true);
        const recs = marketingAgent(agentContext, sponsoredProducts, 10);
        // --- NOUVEAU : Suivi de l'agent marketing ---
        trackAction('ai_marketing_recommendation_generated', {
          recommendationCount: recs.length,
          userZone: profile.location,
        });
        setSponsoredRecommendations(recs); // Garder setSponsoredRecommendations
      } catch (e) {
        console.error("⚠️ Erreur marketingAgent:", e);
      }
    }
  }, [profile, marketplaceProducts, globalHealthScore, financialSummary, computedCriticalAlertsCount]); // Ajout des nouvelles dépendances

  // --- NOUVEAU : Générer les suggestions d'optimisation ---
  useEffect(() => {
    const generateOptimizations = async () => {
      // --- LOGS DE DÉBOGAGE pour capter l'erreur ---
      console.log("🔍 [generateOptimizations] Vérification des dépendances :");
      console.log(`- user: ${user ? user.id : 'null'}`);
      console.log(`- lots: ${lots ? `Array(${lots.length})` : String(lots)}`);
      console.log(`- bannerNotifications: ${bannerNotifications ? `Array(${bannerNotifications.length})` : String(bannerNotifications)}`);

      try {
        // --- CORRECTION DÉFINITIVE : S'assurer que 'lots' n'est pas null avant de vérifier sa longueur ---
        if (user && Array.isArray(lots) && lots.length > 0 && Array.isArray(bannerNotifications) && bannerNotifications.length > 0 && stockOptimizerAgent) {
          console.log('🤖 Dashboard: Generating optimization suggestions...');
          const suggestions = await stockOptimizerAgent.generateOptimizationSuggestions(user.id);
          console.log(`✅ Dashboard: Generated ${suggestions.length} optimization suggestions.`);
          setOptimizationSuggestions(suggestions);
        } else {
          console.log("ℹ️ [generateOptimizations] Conditions non remplies, pas de génération de suggestions.");
        }
      } catch (error) {
        console.error('❌ Dashboard: Error generating optimization suggestions:', error);
        setOptimizationSuggestions([]); // Réinitialiser en cas d'erreur
      }
    };

    generateOptimizations();
  }, [user, lots, bannerNotifications]); // Se déclenche quand les données sont prêtes

  const dynamicColors = themeColors || colors; // Utilisation des couleurs du thème avec fallback

  const getUserDisplayName = () => profile?.full_name || 'Utilisateur'; // Utiliser profile

  const getFarmDisplayName = () => profile?.farm_name || ''; // Utiliser profile

  const handleMenuPress = () => setDrawerOpen(true);

  const [signatures, setSignatures] = useState({ current: '', dismissed: '' });
  const [signaturesLoaded, setSignaturesLoaded] = useState(false);
  const SIGNATURE_KEY = '@dismissed_alert_signature';

  useEffect(() => {
    const loadDismissedSignature = async () => {
      try {
        const dismissed = await AsyncStorage.getItem(SIGNATURE_KEY);
        setSignatures(prev => ({ ...prev, dismissed: dismissed || '' }));
      } catch (e) {
        console.error("Failed to load dismissed signature from storage", e);
      } finally {
        setSignaturesLoaded(true);
      }
    };
    loadDismissedSignature();
  }, []);

  const importantUnreadNotifications = useMemo(() => allNotifications.filter(
    n => !n.read && ['new_order', 'delivery_request', 'stock_alert'].includes(n.type)
  ), [allNotifications]);

  useEffect(() => {
    if (importantUnreadNotifications.length > 0) {
      const currentSignature = importantUnreadNotifications.map(n => n.id).sort().join(',');
      setSignatures(prev => ({ ...prev, current: currentSignature }));
    } else {
      setSignatures(prev => ({ ...prev, current: '' }));
    }
  }, [importantUnreadNotifications]);

  const handleDismissBlinkingNotification = async () => {
    const currentSignature = signatures.current;
    if (currentSignature) {
      await AsyncStorage.setItem(SIGNATURE_KEY, currentSignature);
      setSignatures(prev => ({ ...prev, dismissed: currentSignature }));
    }
  };

  const handleBlinkingNotificationPress = () => router.push('/notifications');

  const renderDrawerContent = () => (
    <ScrollView style={[styles.drawerContent, { backgroundColor: dynamicColors.background }]}>
      <View style={styles.drawerHeader}>
        <View style={{ alignItems: 'center', paddingVertical: 10 }}>
          <AviprodLogo />
          {/* Info Utilisateur & Abonnement */}
          {profile && (
            <View style={{ alignItems: 'center', marginTop: 15, width: '100%' }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: dynamicColors.text, marginBottom: 5 }}>
                {profile.full_name || 'Utilisateur'}
              </Text>

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 5 }}>
                {/* Badge Abonnement */}
                <View style={{
                  backgroundColor: profile.subscription_status === 'active' ? colors.primary + '20' : colors.textSecondary + '20',
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 20,
                  borderWidth: 1,
                  borderColor: profile.subscription_status === 'active' ? colors.primary : colors.border
                }}>
                  <Text style={{
                    color: profile.subscription_status === 'active' ? colors.primary : dynamicColors.textSecondary,
                    fontWeight: 'bold',
                    fontSize: 12
                  }}>
                    {subscription?.plan?.display_name || 'Freemium'}
                  </Text>
                </View>

                {/* Badge Avicoins */}
                <View style={{
                  backgroundColor: colors.warning + '20',
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 20,
                  borderWidth: 1,
                  borderColor: colors.warning,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4
                }}>
                  <Icon name="cash" size={14} color={colors.warning} />
                  <Text style={{ color: colors.warning, fontWeight: 'bold', fontSize: 12 }}>
                    {profile.avicoins || 0}
                  </Text>
                </View>
              </View>
            </View>
          )}
        </View>
        <View style={styles.drawerDivider} />
      </View>
      <View style={[styles.drawerMenu, { flex: 1 }]}>
        <TouchableOpacity style={styles.drawerItem} onPress={() => { setDrawerOpen(false); router.push('/profile'); }}>
          <Icon name="person" size={24} color={dynamicColors.text} />
          <Text style={[styles.drawerItemText, { color: dynamicColors.text }]}>Modifier le Profil</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.drawerItem} onPress={() => { setDrawerOpen(false); }}>
          <Icon name="key" size={24} color={dynamicColors.text} />
          <Text style={[styles.drawerItemText, { color: dynamicColors.text }]}>Changer le Mot de Passe</Text>
        </TouchableOpacity>

        {/* Gestion de l'abonnement - MISE EN AVANT */}
        <View style={{ marginTop: 10, marginBottom: 10, paddingHorizontal: 0 }}>
          <TouchableOpacity
            style={[
              styles.drawerItem,
              {
                backgroundColor: colors.primary, // Fond couleur primaire pour ressortir
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.2,
                shadowRadius: 3,
                elevation: 4,
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.2)'
              }
            ]}
            onPress={() => {
              setDrawerOpen(false);
              router.push('/subscription-plans');
            }}
          >
            <Icon name="diamond" size={24} color="#FFF" />
            <Text style={[styles.drawerItemText, { color: "#FFF", fontWeight: 'bold', fontSize: 16 }]}>
              Gérer mon Abonnement
            </Text>
            <View style={{ marginLeft: 'auto', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 }}>
              <Text style={{ color: '#FFF', fontSize: 10, fontWeight: 'bold' }}>PRO</Text>
            </View>
          </TouchableOpacity>
        </View>

        {profile?.role === 'admin' && (
          <>
            <View style={styles.drawerDivider} />
            <TouchableOpacity style={styles.drawerItem} onPress={() => { setDrawerOpen(false); router.push('/admin/manage-ads'); }}>
              <Icon name="construct" size={24} color={dynamicColors.text} />
              <Text style={[styles.drawerItemText, { color: dynamicColors.text }]}>Gérer Publicités</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.drawerItem} onPress={() => { setDrawerOpen(false); router.push('/admin/ai-evolution-dashboard'); }}>
              <Icon name="analytics" size={24} color={dynamicColors.text} />
              <Text style={[styles.drawerItemText, { color: dynamicColors.text }]}>Évolution IA</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.drawerItem} onPress={() => { setDrawerOpen(false); router.push('/admin-driver-validation'); }}>
              <Icon name="car" size={24} color={dynamicColors.text} />
              <Text style={[styles.drawerItemText, { color: dynamicColors.text }]}>Valider Livreurs</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.drawerItem} onPress={() => { setDrawerOpen(false); router.push('/admin-kyc'); }}>
              <Icon name="document-text" size={24} color={dynamicColors.text} />
              <Text style={[styles.drawerItemText, { color: dynamicColors.text }]}>Gérer KYC</Text>
            </TouchableOpacity>
          </>
        )}

        {/* --- NOUVEAU : Section Gagner des Avicoins dans le Drawer --- */}
        <View style={styles.drawerDivider} />
        <View style={[styles.rewardAdContainer, { paddingHorizontal: 10, marginBottom: 20 }]}>
          <View style={styles.rewardAdHeader}>
            <Icon name="gift" size={24} color={colors.warning} />
            <View style={styles.rewardAdTextContainer}>
              <Text style={[styles.rewardAdTitle, { color: dynamicColors.text, fontSize: 14 }]}>Gagner des Avicoins</Text>
              <Text style={[styles.rewardAdSubtitle, { color: dynamicColors.textSecondary, fontSize: 11 }]}>
                {canWatchAd
                  ? "Vidéo disponible (+2 🪙)"
                  : nextAvailableTime
                    ? `Prochaine prévue à ${nextAvailableTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
                    : "Chargement..."}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[
              styles.rewardAdButton,
              (!canWatchAd || adLoading) && styles.rewardAdButtonDisabled,
              { marginTop: 10, paddingVertical: 10 }
            ]}
            onPress={async () => {
              if (!canWatchAd || adLoading) return;
              const success = await showRewardedAd();
              if (success) {
                if (refreshProfile) await refreshProfile();
                Alert.alert('Félicitations ! 🎉', 'Vous avez gagné 2 Avicoins !');
              } else {
                Alert.alert('Information', 'La publicité est en cours de chargement. Veuillez réessayer dans quelques instants.');
              }
            }}
            disabled={!canWatchAd || adLoading}
          >
            <Icon
              name={adLoading ? "hourglass" : "play-circle"}
              size={18}
              color={colors.white}
            />
            <Text style={[styles.rewardAdButtonText, { fontSize: 14 }]}>
              {adLoading ? "Patientez..." : canWatchAd ? "Regarder la vidéo" : "Indisponible"}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.drawerDivider} />
        <TouchableOpacity style={styles.drawerItem} onPress={() => { setDrawerOpen(false); handleLogout(); }}>
          <Icon name="log-out" size={24} color={colors.error} />
          <Text style={[styles.drawerItemText, { color: colors.error }]}>Se déconnecter</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  async function handleLogout() {
    Alert.alert(
      'Déconnexion',
      'Êtes-vous sûr de vouloir vous déconnecter?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Déconnexion',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('🔄 Déconnexion en cours...');
              await supabase.auth.signOut();
              console.log('✅ Déconnexion réussie');
              router.replace('/auth');
            } catch (error: any) {
              console.log('⚠️ Error logging out:', error);
              Alert.alert('Erreur', 'Impossible de se déconnecter');
            }
          },
        },
      ]
    );
  }

  // --- NOUVEAU : Fusionner les publicités et les produits sponsorisés ---
  const carouselItems = useMemo(() => [
    ...ads.map(ad => ({
      id: ad.id,
      title: ad.title, // Garder ad.title
      subtitle: ad.subtitle,
      image_url: ad.image_url,
      target_url: ad.target_url,
    })),
    ...sponsoredRecommendations.map(product => {
      // Déterminer la raison de la recommandation
      let reason = "Suggestion pour vous";
      if (globalHealthScore < 60 && product.category && typeof product.category === 'string' && ['Médicaments', 'Santé', 'Vitamines'].includes(product.category)) {
        reason = "Recommandé pour la santé de vos lots"; // Garder reason
      } else if (financialSummary?.monthlyProfitMargin && financialSummary.monthlyProfitMargin < 10 && product.category && typeof product.category === 'string' && ['Alimentation économique', 'Additifs'].includes(product.category)) {
        reason = "Pour optimiser vos coûts";
      } else if (product.is_on_sale) {
        reason = "Actuellement en promotion";
      }

      return {
        id: `sponsored-${product.id}`,
        title: product.name,
        // Utiliser la raison comme sous-titre
        subtitle: reason,
        image_url: product.image ? getMarketplaceImageUrl(product.image) : getDefaultImageForCategory(product.category),
        action: () => router.push({
          pathname: '/marketplace',
          params: { productId: product.id }
        }),
      };
    })
  ], [ads, sponsoredRecommendations, globalHealthScore, financialSummary]);

  return (
    <Drawer
      open={drawerOpen}
      onOpen={() => setDrawerOpen(true)}
      onClose={() => setDrawerOpen(false)}
      renderDrawerContent={renderDrawerContent}
    >
      <SafeAreaView style={[commonStyles.container, { backgroundColor: dynamicColors.background || '#f7f7f7' }]}>
        {/* 1. Header Fixe */}
        <View style={[styles.header, { backgroundColor: dynamicColors.backgroundAlt || dynamicColors.background }]}>
          <TouchableOpacity style={styles.menuButton} onPress={handleMenuPress}>
            <Icon name="menu" size={26} color={dynamicColors.text} />
          </TouchableOpacity>
          <AviprodLogo />
          <View style={styles.headerIcons}>
            <TouchableOpacity onPress={() => router.push('/marketplace-messages')} style={styles.iconWrapper}>
              <Icon name="mail" size={26} color={dynamicColors.text} />
              {unreadMessagesCount > 0 && (
                <View style={[styles.badge, { backgroundColor: colors.error }]}>
                  <Text style={[styles.badgeText, { color: colors.white }]}>{unreadMessagesCount}</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/notifications')} style={styles.iconWrapper}>
              <Icon name="notifications" size={26} color={dynamicColors.text} />
              {unreadNotificationsCount > 0 && (
                <View style={[styles.badge, { backgroundColor: colors.error }]}>
                  <Text style={[styles.badgeText, { color: colors.white }]}>{unreadNotificationsCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
          <Text style={styles.signature}>
            by GreenEcoTech
          </Text>
        </View>

        {/* Contenu défilable */}
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>

          {/* 2. Infos Utilisateur & Avicoins (Minimaliste) */}
          <View style={styles.userInfoBlock}>
            <View style={styles.userInfoRow}>
              {/* Nom de la Ferme */}
              <View style={styles.userNameContainer}>
                {getFarmDisplayName() && <Text style={[styles.farmName, { color: dynamicColors.text }]}>{getFarmDisplayName()}</Text>}
              </View>
            </View>
          </View>

          {/* NOUVEAU : Bloc de confirmation pour les utilisateurs sans nom de ferme */}
          {!profileLoading && profile && !profile.farm_name && (
            <TouchableOpacity onPress={() => router.push('/profile')}>
              <View style={[styles.confirmationBlock, { borderColor: dynamicColors.warning, backgroundColor: dynamicColors.warning + '10' }]}>
                <Text style={styles.confirmationEmoji}>✏️</Text>
                <Text style={[styles.confirmationText, { color: dynamicColors.text }]}>
                  Action requise : Veuillez renseigner le nom de votre ferme pour activer toutes les fonctionnalités.
                </Text>
              </View>
            </TouchableOpacity>
          )}




          {/* 3. Banner de publicité */}
          {carouselItems.length > 0 && (
            <AdBanner ads={carouselItems} />
          )}

          {/* Google AdMob Banner */}
          <GoogleAdBanner />



          {/* 4. Notification d'urgence clignotante */}
          {(() => {
            const shouldShowBlinkingNotification = signaturesLoaded && signatures.current && signatures.current !== signatures.dismissed;
            const firstImportantNotification = importantUnreadNotifications.length > 0 ? importantUnreadNotifications[0] : null;

            if (shouldShowBlinkingNotification && firstImportantNotification) {
              return (
                <BlinkingNotification
                  id={firstImportantNotification.id}
                  title="Alerte Critique"
                  message={firstImportantNotification.message}
                  count={importantUnreadNotifications.length}
                  icon="warning"
                  onPress={handleBlinkingNotificationPress}
                  onDismiss={handleDismissBlinkingNotification}
                />
              );
            }
            return null;
          })()}

          {/* 5. Aperçu Rapide (KPIs) - Grille 2 Colonnes */}
          <View style={styles.sectionContainer}>
            <View style={[styles.sectionHeader, { borderTopColor: dynamicColors.border }]}>
              <Text style={[styles.sectionTitle, { color: dynamicColors.text }]}>Aperçu Rapide</Text>
            </View>
            <View style={styles.kpiGrid}>
              {/* NOUVELLE CARTE : Santé Globale */}
              <View style={[styles.kpiBlock, { backgroundColor: dynamicColors.background, borderColor: dynamicColors.border }]}>
                {healthOverview === null ? (
                  <>
                    <SkeletonPlaceholder width={30} height={30} style={{ marginBottom: 8 }} />
                    <SkeletonPlaceholder width="60%" height={22} style={{ marginBottom: 4 }} />
                    <SkeletonPlaceholder width="80%" height={14} style={{ marginBottom: 8 }} />
                  </>
                ) : (
                  <>
                    <Animated.Text style={[styles.kpiIcon, { transform: [{ scale: scaleAnim }] }]}>❤️</Animated.Text>
                    <Text style={[styles.kpiValue, { color: healthScoreColor }]}>
                      {globalHealthScore === undefined ? 'N/A' : `${Math.round(globalHealthScore)}%`}
                    </Text>
                    <Text style={[styles.kpiDetail, { color: dynamicColors.textSecondary }]}>
                      {activeLots.length === 0 ? 'Aucun lot actif' : `Mortalité: ${cumulativeMortalityStatus}`}
                    </Text>
                  </>
                )}
                <Text style={[styles.kpiLabel, { color: dynamicColors.text }]}>Santé Globale</Text>
              </View>

              <View style={[styles.kpiBlock, { backgroundColor: dynamicColors.background, borderColor: dynamicColors.border }]}>
                {lots === null ? (
                  <>
                    <SkeletonPlaceholder width={30} height={30} style={{ marginBottom: 8 }} />
                    <SkeletonPlaceholder width="40%" height={22} style={{ marginBottom: 4 }} />
                    <SkeletonPlaceholder width="60%" height={14} style={{ marginBottom: 8 }} />
                  </>
                ) : (
                  <>
                    <Text style={styles.kpiIcon}>🐔</Text>
                    <Text style={[styles.kpiValue, { color: (activeLots?.length || 0) === 0 ? '#FF9800' : '#10996E' }]}>{activeLots?.length || 0}</Text>
                    <Text style={[styles.kpiDetail, { color: dynamicColors.textSecondary }]}>{lots?.length || 0} au total</Text>
                  </>
                )}
                <Text style={[styles.kpiLabel, { color: dynamicColors.text }]}>Lots Actifs</Text>
              </View>

              {/* Marge Nette (hebdomadaire / mensuelle) */}
              <View style={[styles.kpiBlock, { backgroundColor: dynamicColors.background, borderColor: dynamicColors.border }]}>
                {financeLoading ? (
                  <>
                    <SkeletonPlaceholder width={30} height={30} style={{ marginBottom: 8 }} />
                    <SkeletonPlaceholder width="70%" height={22} style={{ marginBottom: 4 }} />
                    <SkeletonPlaceholder width="90%" height={14} style={{ marginBottom: 8 }} />
                  </>
                ) : (
                  <>
                    {(() => {
                      const quarterlyRevenue = financialSummary?.quarterlyrevenue;
                      const quarterlyExpenses = financialSummary?.quarterlyexpenses;
                      let quarterlyMargin = financialSummary?.quarterlyprofitmargin;

                      if (typeof quarterlyMargin !== 'number' && typeof quarterlyRevenue === 'number' && typeof quarterlyExpenses === 'number') {
                        quarterlyMargin = quarterlyRevenue > 0 ? ((quarterlyRevenue - quarterlyExpenses) / quarterlyRevenue) * 100 : 0;
                      }

                      return (
                        <>
                          <Text style={styles.kpiIcon}>📈</Text>
                          <View style={styles.profitContainer}>
                            <Text style={[styles.kpiValue, { color: (financialSummary?.monthlyprofitmargin ?? 0) >= 0 ? '#4CAF50' : '#E53935' }]}>
                              {financialSummary && typeof financialSummary.monthlyprofitmargin === 'number' ? `${financialSummary.monthlyprofitmargin >= 0 ? '+' : ''}${financialSummary.monthlyprofitmargin.toFixed(1)}%` : 'N/A'}
                            </Text>
                            <Text style={[styles.profitSeparator, { color: dynamicColors.textSecondary }]}>/</Text>
                            <Text style={[styles.kpiValue, { fontSize: 16, color: (quarterlyMargin ?? 0) >= 0 ? '#4CAF50' : '#E53935' }]}>
                              {typeof quarterlyMargin === 'number' ? `${quarterlyMargin.toFixed(1)}%` : 'N/A'}
                            </Text>
                          </View>
                        </>
                      );
                    })()}
                  </>
                )}
                <Text style={[styles.kpiLabel, { color: dynamicColors.text }]}>Marge Nette</Text>
              </View>

              {/* Alertes Critiques */}
              <View style={[styles.kpiBlock, { backgroundColor: dynamicColors.background, borderColor: dynamicColors.border }]}>
                {isLoading && (!stock || !allNotifications) ? (
                  <>
                    <SkeletonPlaceholder width={30} height={30} style={{ marginBottom: 8 }} />
                    <SkeletonPlaceholder width="30%" height={22} style={{ marginBottom: 4 }} />
                    <SkeletonPlaceholder width="50%" height={14} style={{ marginBottom: 8 }} />
                  </>
                ) : (
                  <>
                    <Animated.View style={{ opacity: sirenAnim }}>
                      <Text style={styles.kpiIcon}>🚨</Text>
                    </Animated.View>
                    <Text style={[styles.kpiValue, { color: computedCriticalAlertsCount.kpiColor }]}>{computedCriticalAlertsCount.count || 0}</Text>
                    <Text style={[styles.kpiDetail, { color: dynamicColors.textSecondary }]}>
                      {computedCriticalAlertsCount.subtitle}
                    </Text>
                  </>
                )}
                <Text style={[styles.kpiLabel, { color: dynamicColors.text }]}>Alertes Critiques</Text>
              </View>
            </View>
          </View>

          {/* --- Section des suggestions d'optimisation --- */}
          {optimizationSuggestions.length > 0 && (
            <View style={styles.sectionContainer}>
              <View style={[styles.sectionHeader, { borderTopColor: dynamicColors.border }]}>
                <Text style={[styles.sectionTitle, { color: dynamicColors.text }]}>💡 Pistes d'Optimisation</Text>
              </View>
              {optimizationSuggestions.map((suggestion, index) => (
                <View key={index} style={[styles.suggestionCard, { borderColor: dynamicColors.primary + '50' }]}>
                  <View style={styles.suggestionHeader}>
                    <Icon name="bulb" size={20} color={dynamicColors.primary} />
                    <Text style={[styles.suggestionTitle, { color: dynamicColors.primary }]}>{suggestion.title}</Text>
                  </View>
                  <Text style={[styles.suggestionDescription, { color: dynamicColors.textSecondary }]}>{suggestion.description}</Text>
                  {suggestion.estimated_savings > 0 && (
                    <Text style={[styles.suggestionSavings, { color: dynamicColors.success }]}>
                      Économie estimée : {suggestion.estimated_savings.toLocaleString()} CFA
                    </Text>
                  )}
                  <View style={styles.suggestionActions}>
                    {suggestion.actions.slice(0, 2).map((action: string, i: number) => (
                      <Text key={i} style={[styles.suggestionActionText, { color: dynamicColors.text }]}>• {action}</Text>
                    ))}
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* 6. Fonctionnalités - Grille 3 Colonnes Compacte */}
          <View style={styles.sectionContainer}>
            <View style={[styles.sectionHeader, { borderTopColor: dynamicColors.border }]}>
              <Text style={[styles.sectionTitle, { color: dynamicColors.text }]}>Fonctionnalités</Text>
            </View>
            <View style={styles.modulesGrid}>
              <ModuleCard
                title="Lots"
                emoji="🐔"
                path="/lots"
                description="Gérez vos bandes de volailles, suivez la mortalité, la consommation et la santé de vos lots."
                dynamicColors={dynamicColors}
              />
              <ModuleCard
                title="Marché"
                emoji="🛒"
                path="/marketplace"
                description="Accédez au marché pour acheter des intrants ou vendre vos produits (oeufs, poulets)."
                badgeCount={unreadMessagesCount}
                dynamicColors={dynamicColors}
              />
              <ModuleCard
                title="Finance"
                emoji="💰"
                path="/finance"
                description="Suivez vos dépenses, vos revenus et analysez la rentabilité de votre exploitation."
                dynamicColors={dynamicColors}
              />
              <ModuleCard
                title="Stock"
                emoji="📦"
                path="/stock"
                description="Gérez votre inventaire et votre volume d'achats (aliments, soins). Suivez votre autonomie en temps réel pour éviter les ruptures."
                dynamicColors={dynamicColors}
              />
              <ModuleCard
                title="Suivi"
                emoji="🚚"
                path="/delivery-dashboard"
                description="Suivez vos ventes, vos achats et l'état de vos livraisons en temps réel."
                badgeCount={trackingNotificationsCount}
                dynamicColors={dynamicColors}
              />
              <ModuleCard
                title="Alimentation"
                emoji="🍎"
                path="/feeding"
                description="Consultez et gérez les programmes d'alimentation pour vos lots."
                dynamicColors={dynamicColors}
              />
              <ModuleCard
                title="Forum"
                emoji="💬"
                path="/forum"
                description="Échangez avec d'autres éleveurs, posez vos questions et partagez vos expériences."
                dynamicColors={dynamicColors}
              />
              {subscription?.status === 'active' && (
                <>
                  <ModuleCard
                    title="Diagnostic IA"
                    emoji="🤖"
                    path="/ai-analysis"
                    description="Analysez la santé de vos volailles grâce à l'intelligence artificielle."
                    dynamicColors={dynamicColors}
                  />
                  <ModuleCard
                    title="Infos"
                    emoji="ℹ️"
                    path="/infos"
                    description="Accédez aux informations utiles et guides pour votre élevage."
                    dynamicColors={dynamicColors}
                  />
                </>
              )}
              <ModuleCard
                title="Profil"
                emoji="👤"
                path="/profile"
                description="Gérez vos informations personnelles, votre abonnement et les paramètres de l'application."
                dynamicColors={dynamicColors}
              />
            </View>
          </View>

          {/* 7. Section Administration (pour les admins seulement) */}
          {/* Déplacée dans le drawer */}

          {/* ... autres éléments non visibles (BlinkingNotification, TaskCard, etc.) peuvent être ajoutés ici ... */}

          <View style={styles.bottomPadding} />
        </ScrollView>

        {/* Bottom Navigation */}
        {/* --- MODIFICATION : La barre de navigation est maintenant un composant séparé --- */}
        <View style={styles.bottomNavContainer}>
          <BottomNavigation activeTab={activeTab} onTabPress={(tab) => {
            if (tab === 'dashboard') setActiveTab('dashboard');
            else if (tab === 'lots') router.push('/lots');
            else if (tab === 'marketplace') router.push('/marketplace');
            else if (tab === 'feeding') router.push('/feeding');
            else if (tab === 'health') router.push('/health');
          }} />
        </View>

      </SafeAreaView>
    </Drawer>
  );
}

export default FarmerDashboard;
