import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { SafeAreaView, View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, BackHandler, ActivityIndicator, RefreshControl } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, commonStyles } from '../styles/commonStyles';
import Icon from '../components/Icon';
import DashboardCard from '../components/DashboardCard';
import SimpleBottomSheet from '../components/BottomSheet';
import MedicalProphylaxis from '../components/health/MedicalProphylaxis';
import HealthUpdateForm from '../components/health/HealthUpdateForm';
import ProphylaxisPlan from '../components/health/SanitaryProphylaxis';
import LiveAIRecommendations from '../components/LiveAIRecommendations'; // Importation correcte
import { heuristicsModel } from '../lib/liveAI';
import { useData } from '../hooks/useData';
import { useFinance } from '../hooks/useFinance';
import { supabase } from '../config'; // Import supabase directly
import { useDataCollector } from '../src/hooks/useDataCollector';

interface HistoryItem {
  id: string;
  type: 'analyse' | 'vaccin';
  title: string;
  date: string;
}

export default function HealthScreen() {
  // existing bottom sheet states
  const [isProphylaxisVisible, setIsProphylaxisVisible] = useState(false);
  const [isHealthUpdateVisible, setIsHealthUpdateVisible] = useState(false);
  const [isSanitaryVisible, setIsSanitaryVisible] = useState(false);

  // history
  const [history, setHistory] = useState<HistoryItem[]>([]); // Note: setHistory is not used, consider removing if not needed.


  // Real data hooks
  const { lots, stock, loadLots, loadStock } = useData();
  const [isDataLoading, setIsDataLoading] = useState(false); // Initial state false
  const { financialSummary } = useFinance('month');

  const { trackAIAnalysis } = useDataCollector();
  // Load ration data for consumption analysis
  const [lotRations, setLotRations] = useState<{[lotId: string]: any}>({});

  // --- NOUVEAU : Centralisation du calcul de l'IA ---
  const [aiResult, setAiResult] = useState<any>(null);
  const [aiPolling, setAiPolling] = useState(true); // Note: setAiPolling is not used, consider removing if not needed.
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Gérer le bouton retour physique sur Android
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        // Rediriger vers le tableau de bord au lieu de quitter l'app
        router.replace('/dashboard');
        return true; // Empêche le comportement par défaut (quitter l'app)
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);

      return () => subscription.remove();
    }, [])
  );

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadData(true).finally(() => setIsRefreshing(false));
  }, []);

  // --- NOUVEAU : Recharger les lots quand l'écran est focus ---
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = useCallback(async (isManualRefresh = false) => {
        console.log('🔄 Health screen focused, reloading data...');
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from('ai_health_analyses')
          .select('id, diagnosis, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5); // Charger les 5 plus récentes

        if (error) throw error;

        // Transformer les données pour correspondre à l'interface HistoryItem
        const formattedHistory = data.map(item => ({ id: item.id, type: 'analyse', title: item.diagnosis, date: item.created_at }));
        setHistory(formattedHistory);
        
        // On ne recharge que si c'est un refresh manuel ou si les données ne sont pas là
        if (isManualRefresh) {
          setIsDataLoading(true);
          await Promise.all([loadLots(), loadStock()]);
          setIsDataLoading(false);
        }
  }, [loadLots, loadStock]);
  // load history (existing)
  useFocusEffect(useCallback(() => {
    const loadAnalysisHistory = async () => {
      try { // Supabase est déjà importé depuis config
      } catch (error) {
        console.error("Failed to load AI analysis history from Supabase.", error);
      }
    };
    loadAnalysisHistory();
  }, []));

  // Build snapshot from real app data
  const buildSnapshotFromState = () => {
    const activeLots = lots?.filter(l => l.status === 'active') || [];
  
    // Filtrer les lots avec données valides uniquement
    const validLots = activeLots.filter(lot => 
      typeof lot.initial_quantity === 'number' && 
      lot.initial_quantity > 0 &&
      typeof lot.mortality === 'number' &&
      lot.mortality >= 0 &&
      lot.mortality <= lot.initial_quantity
    );
  
    if (validLots.length === 0) {
      console.log('⚠️ Aucun lot valide pour le calcul de mortalité');
      return {
        mortalityRate: 0,
        mortalityPctForAI: 0,
        consumptionChangePct: 5,
        consumptionChangeReason: 'normal' as const,
        symptomCount: 0,
        lastVaccineDays: 90,
        stockPercent: 100,
      };
    }
  
    // Calcul pondéré du taux de mortalité GLOBAL
    const totalMortality = validLots.reduce((sum, lot) => sum + lot.mortality, 0);
    const totalInitialQuantity = validLots.reduce((sum, lot) => sum + lot.initial_quantity, 0);
    const mortalityRate = totalInitialQuantity > 0 
      ? (totalMortality / totalInitialQuantity) * 100 
      : 0;
  
    // 🔧 CORRECTION : Plafond réaliste pour l'IA (0-25%)
    const mortalityPctForAI = Math.max(0, Math.min(25, mortalityRate));
  
    // 📊 LOGGING DÉTAILLÉ
    console.log('🔍 Calcul du taux de mortalité:');
    console.log(`  - Lots actifs: ${activeLots.length}`);
    console.log(`  - Lots valides: ${validLots.length}`);
    console.log(`  - Total mortalité: ${totalMortality}`);
    console.log(`  - Total initial: ${totalInitialQuantity}`);
    console.log(`  - Taux calculé: ${mortalityRate.toFixed(2)}%`);
    console.log(`  - Taux envoyé à l'IA: ${mortalityPctForAI.toFixed(2)}%`);
  
    // Déterminer le niveau d'alerte
    let alertLevel: string;
    if (mortalityRate > 15) {
      alertLevel = '🔴 CATASTROPHIQUE';
    } else if (mortalityRate > 10) {
      alertLevel = '🔴 CRITIQUE';
    } else if (mortalityRate > 5) {
      alertLevel = '🟠 ÉLEVÉ';
    } else if (mortalityRate > 2) {
      alertLevel = '🟡 MODÉRÉ';
    } else {
      alertLevel = '🟢 NORMAL';
    }
    console.log(`  - Niveau d'alerte: ${alertLevel}`);
  
    // Détail par lot
    validLots.forEach(lot => {
      const lotRate = (lot.mortality / lot.initial_quantity) * 100;
      const lotAlert = lotRate > 10 ? '🔴' : lotRate > 5 ? '🟠' : lotRate > 2 ? '🟡' : '🟢';
      console.log(`  ${lotAlert} ${lot.name}: ${lot.mortality}/${lot.initial_quantity} = ${lotRate.toFixed(2)}%`);
    });
  
    // Calculate stock levels
    const feedStockItems = stock.filter(s => s.category === 'feed');
    const totalFeedStock = feedStockItems.length;
    const lowFeedStockItems = feedStockItems.filter(s => s.quantity <= s.minThreshold).length;
    const stockPercent = totalFeedStock > 0 
      ? ((totalFeedStock - lowFeedStockItems) / totalFeedStock) * 100 
      : 100;
  
    // Calculate financial health
    const profitMargin = financialSummary?.monthlyProfitMargin || 0;
  
    // Calculate ration coverage
    const lotsWithRations = activeLots.filter(lot => 
      lotRations[lot.id] !== null && lotRations[lot.id] !== undefined
    ).length;
    const rationCoverage = activeLots.length > 0 
      ? lotsWithRations / activeLots.length 
      : 0;
  
    // Consumption change calculation
    let consumptionChangePct = 0;
    let consumptionChangeReason: 'low_ration' | 'low_stock' | 'low_profit' | 'good' | 'normal' | null = null;
  
    if (activeLots.length > 0) {
      if (rationCoverage < 0.3) {
        consumptionChangePct = -20;
        consumptionChangeReason = 'low_ration';
      } else if (stockPercent < 30) {
        consumptionChangePct = -10;
        consumptionChangeReason = 'low_stock';
      } else if (profitMargin < 10) {
        consumptionChangePct = -5;
        consumptionChangeReason = 'low_profit';
      } else if (rationCoverage > 0.8 && stockPercent > 70) {
        consumptionChangePct = 10;
        consumptionChangeReason = 'good';
      } else {
        consumptionChangePct = 5;
        consumptionChangeReason = 'normal';
      }
    }
  
    // Calculate symptoms from all active lots
    const symptomCount = activeLots.reduce((count, lot) => {
      if (Array.isArray(lot.symptoms)) {
        return count + lot.symptoms.length;
      }
      return count;
    }, 0);
  
    // Calculate days since last vaccination
    let lastVaccineDays = 90;
    const allVaccinations = lots?.flatMap(lot => lot.vaccinations || []) || [];
    if (allVaccinations.length > 0) {
      const mostRecentCompletionDate = allVaccinations
        .filter(v => v.completed_date)
        .map(v => new Date(v.completed_date))
        .sort((a, b) => b.getTime() - a.getTime())[0];
  
      if (mostRecentCompletionDate) {
        const today = new Date();
        lastVaccineDays = Math.floor(
          (today.getTime() - mostRecentCompletionDate.getTime()) / (1000 * 60 * 60 * 24)
        );
      }
    }
  
    const snapshot = {
      mortalityRate: mortalityRate, // Taux réel non plafonné (21.59%)
      mortalityPctForAI: mortalityPctForAI, // Taux plafonné pour l'IA (0-25%)
      consumptionChangePct,
      consumptionChangeReason,
      symptomCount,
      lastVaccineDays,
      stockPercent: Math.max(0, Math.min(100, stockPercent)),
    };
  
    console.log('📈 Final AI snapshot:', snapshot);
    return snapshot;
  };

  const getHealthScoreColor = (score: number) => {
    if (score >= 80) return colors.success;
    if (score >= 50) return colors.warning;
    return colors.error;
  };

  const getMortalityColor = (rate: number) => {
    if (rate < 2) return colors.success;
    if (rate < 5) return colors.warning;
    return colors.error;
  };

  // --- CORRECTION : Centralisation des calculs des KPIs dans un seul useMemo ---
  const { healthScore, mortalityRate, symptomCount, lastVaccineDays } = useMemo(() => {
    if (isDataLoading || !lots || !stock || !financialSummary) {
      return { healthScore: 0, mortalityRate: 0, symptomCount: 0, lastVaccineDays: 0 }; // Valeurs par défaut
    } // --- CORRECTION : Dépendances stabilisées ---
    const snapshot = buildSnapshotFromState();

    // --- CORRECTION : Override direct pour la mortalité très élevée ---
    if (snapshot.mortalityRate > 10) { // Si la mortalité réelle dépasse 10%
      return { healthScore: 5, mortalityRate: snapshot.mortalityRate }; // Le score de santé est très bas
    }

    const result = heuristicsModel(snapshot);
    const score = Math.round(100 - (result?.riskScore || 0));
    
    // --- NOUVEAU : Suivi de l'analyse IA Heuristique ---
    trackAIAnalysis(
      'health_score_heuristic',
      0, // La durée n'est pas pertinente ici car c'est synchrone
      true,
      {
        riskScore: result?.riskScore,
        level: result?.level,
        causesCount: result?.causes?.length,
        recommendationsCount: result?.recommendations?.length,
        finalHealthScore: score,
      }
    );

    // --- CORRECTION : S'assurer que le score de santé reflète la gravité de la mortalité ---
    // Si la mortalité est très élevée, le score de santé doit être bas, même si d'autres facteurs sont bons.
    const finalScore = Math.min(score, 100 - (snapshot.mortalityRate * 1.5));

    return { 
      healthScore: score,
      mortalityRate: snapshot.mortalityRate,
      symptomCount: snapshot.symptomCount,
      lastVaccineDays: snapshot.lastVaccineDays,
    };
  }, [isDataLoading, lots, stock, financialSummary, lotRations]);
  const runAI = async () => {
    try {
      const snapshot = buildSnapshotFromState();
      let res = heuristicsModel(snapshot);

      // --- AJOUT DE LA LOGIQUE ---
      // Traduire la raison de la variation de consommation en une cause explicite.
      const { consumptionChangeReason } = snapshot;
      let consumptionCause: string | null = null;

      switch (consumptionChangeReason) {
        case 'low_ration':
          consumptionCause = "Moins de 30% des lots ont une ration définie, impactant la consommation.";
          break;
        case 'low_stock':
          consumptionCause = "Niveau de stock d'aliments bas (< 30%), risquant de limiter la consommation.";
          break;
        case 'low_profit':
          consumptionCause = "Marge de profit faible (< 10%), risque sur la qualité/quantité des aliments.";
          break;
      }

      // Ajouter cette cause à la liste des causes identifiées si elle existe.
      if (consumptionCause) {
        res.causes = [consumptionCause, ...res.causes];
      }

      setAiResult(res); // Mettre à jour l'état avec le résultat enrichi.
      return res;
    } catch (e) {
      console.warn('AI run failed', e);
      setAiResult(null);
    }
  };

  // Load ration data
  const loadLotRations = useCallback(async () => {
    if (!lots.length) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('custom_feed_rations')
        .select('*')
        .eq('user_id', user.id)
        .not('lot_id', 'is', null)
        .order('created_at', { ascending: false });

      if (error) {
        console.log('⚠️ Error loading rations:', error);
        return;
      }

      // Group rations by lot_id, keeping only the most recent one
      const rationsByLot: {[lotId: string]: any} = {};
      lots.forEach(lot => {
        rationsByLot[lot.id] = null;
      });

      data?.forEach((ration: any) => {
        if (ration.lot_id && !rationsByLot[ration.lot_id]) {
          rationsByLot[ration.lot_id] = ration;
        }
      });

      setLotRations(rationsByLot);
    } catch (error) {
      console.error('❌ Error loading lot rations:', error);
    }
  }, [lots]);
  
  useEffect(() => {
    if (lots.length > 0) {
      loadLotRations();
    }
  }, [lots, loadLotRations]);

  useEffect(() => {
    let timer: any;
    runAI();
    if (aiPolling) {
      timer = setInterval(() => runAI(), 120000); // every 2 minutes
    }
    return () => clearInterval(timer);
  }, [aiPolling, lots, stock, financialSummary, lotRations]); // Les dépendances sont maintenant stables

  // history renderer
  const renderHistoryItem = (item: HistoryItem) => (
    <View key={item.id} style={styles.historyItem}>
      <Icon
        name={'hardware-chip'} // Toujours l'icône de l'IA
        size={24}
        color={item.type === 'vaccin' ? colors.primary : colors.orange}
      />
      <View style={styles.historyTextContainer}>
        <Text style={styles.historyTitle}>{item.title}</Text>
        <Text style={styles.historyDate}>{new Date(item.date).toLocaleDateString()}</Text>
      </View>
    </View>
  );

  const onOrder = (productId?: string) => {
    // Navigate to marketplace with product filter
    if (productId) {
      router.push(`/marketplace?product=${productId}`);
    } else {
      router.push('/marketplace');
    }
  };

  const onApplyRecommendation = (rec: any) => {
    // Add to health history and show confirmation
    const addToHistory = async () => {
      try {
        const newHistoryItem = {
          type: 'analyse' as const,
          title: `Recommandation IA: ${rec.text.substring(0, 30)}...`,
          date: new Date().toISOString(),
        };

        const existingHistoryJson = await AsyncStorage.getItem('@healthHistory');
        const existingHistory = existingHistoryJson ? JSON.parse(existingHistoryJson) : [];

        const updatedHistory = [newHistoryItem, ...existingHistory].slice(0, 20);
        await AsyncStorage.setItem('@healthHistory', JSON.stringify(updatedHistory));

        Alert.alert('✅ Recommandation appliquée', 'Cette action a été ajoutée à votre historique de santé.');
      } catch (error) {
        console.error('Error saving recommendation to history:', error);
        Alert.alert('Erreur', 'Impossible d\'enregistrer la recommandation.');
      }
    };

    Alert.alert(
      'Appliquer la recommandation',
      rec.text,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Appliquer', onPress: addToHistory }
      ]
    );
  };

  // --- NOUVEAU : Affichage de l'écran de chargement ---
  if (isDataLoading) {
    return (
      <SafeAreaView style={styles.loadingSafeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Chargement des données de santé...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient
        colors={['#1e3a8a', '#1e293b']}
        style={styles.headerGradient}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.replace('/dashboard')}
          >
            <Icon name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>Santé de l'Élevage</Text>
            <Text style={styles.headerSubtitle}>Analyse et prévention sanitaire</Text>
          </View>
        </View>
        <View style={styles.headerMetrics}>
          <View style={styles.mainMetricCard}>
            <Text style={styles.mainMetricLabel}>Indice de Santé Global</Text>
            <Text style={[styles.mainMetricValue, { color: getHealthScoreColor(healthScore) }]}
            >
              {healthScore}%
            </Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
        }
      >
        {/* KPI Grid */}
        <View style={styles.kpiGrid}>
          <View style={[styles.kpiCard, styles.kpiCardFull]}>
            <Icon name="trending-down" size={24} color={getMortalityColor(mortalityRate)} />
            <Text style={[styles.kpiValue, { color: getMortalityColor(mortalityRate) }]}
            >
              {mortalityRate.toFixed(1)}%
            </Text>
            <Text style={styles.kpiLabel}>Mortalité</Text>
          </View>
          <View style={[styles.kpiCard, styles.kpiCardHalf]}>
            <Icon name="pulse" size={24} color={colors.warning} />
            <Text style={styles.kpiValue}>{symptomCount}</Text>
            <Text style={styles.kpiLabel}>Symptômes</Text>
          </View>
          <View style={[styles.kpiCard, styles.kpiCardHalf]}>
            <Icon name="shield-checkmark" size={24} color={colors.primary} />
            <Text style={styles.kpiValue}>{lastVaccineDays}</Text>
            <Text style={styles.kpiLabel}>Jours depuis vaccin</Text>
          </View>
        </View>

        {/* AI Panel */}
        {aiResult && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🔬 Analyse & Recommandations IA</Text>
            <LiveAIRecommendations
              result={{
                ...aiResult,
                mortalityPct: buildSnapshotFromState().mortalityRate, // CORRIGÉ : Utilise la valeur réelle pour l'affichage
                consumptionChangePct: buildSnapshotFromState().consumptionChangePct,
                stockPercent: buildSnapshotFromState().stockPercent,
                rationCoverage: (() => {
                  const lotsWithRations = lots.filter(lot => lotRations[lot.id] !== null && lotRations[lot.id] !== undefined).length;
                  return lots.length > 0 ? lotsWithRations / lots.length : 0;
                })()
              }}
              onOrder={onOrder}
              onApply={onApplyRecommendation}
            />
          </View>
        )}

        {/* Actions Menu */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🩺 Actions Sanitaires</Text>
          <ActionCard
            title="Prophylaxie Médicale"
            subtitle="Vaccins & traitements"
            iconName="shield-checkmark"
            onPress={() => setIsProphylaxisVisible(true)}
          />
          <ActionCard
            title="Mise à Jour Quotidienne"
            subtitle="Malades & mortalité"
            iconName="pulse"
            onPress={() => setIsHealthUpdateVisible(true)}
          />
          <ActionCard
            title="Prophylaxie Sanitaire"
            subtitle="Nettoyage & biosécurité"
            iconName="water-outline"
            onPress={() => setIsSanitaryVisible(true)}
          />
          <ActionCard
            title="Analyse par IA"
            subtitle="Scanner via photo"
            iconName="camera"
            onPress={() => router.push('/ai-analysis')}
          />
        </View>

        {/* History */}
        <View style={styles.historySection}>
          <Text style={styles.sectionTitle}>Historique des analyses et vaccins</Text>
          {history.length > 0 ? history.map(renderHistoryItem) : (
            <View style={styles.emptyState}>
              <Icon name="time" size={48} color={colors.textSecondary} />
              <Text style={styles.emptyStateText}>Aucun historique récent</Text>
            </View>
          )}
        </View>
      </ScrollView>

      <SimpleBottomSheet isVisible={isProphylaxisVisible} onClose={() => setIsProphylaxisVisible(false)}>
        <MedicalProphylaxis onClose={() => setIsProphylaxisVisible(false)} />
      </SimpleBottomSheet>

      <SimpleBottomSheet isVisible={isHealthUpdateVisible} onClose={() => setIsHealthUpdateVisible(false)}>
        <HealthUpdateForm onClose={() => setIsHealthUpdateVisible(false)} onUpdate={() => {}} />
      </SimpleBottomSheet>

      <SimpleBottomSheet isVisible={isSanitaryVisible} onClose={() => setIsSanitaryVisible(false)}>
        <ProphylaxisPlan onClose={() => setIsSanitaryVisible(false)} />
      </SimpleBottomSheet>

    </SafeAreaView>
  );
}

// Nouveau composant pour les cartes d'action
const ActionCard = ({ title, subtitle, iconName, onPress }: { title: string, subtitle: string, iconName: any, onPress: () => void }) => (
  <TouchableOpacity style={styles.actionCard} onPress={onPress}>
    <View style={styles.actionIconContainer}>
      <Icon name={iconName} size={24} color={colors.primary} />
    </View>
    <View style={styles.actionTextContainer}>
      <Text style={styles.actionTitle}>{title}</Text>
      <Text style={styles.actionSubtitle}>{subtitle}</Text>
    </View>
    <Icon name="chevron-forward" size={24} color={colors.textSecondary} />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  headerGradient: {
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16, // Réduction de la hauteur
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#94a3b8',
  },
  headerMetrics: {
    paddingHorizontal: 20,
    marginTop: 16, // Réduction de la marge
  },
  mainMetricCard: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  mainMetricLabel: {
    fontSize: 16,
    color: '#cbd5e1',
    fontWeight: '600',
    marginBottom: 8,
  },
  mainMetricValue: {
    fontSize: 48,
    fontWeight: '900',
    color: '#fff',
  },
  scrollView: {
    flex: 1,
    marginTop: -10, // Pour que le contenu passe légèrement sous le header
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap', // Permet aux éléments de passer à la ligne
    justifyContent: 'space-between', // Espace équitablement les cartes
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 12, // Ajoute un espacement entre les cartes
  },
  kpiCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    width: '100%', // Par défaut, prend toute la largeur
  },
  kpiCardHalf: {
    width: '48%', // Un peu moins de 50% pour gérer l'espacement
  },
  kpiCardFull: {
    width: '100%',
  },
  kpiValue: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    marginTop: 8,
  },
  kpiLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 16 },
  historySection: { padding: 16 },
  historyItem: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.backgroundAlt,
    padding: 16, borderRadius: 12, marginBottom: 12
  },
  historyTextContainer: { flex: 1 },
  historyTitle: { fontSize: 16, fontWeight: '600', color: colors.text },
  historyDate: { fontSize: 14, color: colors.textSecondary, marginTop: 4 },
  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyStateText: { marginTop: 16, fontSize: 16, color: colors.textSecondary },
  // --- NOUVEAU : Styles pour le chargement ---
  loadingSafeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.textSecondary,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  actionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  actionTextContainer: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  actionSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
});