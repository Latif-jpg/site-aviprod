import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { View, StyleSheet, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, TextInput, Switch, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { colors } from '../styles/commonStyles';
import { useData } from '../hooks/useData'; // Assurez-vous que useData exporte aussi les lots
import Icon from '../components/Icon';
import SimpleBottomSheet from '../components/BottomSheet';
import FloatingActionButton from '../components/FloatingActionButton'; // Importer le bouton flottant
import AddStockItemForm from '../components/AddStockItemForm';
import { useDataCollector } from '../src/hooks/useDataCollector'; // Importer le collecteur
import { supabase } from '../config'; // Import supabase directly
import { StockItem } from '../types';
import { useAuth } from '../hooks/useAuth';

const StockItemCard = ({ item, onEdit }: { item: StockItem, onEdit: (item: StockItem) => void }) => {
  const quantity = item.quantity || 0;
  const minThreshold = item.min_threshold || 0;
  const initialQuantity = item.initial_quantity || 0;

  // Le pourcentage est basé sur la quantité initiale. S'il n'y en a pas, on considère 0 pour ne pas montrer de barre erronée.
  const stockPercentage = initialQuantity > 0 ? (quantity / initialQuantity) * 100 : 0;
  const totalDailyConsumption = dailyConsumption?.total || 0;
  const daysRemaining = totalDailyConsumption > 0 ? Math.floor(quantity / totalDailyConsumption) : Infinity;
  const dailyConsumption = { total: item.daily_consumption, lots: item.consuming_lots };
  let status: 'ok' | 'low' | 'out' | 'unassigned' = 'ok';
  let statusColor = colors.success;
  if (quantity <= 0) {
    status = 'out';
    statusColor = colors.error;
  } else if (quantity <= minThreshold) {
    status = 'low';
    statusColor = colors.warning;
  }
  if (item.category === 'feed' && (!dailyConsumption.lots || dailyConsumption.lots.length === 0)) {
    status = 'unassigned';
    statusColor = colors.textSecondary;
  }

  return (
    <View style={styles.itemCard}>
      <View style={styles.itemHeader}>
        <Text style={styles.itemName}>{item.name}</Text>
        <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={[styles.statusText, { color: statusColor }]}>
            {status === 'ok' ? 'OK' : status === 'low' ? 'Stock Bas' : status === 'out' ? 'Rupture' : 'Non Assigné'}
          </Text>
        </View>
      </View>
      <Text style={styles.itemCategory}>{item.category}</Text>

      <View style={styles.quantityContainer}>
        <Text style={styles.quantityText}>{quantity.toLocaleString()} <Text style={styles.unitText}>{item.unit}</Text></Text>
        {item.category === 'feed' && isFinite(item.days_remaining) && item.days_remaining !== null && (
          <View style={styles.daysRemainingContainer}>
            <Icon name="time-outline" size={14} color={colors.textSecondary} />
            <Text style={styles.daysRemainingText}>
              ~{item.days_remaining} jour{item.days_remaining > 1 ? 's' : ''} restant{item.days_remaining > 1 ? 's' : ''}
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

      {/* --- NOUVEAU : Bouton d'action pour le réapprovisionnement --- */}
      {/* CORRECTION : La condition est maintenant correcte et gère les deux cas (stock bas et rupture) */}
      {(status === 'low' || status === 'out') && item.category === 'feed' && (
        <TouchableOpacity
          style={[
            styles.reorderButton,
            // CORRECTION : La syntaxe pour la couleur du bouton est corrigée.
            { backgroundColor: status === 'out' ? colors.error : colors.orange }
          ]}
          onPress={() => router.push(`/marketplace?search=${encodeURIComponent(item.name)}`)}
        >
          <Icon name="cart-outline" size={16} color={colors.white} />
          <Text style={styles.reorderButtonText}>Acheter sur le Marketplace</Text>
        </TouchableOpacity>
      )}

      {/* --- NOUVEAU : Bouton Modifier --- */}
      <TouchableOpacity style={styles.editButton} onPress={() => onEdit(item)}>
        <Icon name="create-outline" size={16} color={colors.primary} />
        <Text style={styles.editButtonText}>Modifier & Assigner</Text>
      </TouchableOpacity>
    </View>
  );
};

// --- NOUVEAU : Formulaire d'édition ---
const EditStockItemForm = ({ item, onClose, onUpdateSuccess }: { item: StockItem, onClose: () => void, onUpdateSuccess: () => void }) => {
  const { user } = useAuth();
  const [name, setName] = useState(item.name);
  const [quantity, setQuantity] = useState(item.quantity?.toString() || '0');
  const [minThreshold, setMinThreshold] = useState(item.min_threshold?.toString() || '0');
  const [cost, setCost] = useState(item.cost?.toString() || '0');
  const [assignments, setAssignments] = useState<any>({});
  const [activeLots, setActiveLots] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchFormData = async () => {
      if (!user) return;
      setIsLoading(true);
      try {
        // 1. Récupérer les lots actifs
        const { data: lotsData, error: lotsError } = await supabase
          .from('lots')
          .select('id, name')
          .eq('user_id', user.id)
          .eq('status', 'active');
        if (lotsError) throw lotsError;
        setActiveLots(lotsData || []);

        // 2. Récupérer les assignations existantes pour cet article
        const { data: assignmentsData, error: assignmentsError } = await supabase
          .from('lot_stock_assignments')
          .select('lot_id, daily_quantity_per_bird, is_active')
          .eq('stock_item_id', item.id);
        if (assignmentsError) throw assignmentsError;

        // 3. Pré-remplir le formulaire
        const initialAssignments: any = {};
        (lotsData || []).forEach(lot => {
          const existingAssignment = (assignmentsData || []).find(a => a.lot_id === lot.id);
          initialAssignments[lot.id] = {
            isActive: existingAssignment ? existingAssignment.is_active : false,
            // CORRECTION : Gérer le cas où daily_quantity_per_bird est null
            quantity: existingAssignment && existingAssignment.daily_quantity_per_bird != null ? existingAssignment.daily_quantity_per_bird.toString() : '0.05'
          };
        });
        setAssignments(initialAssignments);

      } catch (error) {
        console.error("Erreur chargement données du formulaire d'édition:", error);
        Alert.alert("Erreur", "Impossible de charger les données pour l'édition.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchFormData();
  }, [item, user]);

  const handleAssignmentChange = (lotId: string, field: 'isActive' | 'quantity', value: any) => {
    setAssignments((prev: any) => ({
      ...prev,
      [lotId]: {
        ...prev[lotId],
        [field]: value
      }
    }));
  };

  const handleSave = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      // 1. Mettre à jour l'article de stock
      const { error: stockUpdateError } = await supabase
        .from('stock')
        .update({
          name,
          quantity: parseFloat(quantity) || 0,
          min_threshold: parseFloat(minThreshold) || 0,
          cost: parseFloat(cost) || 0,
        })
        .eq('id', item.id);
      if (stockUpdateError) throw stockUpdateError;

      // 2. Mettre à jour les assignations
      const assignmentPromises = Object.keys(assignments).map(lotId => {
        const assignment = assignments[lotId];
        return supabase.from('lot_stock_assignments').upsert({
          user_id: user.id,
          lot_id: lotId,
          stock_item_id: item.id,
          daily_quantity_per_bird: parseFloat(assignment.quantity) || 0,
          is_active: assignment.isActive,
        }, { onConflict: 'lot_id,stock_item_id' });
      });

      await Promise.all(assignmentPromises);

      Alert.alert("Succès", "L'article et ses assignations ont été mis à jour.");
      onUpdateSuccess();
      onClose();

    } catch (error: any) {
      console.error("Erreur sauvegarde article:", error);
      Alert.alert("Erreur", "Impossible de sauvegarder les modifications.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    // --- CORRECTION DÉFINITIVE : Le ScrollView est maintenant le conteneur principal ---
    <ScrollView
      style={styles.formContainer}
      contentContainerStyle={{ paddingBottom: 40 }} // Ajoute un espace en bas
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.formTitle}>Modifier l'article</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Nom de l'article" />
      <TextInput style={styles.input} value={quantity} onChangeText={setQuantity} placeholder="Quantité en stock" keyboardType="numeric" />
      <TextInput style={styles.input} value={minThreshold} onChangeText={setMinThreshold} placeholder="Seuil minimum" keyboardType="numeric" />
      <TextInput style={styles.input} value={cost} onChangeText={setCost} placeholder="Coût unitaire" keyboardType="numeric" />

      <Text style={styles.formSubtitle}>Assignations aux lots</Text>
      {isLoading ? <ActivityIndicator /> : activeLots.map(lot => (
        <View key={lot.id} style={styles.assignmentRow}>
          <Text style={styles.assignmentLotName}>{lot.name}</Text>
          <Switch value={assignments[lot.id]?.isActive || false} onValueChange={val => handleAssignmentChange(lot.id, 'isActive', val)} />
          {assignments[lot.id]?.isActive && <TextInput style={styles.assignmentInput} value={assignments[lot.id]?.quantity || '0'} onChangeText={val => handleAssignmentChange(lot.id, 'quantity', val)} keyboardType="numeric" />}
        </View>
      ))}

      <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={isLoading}>
        <Text style={styles.saveButtonText}>{isLoading ? "Sauvegarde..." : "Sauvegarder"}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

export default function StockScreen() {
   const { user } = useAuth();
   const [isRefreshing, setIsRefreshing] = useState(false);
   const [isAddFormVisible, setIsAddFormVisible] = useState(false);
   const [stockData, setStockData] = useState<{ kpis: any, items: any[] } | null>(null);
   const [isLoading, setIsLoading] = useState(true);
   const [itemToEdit, setItemToEdit] = useState<StockItem | null>(null);

  const loadStockOverview = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      console.log('📦 Calling RPC get_stock_overview...');
      const { data, error } = await supabase.rpc('get_stock_overview', { p_user_id: user.id });
      if (error) throw error;
      
      console.log('✅ Received stock overview from RPC:', data);
      setStockData(data);

    } catch (error) {
      console.error('❌ Error loading stock overview:', error);
      setStockData(null);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [user]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadStockOverview();
  }, [loadStockOverview]);

  const handleEditItem = (item: StockItem) => {
    setItemToEdit(item);
  };

  useFocusEffect(
     useCallback(() => {
       loadStockOverview();
     }, [loadStockOverview])
   );

  const analytics = useMemo(() => stockData?.kpis || {
    total_items: 0,
    low_stock_items: 0,
    out_of_stock_items: 0,
    total_stock_value: 0,
    total_feed_consumption: 0,
  }, [stockData]);



  // --- NOUVEAU : Affichage de l'écran de chargement ---
  if (isLoading && !stockData) {
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
              {(analytics.total_feed_consumption || 0).toFixed(2)} <Text style={{ fontSize: 18 }}>kg</Text>
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
            <Icon name="cash-outline" size={24} color={colors.primary} />
            <Text style={[styles.kpiValue, { color: colors.primary }]}>
              {(analytics.total_stock_value || 0).toLocaleString()} CFA
            </Text>
            <Text style={styles.kpiLabel}>Valeur totale du stock</Text>
          </View>
          <View style={[styles.kpiCard, styles.kpiCardHalf]}>
            <Icon name="archive-outline" size={24} color={analytics.low_stock_items > 0 ? colors.warning : colors.success} />
            <Text style={[styles.kpiValue, { color: analytics.low_stock_items > 0 ? colors.warning : colors.success }]}>{analytics.low_stock_items || 0}</Text>
            <Text style={styles.kpiLabel}>Stock bas</Text>
          </View>
          <View style={[styles.kpiCard, styles.kpiCardHalf]}>
            <Icon name="close-circle-outline" size={24} color={analytics.out_of_stock_items > 0 ? colors.error : colors.success} />
            <Text style={[styles.kpiValue, { color: analytics.out_of_stock_items > 0 ? colors.error : colors.success }]}>{analytics.out_of_stock_items || 0}</Text>
            <Text style={styles.kpiLabel}>Rupture</Text>
          </View>
        </View>

        {/* Stock List */}
        <View style={styles.historySection}>
          <Text style={styles.sectionTitle}>Inventaire Détaillé</Text>
          {stockData && stockData.items.length > 0 ? (
            stockData.items.map(item => (
              <StockItemCard
                key={item.id}
                item={item}
                onEdit={handleEditItem}
              />
            ))
          ) : (
            <View style={styles.emptyState}>
              <Icon name="archive-outline" size={48} color={colors.textSecondary} />
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

      {/* --- NOUVEAU : Modale pour l'édition --- */}
      <SimpleBottomSheet isVisible={!!itemToEdit} onClose={() => setItemToEdit(null)}>
        {itemToEdit && <EditStockItemForm
          item={itemToEdit}
          onClose={() => setItemToEdit(null)}
          onUpdateSuccess={handleRefresh}
        />}
      </SimpleBottomSheet>

      {/* --- NOUVEAU : Bouton flottant pour ajouter un article --- */}
      <FloatingActionButton
        icon="add"
        // Le nouveau FAB en mode simple utilise la prop "onPress"
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
    marginTop: 16,
    gap: 12, // Retrait de flexDirection: 'row'
  },
  mainMetricCard: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  mainMetricLabel: {
    fontSize: 14,
    color: '#cbd5e1',
    fontWeight: '600',
    marginBottom: 8,
  },
  mainMetricValue: {
    fontSize: 36,
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
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary + '20',
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  // Styles pour le formulaire d'édition
  formContainer: {
    padding: 20,
    flex: 1, // --- CORRECTION : Permet au ScrollView de prendre l'espace nécessaire ---
  },
  formTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 20,
  },
  formSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 20,
    marginBottom: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 10,
  },
  input: {
    backgroundColor: colors.background,
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  assignmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  assignmentLotName: { flex: 1, fontSize: 16, color: colors.text },
  assignmentInput: {
    borderWidth: 1, borderColor: colors.border, borderRadius: 6, padding: 8, width: 80, textAlign: 'center'
  },
  // --- CORRECTION : Styles pour le bouton de sauvegarde ---
  saveButton: {
    backgroundColor: colors.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24, // Remonte le bouton
    marginBottom: 20, // Ajoute de l'espace en bas pour éviter d'être caché
  },
  saveButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
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