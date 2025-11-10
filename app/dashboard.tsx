import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity, Dimensions, Alert, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
// NOTE: J'ai supposé que 'colors' et 'useThemeColors' existent et fournissent un fond clair (background)
import { colors, commonStyles, useThemeColors } from '../styles/commonStyles'; // Assurez-vous que useThemeColors est bien exporté
import { useData } from '../hooks/useData';
import { useFinance } from '../hooks/useFinance'; // Import useFinance
import { useAds } from '../hooks/useAds';
import { useNotifications } from '../hooks/useNotifications';
import SimpleBottomSheet from '../components/BottomSheet';
import AddTaskForm from '../components/AddTaskForm'; // Assurez-vous que le chemin est correct
import FloatingActionButton from '../components/FloatingActionButton';
import { heuristicsModel } from '../lib/liveAI';
import BottomNavigation from '../components/BottomNavigation';
import Icon from '../components/Icon';
import BlinkingNotification from '../components/BlinkingNotification';
import { router, useFocusEffect } from 'expo-router';
import { supabase, getMarketplaceImageUrl } from '../config'; // Use supabase from config
import { useSubscription } from '../contexts/SubscriptionContext';
import AviprodLogo from '../components/AviprodLogo';
import AdBanner from '../components/AdBanner';
import { useAuth } from '../hooks/useAuth';
import { marketingAgent, Product } from '../lib/marketingAgent'; // Import marketingAgent and Product type
import { Drawer } from 'react-native-drawer-layout';
import { useDataCollector } from '../src/hooks/useDataCollector';

const getDefaultImageForCategory = (category: string | undefined) => {
  return 'https://via.placeholder.com/150x120?text=Aviprod';
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

  // --- Titre de Section (Aperçu Rapide / Modules) ---
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
    paddingHorizontal: 0, // Déjà dans sectionContainer
  },
  kpiBlock: {
    // Calcul pour garantir 2 blocs par ligne avec un gap de 10px
    width: (screenWidth - 40 - 10) / 2, 
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: 'white',
    // Suppression des ombres pour le look minimaliste de Notion
    shadowOpacity: 0, 
    elevation: 0,
    alignItems: 'center', // <-- AJOUT POUR CENTRER LE CONTENU
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

  // --- Grille Modules (3 Colonnes) ---
  modulesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingHorizontal: 0, // Déjà dans sectionContainer
  },
  moduleLink: {
    // Calcul pour garantir 3 blocs par ligne avec un gap de 10px
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
    shadowOpacity: 0.15, // Une ombre plus subtile
    shadowRadius: 3.84,  // Un flou plus doux

    // --- Style d'ombre pour Android ---
    elevation: 5, // Une élévation visuelle pour Android
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
  }
});

// --- NOUVEAU : Composant de module animé ---
// ... (existing AnimatedModuleLink component) ...

function FarmerDashboard() {
  const themeColors = useThemeColors();
  const [isAddTaskVisible, setIsAddTaskVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<{
    full_name: string | null;
    farm_name: string | null;
    location?: string | null;
    role?: string | null; // Ajout du rôle
  } | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [marketplaceProducts, setMarketplaceProducts] = useState<Product[]>([]);
  const [sponsoredRecommendations, setSponsoredRecommendations] = useState<Product[]>([]);


  const { trackAction } = useDataCollector();
  // --- NOUVEAU : Animation pour l'icône de sirène ---
  const sirenAnim = useRef(new Animated.Value(1)).current;

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

    if (criticalAlertsCount?.count > 0) {
      animation.start(); // Démarrer l'animation s'il y a des alertes
    } else {
      animation.stop(); // Arrêter l'animation sinon
      sirenAnim.setValue(1); // S'assurer que l'icône est visible
    }

    return () => animation.stop(); // Nettoyer l'animation
  }, [criticalAlertsCount?.count]);

  const { user } = useAuth();

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

  const { subscription, avicoins, loading: subscriptionLoading } = useSubscription();
  const { financialSummary: monthlyFinancialSummary } = useFinance('month'); // Get financial summary
  const [financialSummary, setFinancialSummary] = useState<{
    weeklyProfitMargin: number; weeklyProfit: number; monthlyProfitMargin: number; monthlyProfit: number; revenue: number; expenses: number;
  } | null>(null);
  const [financeLoading, setFinanceLoading] = useState(true); // Mettre à true initialement
  const [overdueVaccinations, setOverdueVaccinations] = useState<any[]>([]);

  const {
    lots, stock,
    notifications: bannerNotifications,
    unreadMessages,
    loadLots, loadStock, loadNotifications, loadUnreadMessages,
    isLoading: isDataLoading,
  } = useData();
  
  const { 
    unreadCount: unreadNotificationsCount, 
    notifications: allNotifications,
    markAsRead,
  } = useNotifications();  
  const { ads, isLoading: adsLoading } = useAds();

  // --- Chargement initial des données ---
  useEffect(() => {
     if (user) {
       const loadAllData = async () => {
         console.log('🚀 Dashboard: Starting parallel data load...');
         // On combine tous les chargements dans un seul Promise.all
         await Promise.all([
           loadUserProfile(),
           loadOverdueVaccinations(),
           loadMarketplaceProducts(),
         ]);
       };
       loadAllData();
      }
  }, [user]);

  // --- Rafraîchissement des données au focus de l'écran ---
  useFocusEffect(
    useCallback(() => {
      if (user) {
        console.log('🔄 Dashboard focused, refreshing critical data...');
        // Recharger toutes les données nécessaires pour les alertes
        Promise.all([
          loadUnreadMessages(),
          loadFinancialSummary(),
          loadLots(),
          loadStock(),
          loadOverdueVaccinations()
        ]).catch(error => console.error("Error refreshing dashboard data:", error));
      }
    }, [user, loadUnreadMessages, loadFinancialSummary, loadLots, loadStock, loadOverdueVaccinations])
  );
  // --- NOUVEAU : Générer les recommandations quand les données sont prêtes ---
  useEffect(() => {
    if (userProfile && marketplaceProducts?.length > 0) {
      console.log('🤖 Dashboard: Generating enhanced sponsored recommendations...');

      // 1. Créer un contexte enrichi pour l'agent IA
      const agentContext = {
        profile: userProfile as any,
        health: {
          score: healthScore,
          alerts: criticalAlertsCount.subtitle,
        },
        finance: {
          profitMargin: financialSummary?.monthlyProfitMargin || 0,
        }
      };

      const recs = marketingAgent(agentContext, marketplaceProducts, 4);
      // --- NOUVEAU : Suivi de l'agent marketing ---
      trackAction('ai_marketing_recommendation_generated', {
        recommendationCount: recs.length,
        userZone: userProfile.location,
      });
      setSponsoredRecommendations(recs);
    }
  }, [userProfile, marketplaceProducts, healthScore, financialSummary, criticalAlertsCount]); // Ajout des nouvelles dépendances

  // --- NOUVEAU : Calcul du score de santé ---
  const healthScore = useMemo(() => {
    if (isDataLoading || !lots || !stock || !financialSummary) {
      console.log('Dashboard Health Score: Data not ready, returning 0');
      return 0;
    }
    
    const activeLots = lots.filter(l => l.status === 'active');
    if (activeLots.length === 0) {
      console.log('Dashboard Health Score: No active lots, returning 100');
      return 100;
    }
  
    const lotsForCalc = activeLots.filter(lot => typeof lot.initial_quantity === 'number' && lot.initial_quantity > 0);
    const totalMortality = lotsForCalc.reduce((sum, lot) => sum + (lot.mortality || 0), 0);
    const totalInitialQuantity = lotsForCalc.reduce((sum, lot) => sum + lot.initial_quantity, 0);
    const mortalityRate = totalInitialQuantity > 0 ? (totalMortality / totalInitialQuantity) * 100 : 0;
    
    if (mortalityRate > 10) {
      return 5;
    }

    const feedStockItems = stock.filter(s => s.category === 'feed');
    const totalFeedStock = feedStockItems.length;
    const lowFeedStockItems = feedStockItems.filter(s => s.quantity <= s.minThreshold).length;
    const stockPercent = totalFeedStock > 0 ? ((totalFeedStock - lowFeedStockItems) / totalFeedStock) * 100 : 100;
    
    // Calculer le nombre de symptômes observés sur tous les lots actifs
    const totalSymptoms = activeLots.reduce((count, lot) => {
      if (Array.isArray(lot.symptoms)) {
        return count + lot.symptoms.length;
      }
      return count;
    }, 0);

    // --- NOUVEAU : Calculer les jours depuis le dernier vaccin réel ---
    let lastVaccineDays = 90; // Valeur par défaut si aucun vaccin
    const allVaccinations = lots.flatMap(lot => lot.vaccinations || []);
    if (allVaccinations.length > 0) {
      // Trouver la date de complétion la plus récente
      const mostRecentCompletionDate = allVaccinations
        .filter(v => v.completed_date)
        .map(v => new Date(v.completed_date))
        .sort((a, b) => b.getTime() - a.getTime())[0];

      if (mostRecentCompletionDate) {
        const today = new Date();
        lastVaccineDays = Math.floor((today.getTime() - mostRecentCompletionDate.getTime()) / (1000 * 60 * 60 * 24));
      }
    }
    // --- Logique de `health.tsx` pour consumptionChangePct ---
    const profitMargin = financialSummary?.monthlyProfitMargin || 0;
    let consumptionChangePct = 5; // Valeur par défaut
    if (stockPercent < 30) {
      consumptionChangePct = -10;
    } else if (profitMargin < 10) {
      consumptionChangePct = -5;
    }

    const snapshot = {
      mortalityPct: Math.max(0, Math.min(5, mortalityRate)),
      consumptionChangePct: consumptionChangePct,
      symptomCount: totalSymptoms, // Utilise le nombre réel de symptômes
      lastVaccineDays: lastVaccineDays, // Utilise les jours depuis le dernier vaccin réel
      stockPercent: Math.max(0, Math.min(100, stockPercent)),
    };
  
    const aiResult = heuristicsModel(snapshot);
    const finalHealthScore = 100 - (aiResult?.riskScore || 0);

    return Math.round(finalHealthScore); // Le calcul ne se fera que si ces données changent
  }, [isDataLoading, lots, stock, financialSummary]);

  const loadUserProfile = useCallback(async () => {
    if (!user) return;
    try {
      setProfileLoading(true); // Keep loading state
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('full_name, farm_name, role') // <-- Sélectionne le rôle
        .eq('user_id', user.id)
        .maybeSingle();

      if (profileError) {
        console.error('❌ Erreur de récupération du profil:', profileError);
      } else if (profileData) {
        setUserProfile(profileData);
      } else {
        setUserProfile({ full_name: 'Utilisateur', farm_name: '' });
      }
    } catch (error) {
      console.error('❌ Erreur inattendue lors du chargement du profil:', error);
    } finally {
      setProfileLoading(false);
    }
  }, [user]);

  // --- NOUVEAU : Charger les produits du marketplace ---
  const loadMarketplaceProducts = useCallback(async () => {
    if (!user) return;
    try {
      console.log('🛒 Dashboard: Loading marketplace products...');
      const { data, error } = await supabase
        .from('marketplace_products')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      console.log(`✅ Dashboard: Loaded ${data?.length || 0} marketplace products.`);
      setMarketplaceProducts(data || []);
    } catch (error) {
      console.error('❌ Dashboard: Error loading marketplace products:', error);
    }
  }, [user]);


  const loadOverdueVaccinations = useCallback(async () => {
    // Ne charge les vaccins que si l'utilisateur a accès à la fonctionnalité
    if (!subscription || !subscription.features?.sanitary_prophylaxis) {
      setOverdueVaccinations([]);
      return;
    }
    if (!user) return;
    try {
      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('vaccinations')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .lt('due_date', today);

      if (error) throw error;

      setOverdueVaccinations(data || []);
    } catch (error) {
      console.error('❌ Error loading overdue vaccinations:', error);
    } finally {
      // Pas de chargement global pour les vaccins, car ils sont chargés en parallèle
    }
  }, [user, subscription]);

  const { activeLots, totalBirds, cumulativeMortalityRate, cumulativeMortalityStatus, healthScoreColor } = useMemo(() => {
    const activeLots = lots?.filter(lot => lot.status === 'active') || [];
    const totalBirds = activeLots.reduce((sum, lot) => sum + (lot.quantity || 0), 0);
    const lotsForCalc = activeLots.filter(lot => typeof lot.initial_quantity === 'number' && lot.initial_quantity > 0);
    const totalMortalityCalc = lotsForCalc.reduce((sum, lot) => sum + (lot.mortality || 0), 0);
    const totalInitialQuantity = lotsForCalc.reduce((sum, lot) => sum + lot.initial_quantity, 0);
    const cumulativeMortalityRate = totalInitialQuantity > 0 ? (totalMortalityCalc / totalInitialQuantity) * 100 : 0;
    const cumulativeMortalityStatus = cumulativeMortalityRate > 1 ? 'Élevé' : 'Normal';
    const getHealthScoreColor = (score: number) => {
      if (score >= 80) return '#10996E'; if (score >= 50) return '#FF9800'; return '#E53935';
    };
    const healthScoreColor = getHealthScoreColor(healthScore);
    return { activeLots, totalBirds, cumulativeMortalityRate, cumulativeMortalityStatus, healthScoreColor };
  }, [lots, healthScore]);


  // --- CORRECTION : Déplacer la définition des variables en dehors de useMemo ---
  const criticalNotifications = allNotifications?.filter(
    n => !n.read && ['new_order', 'delivery_request', 'stock_alert'].includes(n.type)
  ) || [];
  const lowStockItems = stock.filter(item => item.quantity <= item.minThreshold);

  const criticalAlertsCount = useMemo(() => {
    // --- CORRECTION : Logique centralisée pour les alertes ---
    // 1. Alertes de stock bas
    const lowStock = stock.filter(item => item.quantity <= item.min_threshold);
    // 2. Alertes de santé (si le score est en dessous d'un certain seuil)
    const healthAlert = healthScore < 50 ? 1 : 0;
    // 3. Alertes de vaccins en retard
    const overdueVaccineCount = overdueVaccinations.length;
    
    // --- LOGS DE FIABILITÉ ---
    console.log('📊 Calcul des alertes critiques...');
    console.log(`  - Stock items received: ${stock.length}`);
    if (lowStock.length > 0) {
      console.log('  - ✅ Low stock items DETECTED:', lowStock.map(i => ({ name: i.name, qty: i.quantity, min: i.min_threshold })));
    } else {
      console.log('  - 🟢 No low stock items found.');
    }
    console.log(`  - Alerte santé (score < 50): ${healthAlert}`);
    console.log(`  - Vaccins en retard: ${overdueVaccineCount}`);
    // --- FIN DES LOGS ---

    const total = lowStock.length + healthAlert + overdueVaccineCount;
    
    const alertDetails = [];
    if (lowStock.length > 0) alertDetails.push(`${lowStock.length} stock(s) bas`);
    if (healthAlert > 0) alertDetails.push('Santé faible');
    if (overdueVaccineCount > 0) alertDetails.push(`${overdueVaccineCount} vaccin(s) en retard`);

    const subtitle = alertDetails.length > 0 ? alertDetails.join(', ') : 'Aucune alerte';
    console.log(`  => Total: ${total}, Sous-titre: ${subtitle}`);

    return {
      count: total,
      subtitle: subtitle,
    };
  }, [stock, healthScore, overdueVaccinations]);

  const dynamicColors = themeColors || colors; // Utilisation des couleurs du thème avec fallback

  const getUserDisplayName = () => userProfile?.full_name || 'Utilisateur';

  const getFarmDisplayName = () => userProfile?.farm_name || '';

  const handleFABPress = () => {
    if (activeTab === 'dashboard') { // 'dashboard' est un identifiant, pas du texte visible
      setIsAddTaskVisible(true);
    }
  };

  const handleAddTask = (taskData: any) => {
    // Logique pour ajouter une tâche
    setIsAddTaskVisible(false);
  };

  const handleMenuPress = () => setDrawerOpen(true);
  
  const handleDismissBlinkingNotification = (id: string) => markAsRead(id);

  const importantUnreadNotification = allNotifications.find(
    n => !n.read && ['new_order', 'delivery_request', 'stock_alert'].includes(n.type)
  );
  
  const handleBlinkingNotificationPress = () => router.push('/notifications');
  
  const renderDrawerContent = () => (
    <ScrollView style={[styles.drawerContent, { backgroundColor: dynamicColors.background }]}>
      <View style={styles.drawerHeader}>
        {/* <AviprodLogo /> */}
        <View style={styles.drawerDivider} />
        <View style={styles.drawerProfile}>
          <View style={styles.drawerAvatar}>
            <Text style={styles.drawerAvatarText}>
              {getUserDisplayName().charAt(0)?.toUpperCase() || 'U'}
            </Text>
          </View>
          <View style={styles.drawerProfileInfo}>
            <Text style={[styles.drawerProfileName, { color: dynamicColors.text }]}>
              PDG {getUserDisplayName()}
            </Text>
            <Text style={[styles.drawerProfileEmail, { color: dynamicColors.textSecondary }]}>
              {user?.email || ''}
            </Text>
            <View style={styles.drawerSubscription}>
              <Text style={[styles.drawerSubscriptionText, { color: dynamicColors.primary }]}>
                Plan: {subscription?.plan?.name || 'Freemium'}
              </Text>
              <View style={styles.drawerAvicoins}>
                <Icon name="cash" size={14} color={dynamicColors.warning} />
                <Text style={[styles.drawerAvicoinsText, { color: dynamicColors.warning }]}>
                  {avicoins?.balance ?? 0} Avicoins
                </Text>
              </View>
            </View>
          </View>
        </View>
      </View>

      <View style={[styles.drawerMenu, { flex: 1 }]}>
        <TouchableOpacity style={styles.drawerItem} onPress={() => { setDrawerOpen(false); router.push('/profile'); }}>
          <Icon name="person" size={24} color={dynamicColors.text} />
          <Text style={[styles.drawerItemText, { color: dynamicColors.text }]}>Modifier le Profil</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.drawerItem} onPress={() => { setDrawerOpen(false); router.push('/subscription-plans'); }}>
          <Icon name="card" size={24} color={dynamicColors.text} />
          <Text style={[styles.drawerItemText, { color: dynamicColors.text }]}>Abonnements</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.drawerItem} onPress={() => { setDrawerOpen(false); }}>
          <Icon name="lock-closed" size={24} color={dynamicColors.text} />
          <Text style={[styles.drawerItemText, { color: dynamicColors.text }]}>Changer le Mot de Passe</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.drawerItem} onPress={() => { setDrawerOpen(false); router.push('/settings'); }}>
          <Icon name="settings" size={24} color={dynamicColors.text} />
          <Text style={[styles.drawerItemText, { color: dynamicColors.text }]}>Paramètres</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.drawerItem} onPress={() => { setDrawerOpen(false); router.push('/help-support'); }}>
          <Icon name="help-circle" size={24} color={dynamicColors.text} />
          <Text style={[styles.drawerItemText, { color: dynamicColors.text }]}>Aide & Support</Text>
        </TouchableOpacity>

        {userProfile?.role === 'admin' && (
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

        {/* Ce diviseur doit toujours être là, qu'on soit admin ou non */}
        <View style={styles.drawerDivider} />

        <TouchableOpacity style={[styles.drawerItem, styles.drawerLogout]} onPress={() => { setDrawerOpen(false); handleLogout(); }}>
          <Icon name="log-out" size={24} color={dynamicColors.error} />
          <Text style={[styles.drawerItemText, { color: dynamicColors.error }]}>Déconnexion</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  // --- CORRECTION : Optimisation du chargement financier ---
  const loadFinancialSummary = useCallback(async () => {
    if (!user) {
      setFinancialSummary(null);
      return;
    }
    try {
      setFinanceLoading(true);
      console.log('💰 Dashboard: Calling RPC get_monthly_financial_summary...');

      // Appel de la fonction RPC avec l'ID de l'utilisateur
      const { data, error } = await supabase.rpc('get_monthly_financial_summary', {
        p_user_id: user.id
      });

      if (error) {
        throw error;
      }

      console.log('✅ Dashboard: Received financial summary from RPC:', data);

      // Mettre à jour l'état avec les données directement reçues de la fonction
      setFinancialSummary({
        weeklyProfitMargin: 0, // Le calcul hebdomadaire est retiré pour la performance
        weeklyProfit: 0,
        monthlyProfitMargin: data.monthlyProfitMargin,
        monthlyProfit: data.monthlyProfit,
        revenue: data.revenue,
        expenses: data.expenses,
      });

    } catch (error) {
      console.error('Error loading financial summary:', error);
      setFinancialSummary(null);
    } finally {
      setFinanceLoading(false);
    }
  }, [user]);
  
  const handleLogout = async () => {
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
  };

  // --- NOUVEAU : Fusionner les publicités et les produits sponsorisés ---
  const carouselItems = [
    ...ads.map(ad => ({
      id: ad.id,
      title: ad.title,
      subtitle: ad.subtitle,
      image_url: ad.image_url,
      target_url: ad.target_url,
    })),
    ...sponsoredRecommendations.map(product => {
      // Déterminer la raison de la recommandation
      let reason = "Suggestion pour vous";
      if (healthScore < 60 && ['Médicaments', 'Santé', 'Vitamines'].includes(product.category)) {
        reason = "Recommandé pour la santé de vos lots";
      } else if (financialSummary?.monthlyProfitMargin && financialSummary.monthlyProfitMargin < 10 && product.category && ['Alimentation économique', 'Additifs'].includes(product.category)) {
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
  ];

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
            {false && unreadMessages > 0 && (
                <View style={[styles.badge, { backgroundColor: colors.error }]}>
                  <Text style={[styles.badgeText, { color: colors.white }]}>{unreadMessages}</Text>
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
          {!profileLoading && userProfile && !userProfile.farm_name && (
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

          {/* 4. Notification d'urgence clignotante */}
          {importantUnreadNotification && (
            <BlinkingNotification
              id={importantUnreadNotification.id}
              title="Alerte Critique"
              message={importantUnreadNotification.message}
              count={1} // Simplifié, pourrait être dynamique
              icon="warning"
              onPress={handleBlinkingNotificationPress}
              onDismiss={handleDismissBlinkingNotification}
            />
          )}

          {/* 5. Aperçu Rapide (KPIs) - Grille 2 Colonnes */}
          <View style={styles.sectionContainer}>
            <View style={[styles.sectionHeader, { borderTopColor: dynamicColors.border }]}>
              <Text style={[styles.sectionTitle, { color: dynamicColors.text }]}>Aperçu Rapide</Text>
            </View>
            <View style={styles.kpiGrid}>
              {/* NOUVELLE CARTE : Santé Globale */}
              <View style={[styles.kpiBlock, { backgroundColor: dynamicColors.background, borderColor: dynamicColors.border }]}>
                {isDataLoading || financeLoading ? (
                  <>
                    <SkeletonPlaceholder width={30} height={30} style={{ marginBottom: 8 }} />
                    <SkeletonPlaceholder width="60%" height={22} style={{ marginBottom: 4 }} />
                    <SkeletonPlaceholder width="80%" height={14} style={{ marginBottom: 8 }} />
                  </>
                ) : (
                  <>
                    <Animated.Text style={[styles.kpiIcon, { transform: [{ scale: scaleAnim }] }]}>❤️</Animated.Text>
                    <Text style={[styles.kpiValue, { color: healthScoreColor }]}>{healthScore}%</Text>
                    <Text style={[styles.kpiDetail, { color: dynamicColors.textSecondary }]}>Mortalité: {cumulativeMortalityStatus}</Text>
                  </>
                )}
                <Text style={[styles.kpiLabel, { color: dynamicColors.text }]}>Santé Globale</Text>
              </View>

              {/* Lots Actifs */}
              <View style={[styles.kpiBlock, { backgroundColor: dynamicColors.background, borderColor: dynamicColors.border }]}>
                {isDataLoading ? (
                  <>
                    <SkeletonPlaceholder width={30} height={30} style={{ marginBottom: 8 }} />
                    <SkeletonPlaceholder width="40%" height={22} style={{ marginBottom: 4 }} />
                    <SkeletonPlaceholder width="60%" height={14} style={{ marginBottom: 8 }} />
                  </>
                ) : (
                  <>
                    <Text style={styles.kpiIcon}>🐔</Text>
                    <Text style={[styles.kpiValue, { color: activeLots.length === 0 ? '#FF9800' : '#10996E' }]}>{activeLots.length}</Text>
                    <Text style={[styles.kpiDetail, { color: dynamicColors.textSecondary }]}>{totalBirds} Volailles</Text>
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
                    <Text style={styles.kpiIcon}>📈</Text>
                    <View style={styles.profitContainer}>
                      <Text style={[styles.kpiValue, { color: (financialSummary?.monthlyProfitMargin ?? 0) >= 0 ? '#4CAF50' : '#E53935' }]}>
                        {financialSummary ? `${financialSummary.monthlyProfitMargin >= 0 ? '+' : ''}${financialSummary.monthlyProfitMargin.toFixed(1)}%` : 'N/A'}
                      </Text>
                    </View>
                    <Text style={[styles.kpiDetail, { color: dynamicColors.textSecondary }]}>
                      {financialSummary ? `Profit: ${financialSummary.monthlyProfit >= 0 ? '+' : ''}${financialSummary.monthlyProfit.toFixed(0)} CFA` : 'Données non dispo'}
                    </Text>
                  </>
                )}
                <Text style={[styles.kpiLabel, { color: dynamicColors.text }]}>Marge Nette J/M</Text>
              </View>
              {/* Alertes Critiques */}
              <View style={[styles.kpiBlock, { backgroundColor: dynamicColors.background, borderColor: dynamicColors.border }]}>
                {isDataLoading ? (
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
                    <Text style={[styles.kpiValue, { color: criticalAlertsCount?.count > 5 ? '#E53935' : criticalAlertsCount?.count > 0 ? '#FF9800' : '#10996E' }]}>{criticalAlertsCount?.count || 0}</Text>
                    <Text style={[styles.kpiDetail, { color: dynamicColors.textSecondary }]}>
                      {criticalAlertsCount.subtitle}
                    </Text>
                  </>
                )}
                <Text style={[styles.kpiLabel, { color: dynamicColors.text }]}>Alertes Critiques</Text>
              </View>
            </View>
          </View>

          {/* 6. Modules - Grille 3 Colonnes Compacte */}
          <View style={styles.sectionContainer}>
            <View style={[styles.sectionHeader, { borderTopColor: dynamicColors.border }]}>
              <Text style={[styles.sectionTitle, { color: dynamicColors.text }]}>Modules</Text>
            </View>
            <View style={styles.modulesGrid}>
              <TouchableOpacity style={[styles.moduleLink, { backgroundColor: dynamicColors.background, borderColor: dynamicColors.border }]} onPress={() => router.push('/lots')}>
                <Text style={styles.moduleEmoji}>🐔</Text>
                <Text style={[styles.moduleText, { color: dynamicColors.text }]}>Lots</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.moduleLink, { backgroundColor: dynamicColors.background, borderColor: dynamicColors.border }]} onPress={() => router.push('/marketplace')}>
                <Text style={styles.moduleEmoji}>🛒</Text>
                <Text style={[styles.moduleText, { color: dynamicColors.text }]}>Marché</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.moduleLink, { backgroundColor: dynamicColors.background, borderColor: dynamicColors.border }]} onPress={() => router.push('/finance')}>
                <Text style={styles.moduleEmoji}>💰</Text>
                <Text style={[styles.moduleText, { color: dynamicColors.text }]}>Finance</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.moduleLink, { backgroundColor: dynamicColors.background, borderColor: dynamicColors.border }]} onPress={() => router.push('/stock')}>
                <Text style={styles.moduleEmoji}>📦</Text>
                <Text style={[styles.moduleText, { color: dynamicColors.text }]}>Stock</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.moduleLink, { backgroundColor: dynamicColors.background, borderColor: dynamicColors.border }]} onPress={() => router.push('/delivery-dashboard')}>
                <Text style={styles.moduleEmoji}>📝</Text>
                <Text style={[styles.moduleText, { color: dynamicColors.text }]}>Suivi</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.moduleLink, { backgroundColor: dynamicColors.background, borderColor: dynamicColors.border }]} onPress={() => router.push('/feeding')}>
                <Text style={styles.moduleEmoji}>🍎</Text>
                <Text style={[styles.moduleText, { color: dynamicColors.text }]}>Rations</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.moduleLink, { backgroundColor: dynamicColors.background, borderColor: dynamicColors.border }]} onPress={() => router.push('/health')}>
                <Text style={styles.moduleEmoji}>❤️</Text>
                <Text style={[styles.moduleText, { color: dynamicColors.text }]}>Santé</Text>
              </TouchableOpacity>
              {subscription?.status === 'active' && (
                <>
                  <TouchableOpacity style={[styles.moduleLink, { backgroundColor: dynamicColors.background, borderColor: dynamicColors.border }]} onPress={() => router.push('/ai-analysis')}>
                    <Text style={styles.moduleEmoji}>🤖</Text>
                    <Text style={[styles.moduleText, { color: dynamicColors.text }]}>IA</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>

          {/* 7. Section Administration (pour les admins seulement) */}
          {/* Déplacée dans le drawer */}
          
          {/* ... autres éléments non visibles (BlinkingNotification, TaskCard, etc.) peuvent être ajoutés ici ... */}
          
          <View style={styles.bottomPadding} />
        </ScrollView>

        {/* FAB et Bottom Navigation (conservés) */}
        <FloatingActionButton onPress={handleFABPress} iconName="add" />
        <BottomNavigation activeTab={activeTab} onTabPress={(tab) => {
          if (tab === 'dashboard') setActiveTab('dashboard');
          else if (tab === 'lots') router.push('/lots');
          else if (tab === 'marketplace') router.push('/marketplace');
          else if (tab === 'feeding') router.push('/feeding');
          else if (tab === 'health') router.push('/health');
        }} />

        {/* BottomSheet pour Ajouter Tâche (conservé) */}
        <SimpleBottomSheet
          isVisible={isAddTaskVisible}
          onClose={() => setIsAddTaskVisible(false)}
        >
          <AddTaskForm
            onSubmit={handleAddTask}
            onCancel={() => setIsAddTaskVisible(false)}
          />
        </SimpleBottomSheet>
      </SafeAreaView>
    </Drawer>
  );
}

export default FarmerDashboard;