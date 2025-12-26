import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { SafeAreaView, View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, BackHandler, ActivityIndicator, RefreshControl } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, commonStyles } from '../styles/commonStyles';
import Icon from '../components/Icon';
import SimpleBottomSheet from '../components/BottomSheet';
import MedicalProphylaxis from '../components/health/MedicalProphylaxis';
import HealthUpdateForm from '../components/health/HealthUpdateForm';
import ProphylaxisPlan from '../components/health/SanitaryProphylaxis';
import MedicalProphylaxisPlan from '../components/health/MedicalProphylaxisPlan';
import AddVaccinationForm from '../components/health/AddVaccinationForm'; // Importer le nouveau formulaire
import { useAuth } from '../hooks/useAuth';
import LiveAIRecommendations from '../components/LiveAIRecommendations'; // --- NOUVEAU : Importer le composant de recommandations ---
import { useSubscription } from '../contexts/SubscriptionContext'; // --- NOUVEAU : Importer le hook d'abonnement fiable ---
import { heuristicsModel, AIResult } from '../lib/liveAI';
import { supabase } from '../config';

interface HistoryItem {
  id: string;
  type: 'analyse' | 'vaccin';
  title: string;
  date: string;
}

export default function HealthScreen() {
  const [isProphylaxisVisible, setIsProphylaxisVisible] = useState(false);
  const [isHealthUpdateVisible, setIsHealthUpdateVisible] = useState(false);
  const [isSanitaryVisible, setIsSanitaryVisible] = useState(false);
  const [isMedicalPlanVisible, setIsMedicalPlanVisible] = useState(false);
  const [isAddVaccinationVisible, setIsAddVaccinationVisible] = useState(false); // Nouvel état
  const [healthData, setHealthData] = useState<{ kpis: any, lots: any[] } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [stockData, setStockData] = useState<any | null>(null); // --- NOUVEAU : Pour les données de stock ---
  const [aiResult, setAiResult] = useState<AIResult | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedLotId, setSelectedLotId] = useState<string | null>(null);

  const { user } = useAuth();
  const { subscription } = useSubscription(); // --- NOUVEAU : Utiliser le contexte d'abonnement ---

  const loadScreenData = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      console.log('❤️ Health Screen: Loading all data...');
      const [healthResult, stockResult] = await Promise.all([
        supabase.rpc('get_health_dashboard_overview', { p_user_id: user.id }),
        supabase.rpc('get_stock_overview', { p_user_id: user.id }) // --- NOUVEAU : Appel RPC pour le stock ---
      ]);

      if (healthResult.error) throw healthResult.error;
      if (stockResult.error) throw stockResult.error;

      console.log('✅ Received health overview from RPC:', healthResult.data);
      console.log('✅ Received stock overview from RPC:', stockResult.data);
      setHealthData(healthResult.data);
      setStockData(stockResult.data); // --- NOUVEAU : Sauvegarder les données de stock ---

      // --- NOUVEAU : Exécuter l'analyse IA avec les données de la RPC ---
      // --- CORRECTION : Utiliser les données de santé ET de stock pour une analyse plus complète ---
      if (healthResult.data && healthResult.data.kpis && healthResult.data.lots.length > 0 && stockResult.data) {
        const { kpis: healthKpis, lots } = healthResult.data;
        const { kpis: stockKpis } = stockResult.data;

        // Calculer le pourcentage de stock restant (plus pertinent que la valeur absolue)
        const totalInitialStock = stockResult.data.items.reduce((sum: number, item: any) => sum + (item.initial_quantity || 0), 0);
        const totalCurrentStock = stockResult.data.items.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0);
        const stockPercent = totalInitialStock > 0 ? (totalCurrentStock / totalInitialStock) * 100 : 100;

        // --- NOUVEAU : Calculer la couverture des rations ---
        // Pourcentage de lots actifs qui ont une ration assignée
        const lotsWithRation = lots.filter(lot => lot.has_ration_assigned).length;
        const activeLotsCount = lots.filter(lot => lot.status === 'active').length;
        const rationCoverage = activeLotsCount > 0 ? (lotsWithRation / activeLotsCount) * 100 : 100;

        // --- NOUVEAU : Calculer la consommation journalière totale et son changement ---
        const totalDailyFeedConsumptionKg = stockResult.data.items.reduce((sum: number, item: any) => {
          if (item.category === 'feed' && item.daily_consumption) {
            return sum + item.daily_consumption; // Assuming daily_consumption is in kg
          }
          return sum;
        }, 0);

        const totalBirds = healthKpis.total_birds || 0;
        let consumptionChangePct = 0;
        let consumptionChangeReason: 'low_ration' | 'low_stock' | 'low_profit' | 'good' | 'normal' | null = 'normal';

        if (totalBirds > 0) {
          const averageConsumptionPerBirdKg = totalDailyFeedConsumptionKg / totalBirds;
          const idealConsumptionPerBirdKg = 0.1; // Example: 100g/bird/day, adjust as needed

          consumptionChangePct = ((averageConsumptionPerBirdKg - idealConsumptionPerBirdKg) / idealConsumptionPerBirdKg) * 100;
          consumptionChangePct = parseFloat(consumptionChangePct.toFixed(1));
        }

        const snapshot = {
          mortalityPct: healthKpis.average_mortality_rate || 0,
          symptomCount: healthKpis.total_symptom_count || 0,
          // Utilise la valeur du premier lot pour les jours depuis le dernier vaccin
          lastVaccineDays: lots[0].days_since_last_vaccine || 90,
          // --- NOUVEAU : Inclure la couverture des rations dans l'analyse ---
          rationCoverage: rationCoverage,
          // --- CORRECTION : Utiliser les vraies données de consommation et de stock ---
          consumptionChangePct: consumptionChangePct,
          stockPercent: stockPercent,
        };
        console.log('🧠 Building snapshot for LiveAI:', snapshot);
        const result = heuristicsModel(snapshot);
        setAiResult(result);
      }
    } catch (error: any) {
      console.error("Error loading health screen data:", error);
      Alert.alert("Erreur", "Impossible de charger les données de l'écran de santé.");
      setHealthData(null);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadScreenData();
      const onBackPress = () => {
        router.replace('/dashboard');
        return true;
      };
      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => subscription.remove();
    }, [loadScreenData])
  );

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadScreenData().finally(() => setIsRefreshing(false));
  }, [loadScreenData]);

  const handleHealthUpdate = useCallback(() => { // Renamed from onUpdate
    loadScreenData();
  }, [loadScreenData]);

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

  const { global_health_score, average_mortality_rate, total_symptom_count } = healthData?.kpis || {};
  const hasValidData = healthData && healthData.kpis;

  const handleProphylaxisPress = () => {
    // --- CORRECTION : Ouvre la sélection de lot au lieu d'un plan générique ---
    if (healthData && healthData.lots.length > 0) {
      setIsMedicalPlanVisible(true); // Ouvre la modale de sélection de lot
    } else {
      Alert.alert("Aucun lot actif", "Vous devez avoir au moins un lot actif pour voir un plan de vaccination.");
    }
  };

  const handleSanitaryPlanPress = () => {
    if (healthData && healthData.lots.length > 0) {
      setIsSanitaryVisible(true); // Ouvre la modale de sélection de lot
    } else {
      Alert.alert("Aucun lot actif", "Vous devez avoir au moins un lot actif pour voir un plan sanitaire.");
    }
  };

  const handleAiAnalysisPress = () => {
    // --- CORRECTION : Vérifier le statut de l'abonnement depuis le bon contexte ---
    if (subscription?.status === 'active') {
      router.push('/ai-analysis');
    } else {
      router.push('/subscription-plans');
    }
  };

  const renderHistoryItem = (item: HistoryItem) => (
    <View key={item.id} style={styles.historyItem}>
      <Icon name={'hardware-chip'} size={24} color={item.type === 'vaccin' ? colors.primary : colors.orange} />
      <View style={styles.historyTextContainer}>
        <Text style={styles.historyTitle}>{item.title}</Text>
        <Text style={styles.historyDate}>{new Date(item.date).toLocaleDateString()}</Text>
      </View>
    </View>
  );

  if (isLoading && !healthData) {
    return (
      <SafeAreaView style={styles.loadingSafeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Récupération des lots, veuillez patienter...</Text>
          <Text style={[styles.loadingText, { marginTop: 8, fontSize: 13 }]}>L'application attend les données de votre élevage avant de calculer les indicateurs.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient colors={['#1e3a8a', '#1e293b']} style={styles.headerGradient}>
        <View style={styles.headerContent}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.replace('/dashboard')}>
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
             <Text style={[styles.mainMetricValue, { color: hasValidData ? getHealthScoreColor(global_health_score) : colors.textSecondary }]}>{hasValidData ? `${Math.round(global_health_score)}%` : 'N/A'}</Text>
           </View>
         </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
      >
        <View style={styles.kpiGrid}>
           <View style={[styles.kpiCard, styles.kpiCardFull]}>
             <Icon name="trending-down" size={24} color={hasValidData ? getMortalityColor(average_mortality_rate) : colors.textSecondary} />
             <Text style={[styles.kpiValue, { color: hasValidData ? getMortalityColor(average_mortality_rate) : colors.textSecondary }]}>{hasValidData ? `${average_mortality_rate.toFixed(1)}%` : 'N/A'}</Text>
             <Text style={styles.kpiLabel}>Mortalité</Text>
           </View>
           <View style={[styles.kpiCard, styles.kpiCardHalf]}>
             <Icon name="pulse" size={24} color={hasValidData ? colors.warning : colors.textSecondary} />
             <Text style={[styles.kpiValue, { color: hasValidData ? colors.text : colors.textSecondary }]}>{total_symptom_count || 0}</Text>
             <Text style={styles.kpiLabel}>Symptômes</Text>
           </View>
           <View style={[styles.kpiCard, styles.kpiCardHalf]}>
             <Icon name="shield-checkmark" size={24} color={hasValidData ? colors.primary : colors.textSecondary} />
             <Text style={[styles.kpiValue, { color: hasValidData ? colors.text : colors.textSecondary }]}>{healthData?.lots[0]?.days_since_last_vaccine || 'N/A'}</Text>
             <Text style={styles.kpiLabel}>Jours depuis vaccin</Text>
           </View>
         </View>

        {/* La section des lots enrichis par la RPC */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🩺 Actions Sanitaires</Text>
          <View style={styles.actionsGrid}>
            <ActionCard title="Analyse par IA" subtitle="Scanner via photo" iconName="camera" onPress={handleAiAnalysisPress} />
            <ActionCard title="Ajouter Vaccin/Traitement" subtitle="Action rapide" iconName="add" onPress={() => setIsAddVaccinationVisible(true)} />
            <ActionCard title="Prophylaxie Médicale" subtitle="Voir le plan" iconName="shield-checkmark" onPress={handleProphylaxisPress} />
            <ActionCard title="Mise à Jour Quotidienne" subtitle="Malades & mortalité" iconName="pulse" onPress={() => { setSelectedLotId(null); setIsHealthUpdateVisible(true); }} />
            <ActionCard title="Prophylaxie Sanitaire" subtitle="Nettoyage & biosécurité" iconName="water" onPress={() => setIsSanitaryVisible(true)} />
          </View>
        </View>

        {healthData?.lots && healthData.lots.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>État des Lots Actifs</Text>
            {healthData.lots.map((lot: any) => (
              <View key={lot.id} style={styles.lotCard}>
                <Text style={styles.lotName}>{lot.name}</Text>
                <Text style={styles.lotDetail}>Score de Risque: <Text style={{fontWeight: 'bold', color: getHealthScoreColor(100 - lot.risk_score)}}>{lot.risk_score.toFixed(0)}</Text></Text>
                <Text style={styles.lotDetail}>Prochaine Tâche: {lot.next_prophylaxis_task?.title || 'Aucune'} (le {lot.next_prophylaxis_task ? new Date(lot.next_prophylaxis_task.due_date).toLocaleDateString() : ''})</Text>
              </View>
            ))}
          </View>
        )}

        {/* --- NOUVEAU : Affichage des recommandations de l'IA --- */}
        {aiResult && (
          <View style={[styles.section, { paddingHorizontal: 0 }]}>
            {/* --- CORRECTION : Utiliser le nouveau composant pour un affichage plus riche --- */}
            <LiveAIRecommendations 
              // --- CORRECTION : Passer les données brutes en plus du résultat de l'IA ---
              // Cela garantit que les métriques s'affichent même si l'IA ne retourne rien.
              result={{
                ...aiResult,
                mortalityPct: healthData?.kpis?.average_mortality_rate,
                stockPercent: (stockData?.items.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0) / stockData?.items.reduce((sum: number, item: any) => sum + (item.initial_quantity || 1), 1)) * 100,
                rationCoverage: (healthData?.lots.filter(l => l.has_ration_assigned).length / (healthData?.lots.length || 1)) * 100,
              }}
              onOrder={(productId) => router.push({ pathname: '/marketplace', params: { productId } })}
            />
          </View>
        )}

        <View style={styles.historySection}>
          <Text style={styles.sectionTitle}>Historique des analyses et vaccins</Text>
          {/* L'historique peut être ajouté à la RPC plus tard */}
          <View style={styles.emptyState}>
              <Icon name="time" size={48} color={colors.textSecondary} />
              <Text style={styles.emptyStateText}>Aucun historique récent</Text>
            </View>
        </View>
      </ScrollView>

      {/* --- CORRECTION : Ajout de la logique de sélection de lot pour le plan médical --- */}
      <SimpleBottomSheet isVisible={isMedicalPlanVisible} onClose={() => { setIsMedicalPlanVisible(false); setSelectedLotId(null); }}>
        {selectedLotId ? (
          <MedicalProphylaxisPlan
            lotId={selectedLotId} // Passe l'ID du lot au composant
            onClose={() => { setIsMedicalPlanVisible(false); setSelectedLotId(null); }}
            onBack={() => setSelectedLotId(null)} // --- NOUVEAU : Gère le clic sur la flèche de retour ---
            onAddVaccination={() => {
              setIsMedicalPlanVisible(false); // Ferme la modale du plan
              setIsAddVaccinationVisible(true); // Ouvre la modale d'ajout
            }}
          />
        ) : (
          <View style={styles.lotSelectorContainer}>
            <Text style={styles.sectionTitle}>Choisir un lot pour le plan médical</Text>
            {healthData?.lots.map((lot: any) => (
              <TouchableOpacity key={lot.id} style={styles.lotSelectorItem} onPress={() => setSelectedLotId(lot.id)}>
                <Text style={styles.lotSelectorText}>{lot.name}</Text>
                <Icon name="chevron-forward" size={24} color={colors.primary} />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </SimpleBottomSheet>

      <SimpleBottomSheet isVisible={isAddVaccinationVisible} onClose={() => setIsAddVaccinationVisible(false)}>
        <AddVaccinationForm
          onClose={() => setIsAddVaccinationVisible(false)}
          onSaveSuccess={loadScreenData} // Recharger les données après ajout
        />
      </SimpleBottomSheet>
      <SimpleBottomSheet isVisible={isHealthUpdateVisible} onClose={() => setIsHealthUpdateVisible(false)}>
        <HealthUpdateForm onClose={() => setIsHealthUpdateVisible(false)} onUpdate={handleHealthUpdate} />
      </SimpleBottomSheet>
      <SimpleBottomSheet isVisible={isSanitaryVisible} onClose={() => setIsSanitaryVisible(false)}>
        {selectedLotId ? (
          <ProphylaxisPlan lotId={selectedLotId} onClose={() => { setIsSanitaryVisible(false); setSelectedLotId(null); }} />
        ) : (
          <View style={styles.lotSelectorContainer}>
            <Text style={styles.sectionTitle}>Choisir un lot</Text>
            {healthData?.lots.map((lot: any) => (
              <TouchableOpacity key={lot.id} style={styles.lotSelectorItem} onPress={() => setSelectedLotId(lot.id)}>
                <Text style={styles.lotSelectorText}>{lot.name}</Text>
                <Icon name="chevron-forward" size={24} color={colors.primary} />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </SimpleBottomSheet>
    </SafeAreaView>
  );
}

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
  container: { flex: 1, backgroundColor: '#f8fafc' }, // Correction: fafc au lieu de f8f8fc
  headerGradient: { paddingBottom: 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerContent: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16 },
  backButton: { marginRight: 16 },
  headerTitle: { fontSize: 24, fontWeight: '900', color: '#fff' },
  headerSubtitle: { fontSize: 14, color: '#94a3b8' },
  headerMetrics: { paddingHorizontal: 20, marginTop: 16 },
  mainMetricCard: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000', // Ajout d'une ombre subtile
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  mainMetricLabel: { fontSize: 16, color: '#cbd5e1', fontWeight: '600', marginBottom: 8 },
  mainMetricValue: { fontSize: 48, fontWeight: '900', color: '#fff' },
  scrollView: { flex: 1, marginTop: -10 },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 16, gap: 12 },
  kpiCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3, width: '100%' },
  kpiCardHalf: { width: '48%' },
  kpiCardFull: { width: '100%' },
  kpiValue: { fontSize: 22, fontWeight: '800', color: colors.text, marginTop: 8 },
  kpiLabel: { fontSize: 12, color: colors.textSecondary, marginTop: 4, textAlign: 'center' },
  section: { paddingHorizontal: 16, marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 16 },
  historySection: { padding: 16 },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundAlt,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1, // Ajout d'une bordure fine
    borderColor: colors.border,
  },
  historyTextContainer: { flex: 1 },
  historyTitle: { fontSize: 16, fontWeight: '600', color: colors.text },
  historyDate: { fontSize: 14, color: colors.textSecondary, marginTop: 4 },
  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyStateText: { marginTop: 16, fontSize: 16, color: colors.textSecondary },
  loadingSafeArea: { flex: 1, backgroundColor: '#f8fafc' },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40, // Ajouter un padding pour que le texte ne soit pas collé aux bords
  },
  loadingText: { marginTop: 16, fontSize: 16, color: colors.textSecondary },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  actionCard: {
    width: '48%', // Pour une grille 2x2
    alignItems: 'center', // Centrer le contenu
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  actionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24, // Rendre le conteneur d'icône circulaire
    backgroundColor: colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12, // Espacer l'icône du texte
  },
  actionTextContainer: { flex: 1 },
  actionTitle: {
    fontSize: 14, // Réduire la taille pour la grille
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center', // Centrer le titre
  },
  actionSubtitle: {
    fontSize: 12, // Réduire la taille pour la grille
    color: colors.textSecondary,
    marginTop: 4,
    textAlign: 'center', // Centrer le sous-titre
  },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  authMessage: { fontSize: 16, color: colors.textSecondary, textAlign: 'center', marginTop: 16, marginBottom: 20 },
  authButton: { backgroundColor: colors.primary, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8 },
  authButtonText: { color: colors.white, fontSize: 16, fontWeight: '600' },
  lotCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  lotName: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 8 },
  lotDetail: { fontSize: 14, color: colors.textSecondary, marginBottom: 4 },
  aiResultCard: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  aiResultTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 8,
  },
  aiRecommendation: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
    marginBottom: 4,
  },
  lotSelectorContainer: {
    padding: 20,
  },
  lotSelectorItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.backgroundAlt,
    borderRadius: 12,
    marginBottom: 12,
  },
  lotSelectorText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
});
