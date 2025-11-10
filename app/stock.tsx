import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { View, StyleSheet, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { colors } from '../styles/commonStyles';
import { useData } from '../hooks/useData'; // Assurez-vous que useData exporte aussi les lots
import Icon from '../components/Icon';
import SimpleBottomSheet from '../components/BottomSheet';
import FloatingActionButton from '../components/FloatingActionButton'; // Importer le bouton flottant
import AddStockItemForm from '../components/AddStockItemForm';
import { useLotIntelligence } from '../src/intelligence/agents/LotIntelligenceAgent'; // Importer l'agent
import { useStockPrediction } from '../src/intelligence/agents/StockPredictionAgent'; // Importer l'agent de prédiction
import { useDataCollector } from '../src/hooks/useDataCollector'; // Importer le collecteur
import { supabase } from '../config'; // Import supabase directly
import { StockItem } from '../types';

const StockItemCard = ({ item, dailyConsumption, prediction }: { item: StockItem, dailyConsumption: any, prediction: any }) => {
  const quantity = item.quantity || 0;
  const minThreshold = item.min_threshold || 0; // Assurez-vous que ce champ est bien récupéré
  const maxThreshold = item.max_threshold || minThreshold * 4 || quantity * 1.2;

  const stockPercentage = maxThreshold > 0 ? (quantity / maxThreshold) * 100 : 0;
  const totalDailyConsumption = dailyConsumption?.total || 0;
  const daysRemaining = totalDailyConsumption > 0 ? Math.floor(quantity / totalDailyConsumption) : Infinity;

  let status: 'ok' | 'low' | 'out' = 'ok';
  let statusColor = colors.success;
  if (quantity <= 0) {
    status = 'out';
    statusColor = colors.error;
  } else if (quantity <= minThreshold) {
    status = 'low';
    statusColor = colors.warning;
  }

  return (
    <View style={styles.itemCard}>
      <View style={styles.itemHeader}>
        <Text style={styles.itemName}>{item.name}</Text>
        <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={[styles.statusText, { color: statusColor }]}>
            {status === 'ok' ? 'OK' : status === 'low' ? 'Stock Bas' : 'Rupture'}
          </Text>
        </View>
      </View>
      <Text style={styles.itemCategory}>{item.category}</Text>

      <View style={styles.quantityContainer}>
        <Text style={styles.quantityText}>{quantity.toLocaleString()} <Text style={styles.unitText}>{item.unit}</Text></Text>
        {item.category === 'feed' && isFinite(daysRemaining) && totalDailyConsumption > 0 && (
          <View style={styles.daysRemainingContainer}>
            <Icon name="time-outline" size={14} color={colors.textSecondary} />
            <Text style={styles.daysRemainingText}>
              ~{daysRemaining} jour{daysRemaining > 1 ? 's' : ''} restant{daysRemaining > 1 ? 's' : ''}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.progressBarContainer}>
        <View style={[styles.progressBar, { width: `${Math.min(100, stockPercentage)}%`, backgroundColor: statusColor }]} />
      </View>

      {/* --- NOUVEAU : Affichage des lots consommateurs --- */}
      {dailyConsumption?.lots && dailyConsumption.lots.length > 0 && (
        <View style={styles.consumingLotsContainer}>
          <Text style={styles.consumingLotsTitle}>Consommé par :</Text>
          {dailyConsumption.lots.map((lot, index) => (
            <View key={index} style={styles.consumingLotItem}>
              <Text style={styles.consumingLotName}>• {lot.name}</Text>
              <Text style={styles.consumingLotAmount}>
                {lot.consumption.toFixed(2)} kg/jour
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* --- NOUVEAU : Affichage des prédictions IA --- */}
      {prediction && (
        <View style={styles.predictionContainer}>
          <View style={styles.predictionHeader}>
            <Icon name="bulb" size={16} color={colors.primary} />
            <Text style={styles.predictionTitle}>Prédiction IA</Text>
          </View>
          <View style={styles.predictionRow}>
            <Text style={styles.predictionLabel}>Date de réapprovisionnement suggérée :</Text>
            <Text style={styles.predictionValue}>{prediction.reorderDate.toLocaleDateString('fr-FR')}</Text>
          </View>
        </View>
      )}

      {/* --- NOUVEAU : Bouton d'action pour le réapprovisionnement --- */}
      {status === 'low' && (
        <TouchableOpacity
          style={styles.reorderButton}
          onPress={() => router.push(`/marketplace?search=${encodeURIComponent(item.name)}`)}
        >
          <Icon name="cart" size={16} color={colors.white} />
          <Text style={styles.reorderButtonText}>Acheter sur le Marketplace</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

export default function StockScreen() {
   // --- MODIFICATION : Ajout de la fonction de consommation autonome ---
   const { stock, lots, loadStock, loadLots, isLoading, runDailyStockConsumption } = useData();
   const [isRefreshing, setIsRefreshing] = useState(false);
   const [isAddFormVisible, setIsAddFormVisible] = useState(false);
   const { generateUpcomingFeedAlerts } = useLotIntelligence();
   const [feedChangeAlerts, setFeedChangeAlerts] = useState<any[]>([]);
   const { trackAction } = useDataCollector();
   const { predictStockLevels } = useStockPrediction();
   const [predictions, setPredictions] = useState<Map<string, any>>(new Map());
   const [consumptionData, setConsumptionData] = useState<{
     total: number;
     byItem: Map<string, { total: number; lots: { name: string; consumption: number }[] }>;
   }>({ total: 0, byItem: new Map() });

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    Promise.all([loadStock(), loadLots()]).finally(() => setIsRefreshing(false));
  }, [loadStock, loadLots]);

  useFocusEffect(
     useCallback(() => {
       loadStock();
       loadLots();
     }, [loadStock, loadLots])
   );

  // --- NOUVEAU : Générer les alertes quand les données sont prêtes ---
  useEffect(() => {
    if (lots.length > 0) {
      const alerts = generateUpcomingFeedAlerts(lots);
      // --- NOUVEAU : Suivi de l'agent d'alertes de ration ---
      trackAction('ai_ration_alert_generated', {
        alertCount: alerts.length,
        lotCount: lots.length,
      });
      setFeedChangeAlerts(alerts);
    }
  }, [lots]);

  // --- CORRECTION : Calculer la consommation totale uniquement lorsque les données sont prêtes ---
  useEffect(() => {
    const calculateConsumption = async () => {
      console.log('--- LANCEMENT DU CALCUL DE CONSOMMATION ---');

      if (!lots.length || !stock.length) {
        console.log('🔴 CALCUL ARRÊTÉ : Les lots ou le stock ne sont pas encore chargés.');
        console.log(`   - Lots chargés: ${lots.length > 0 ? '✅' : '❌'}`);
        console.log(`   - Stock chargé: ${stock.length > 0 ? '✅' : '❌'}`);
        return;
      }

      console.log(`🔍 Données initiales: ${lots.length} lot(s) et ${stock.length} article(s) en stock.`);

      // --- CORRECTION : Utiliser la table d'assignation directe ---
      const { data: assignments, error: assignmentError } = await supabase
        .from('lot_stock_assignments')
        .select('lot_id, stock_item_id, daily_quantity_per_bird')
        .eq('is_active', true);

      // --- NOUVEAU : Charger les rations personnalisées comme solution de repli ---
      const { data: rations, error: rationsError } = await supabase
        .from('custom_feed_rations')
        .select('lot_id, daily_consumption_per_bird_grams');

      if (rationsError) {
        console.warn("🟡 Avertissement: Impossible de charger les rations personnalisées pour le repli.", rationsError);
      }

      if (assignmentError) {
        console.error("🔴 ERREUR CRITIQUE lors du chargement des assignations:", assignmentError);
        return;
      }
      if (!assignments || assignments.length === 0) {
        console.log('🔴 CALCUL ARRÊTÉ : Aucune assignation active trouvée dans `lot_stock_assignments`.');
        return;
      }

      console.log(`✅ ${assignments.length} assignation(s) active(s) trouvée(s).`);

      let totalConsumption = 0;
      const consumptionByItem = new Map<string, {
        total: number;
        lots: { name: string; consumption: number }[];
      }>();

      for (const lot of lots.filter(l => l.status === 'active')) {
        console.log(`\n--- Traitement du lot: "${lot.name}" (ID: ${lot.id}) ---`);
        const assignment = assignments.find(a => a.lot_id === lot.id);
        
        if (!assignment || !assignment.stock_item_id) {
          console.log(`   🟡 Pas d'assignation de stock active pour ce lot.`);
          continue;
        }

        console.log(`   ✅ Assignation trouvée: lie le lot à stock_item_id "${assignment.stock_item_id}".`);

        let stockItem = null;
        stockItem = stock.find(s => s.id === assignment.stock_item_id);

        if (!stockItem) {
          console.log(`   🔴 ERREUR: L'article de stock avec l'ID "${assignment.stock_item_id}" n'a pas été trouvé dans les données de stock chargées.`);
          continue;
        }

        // --- LOGIQUE AMÉLIORÉE : Utiliser une valeur de repli ---
        let consumptionPerBirdKg = assignment.daily_quantity_per_bird;

        if (!consumptionPerBirdKg || consumptionPerBirdKg <= 0) {
          const fallbackRation = rations?.find(r => r.lot_id === lot.id);
          if (fallbackRation && fallbackRation.daily_consumption_per_bird_grams > 0) {
            consumptionPerBirdKg = fallbackRation.daily_consumption_per_bird_grams / 1000; // Convertir g en kg
            console.log(`   🟡 Repli utilisé: ${fallbackRation.daily_consumption_per_bird_grams}g/jour trouvé dans custom_feed_rations.`);
          }
        }

        if (consumptionPerBirdKg && consumptionPerBirdKg > 0) {
          const dailyConsumptionForLot = (consumptionPerBirdKg * lot.quantity);
          console.log(`      ➡️ Calcul: ${consumptionPerBirdKg.toFixed(3)} kg/oiseau * ${lot.quantity} oiseaux = ${dailyConsumptionForLot.toFixed(2)} kg/jour.`);
          totalConsumption += dailyConsumptionForLot;

          // --- LOGIQUE AMÉLIORÉE : Stocker les détails par lot ---
          const currentItemData = consumptionByItem.get(stockItem.id) || { total: 0, lots: [] };
          currentItemData.total += dailyConsumptionForLot;
          currentItemData.lots.push({
            name: lot.name,
            consumption: dailyConsumptionForLot,
          });
          consumptionByItem.set(stockItem.id, currentItemData);

        } else {
          console.log(`   🟡 L'assignation pour l'article "${stockItem.name}" a une consommation journalière de 0 ou non définie.`);
        }
      }
      console.log('\n--- RÉSULTAT FINAL ---');
      console.log(`   - Consommation totale calculée: ${totalConsumption.toFixed(2)} kg.`);

      // --- NOUVEAU : Générer les prédictions ---
      const newPredictions = new Map<string, any>();
      for (const item of stock) {
        const consumptionInfo = consumptionByItem.get(item.id);
        if (consumptionInfo && consumptionInfo.total > 0) {
          const prediction = predictStockLevels({ item, dailyConsumption: consumptionInfo.total });
          // --- NOUVEAU : Suivi de l'agent de prédiction de stock ---
          trackAction('ai_stock_prediction_generated', {
            itemId: item.id,
            daysRemaining: prediction?.daysRemaining,
            reorderDate: prediction?.reorderDate?.toISOString(),
          });
          if (prediction) {
            newPredictions.set(item.id, prediction);
          }
        }
      }
      setConsumptionData({ total: totalConsumption, byItem: consumptionByItem });
      setPredictions(newPredictions);
    };
    calculateConsumption();

    // --- NOUVEAU : Déclencheur de la consommation quotidienne autonome.
    // Ceci s'assure que la logique est exécutée une fois par jour, seulement quand les données sont prêtes.
    if (lots.length > 0 && stock.length > 0) {
      runDailyStockConsumption();
    }

  }, [lots, stock]); // Ce hook se redéclenchera à chaque fois que `lots` ou `stock` changent.

  const analytics = useMemo(() => {
    const totalItems = stock.length;
    const lowStockItems = stock.filter(item => item.quantity <= item.min_threshold).length;
    const outOfStockItems = stock.filter(item => item.quantity === 0).length;
    const stockValue = stock.reduce((sum, item) => sum + (item.quantity * (item.cost || 0)), 0);

    return { totalItems, lowStockItems, outOfStockItems, stockValue };
  }, [stock]);

  // --- NOUVEAU : Affichage de l'écran de chargement ---
  if (isLoading && stock.length === 0) {
    return (
      <SafeAreaView style={styles.loadingSafeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Chargement des données de stock...</Text>
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
            <Text style={styles.headerTitle}>Gestion du Stock</Text>
            <Text style={styles.headerSubtitle}>Suivi en temps réel</Text>
          </View>
        </View>
        <View style={styles.headerMetrics}>
          <View style={styles.mainMetricCard}>
            <Text style={styles.mainMetricLabel}>Consommation Journalière (Aliments)</Text>
            <Text style={[styles.mainMetricValue, { color: colors.success }]}>
              {consumptionData.total.toFixed(2)} <Text style={{ fontSize: 24 }}>kg</Text>
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
            <Icon name="archive" size={24} color={analytics.lowStockItems > 0 ? colors.error : colors.success} />
            <Text style={[styles.kpiValue, { color: analytics.lowStockItems > 0 ? colors.error : colors.success }]}>
              {analytics.lowStockItems}
            </Text>
            <Text style={styles.kpiLabel}>Stock bas</Text>
          </View>
          <View style={[styles.kpiCard, styles.kpiCardHalf]}>
            <Icon name="cash" size={24} color={colors.primary} />
            <Text style={styles.kpiValue}>{analytics.stockValue.toLocaleString()} CFA</Text>
            <Text style={styles.kpiLabel}>Valeur totale</Text>
          </View>
          <View style={[styles.kpiCard, styles.kpiCardHalf]}>
            <Icon name="time" size={24} color={colors.warning} />
            <Text style={styles.kpiValue}>{analytics.outOfStockItems}</Text>
            <Text style={styles.kpiLabel}>Rupture</Text>
          </View>
        </View>

        {/* --- NOUVEAU : Section d'alertes proactives --- */}
        {feedChangeAlerts.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🔔 Alertes Proactives</Text>
            {feedChangeAlerts.map(alert => (
              <View key={alert.id} style={styles.proactiveAlertCard}>
                <Icon name="warning" size={24} color="#F59E0B" />
                <View style={styles.proactiveAlertContent}>
                  <Text style={styles.proactiveAlertTitle}>{alert.title}</Text>
                  <Text style={styles.proactiveAlertMessage}>{alert.message}</Text>
                  <TouchableOpacity style={styles.proactiveAlertAction} onPress={() => router.push('/feeding')}>
                    <Text style={styles.proactiveAlertActionText}>Gérer les rations</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Stock List */}
        <View style={styles.historySection}>
          <Text style={styles.sectionTitle}>Inventaire Détaillé</Text>
          {stock.length > 0 ? (
            stock.map(item => (
              <StockItemCard
                key={item.id}
                item={item}
                dailyConsumption={consumptionData.byItem.get(item.id) || 0}
              />
            ))
          ) : (
            <View style={styles.emptyState}>
              <Icon name="archive" size={48} color={colors.textSecondary} />
              <Text style={styles.emptyStateText}>Aucun article en stock</Text>
              <Text style={styles.emptyStateText}>Commencez par ajouter votre premier article</Text>
            </View>
          )}
        </View>
      </ScrollView>

      <SimpleBottomSheet isVisible={isAddFormVisible} onClose={() => setIsAddFormVisible(false)}>
        <AddStockItemForm
          onCancel={() => setIsAddFormVisible(false)}
          onSubmit={() => {
            setIsAddFormVisible(false);
            handleRefresh();
          }}
        />
      </SimpleBottomSheet>

      {/* --- NOUVEAU : Bouton flottant pour ajouter un article --- */}
      <FloatingActionButton
        icon="add"
        onPress={() => setIsAddFormVisible(true)}
      />
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
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  daysRemainingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  daysRemainingText: { fontSize: 12, color: colors.textSecondary, fontWeight: '500' },
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
  proactiveAlertCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
    alignItems: 'center',
  },
  proactiveAlertContent: {
    flex: 1,
    marginLeft: 12,
  },
  proactiveAlertTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#B45309',
  },
  proactiveAlertMessage: {
    fontSize: 14,
    color: '#D97706',
    marginTop: 4,
    marginBottom: 12,
  },
  proactiveAlertAction: {
    alignSelf: 'flex-start',
    backgroundColor: '#F59E0B',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  proactiveAlertActionText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 12,
  },
  itemCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  itemCategory: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
    fontStyle: 'italic',
  },
  quantityContainer: {
    marginTop: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  quantityText: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
  },
  unitText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  progressBarContainer: {
    height: 6,
    backgroundColor: colors.border,
    borderRadius: 3,
    marginTop: 12,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
  },
  emptyState: { alignItems: 'center', paddingVertical: 40 },
  consumingLotsContainer: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 12,
  },
  consumingLotsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 8,
  },
  consumingLotItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  consumingLotName: {
    fontSize: 14,
    color: colors.text,
  },
  consumingLotAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  predictionContainer: {
    marginTop: 16,
    backgroundColor: colors.primary + '10',
    borderRadius: 8,
    padding: 12,
  },
  predictionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  predictionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  predictionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  predictionLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  predictionValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  reorderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.orange,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
    gap: 8,
  },
  reorderButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.white,
  },
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