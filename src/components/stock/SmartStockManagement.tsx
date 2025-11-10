// src/components/stock/SmartStockManagement.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, Modal, Alert, ActivityIndicator, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useStockOptimizer } from '../../intelligence/agents/StockOptimizerAgent';
import { useLotIntelligence } from '../../intelligence/agents/LotIntelligenceAgent';
import { useUniversalIntelligence } from '../../contexts/UniversalIntelligenceContext';
import { ensureSupabaseInitialized } from '../../../app/integrations/supabase/client';
import StockSkeleton from '../../../components/StockSkeleton';

const formatFeedType = (type: string) => {
  if (!type) return '';
  const formattedType = type.replace(/_/g, ' ');
  return formattedType.charAt(0).toUpperCase() + formattedType.slice(1);
};

const PredictionCard: React.FC<{ prediction: any; onTrack: () => void }> = ({ prediction, onTrack }) => (
    <View style={styles.card}>
        <View style={styles.cardHeader}>
            <Ionicons name="timer-outline" size={22} color="#3B82F6" />
            <Text style={styles.cardTitle}>{prediction.item_name}</Text>
        </View>
        <Text style={styles.predictionText}>
            Rupture estimée dans <Text style={styles.predictionDays}>{prediction.days_until_runoff} jours</Text>
        </Text>
        <TouchableOpacity style={styles.trackButton} onPress={onTrack}>
            <Text style={styles.trackButtonText}>Suivre la consommation</Text>
        </TouchableOpacity>
    </View>
);

const LotConsumptionCard: React.FC<{ consumption: any }> = ({ consumption }) => (
    <View style={styles.lotConsumptionCard}>
        <Ionicons name="egg-outline" size={20} color="#8B5CF6" />
        <Text style={styles.lotName}>{consumption.lot_name}</Text>
        <Text style={styles.lotConsumptionValue}>{consumption.daily_consumption ? consumption.daily_consumption.toFixed(2) : 'N/A'} kg/jour</Text>
    </View>
);

const StockItemCard: React.FC<{ item: any; onPress: () => void }> = ({ item, onPress }) => (
    <TouchableOpacity style={[styles.card, styles.stockItemCard]} onPress={onPress}>
        <View style={styles.cardHeader}>
            <Ionicons name={item.category === 'feed' ? 'restaurant-outline' : 'medkit-outline'} size={22} color="#10B981" />
            <Text style={styles.cardTitle}>{item.name}</Text>
        </View>
        <View style={styles.stockItemContent}>
            <Text style={styles.stockItemQuantity}>{item.quantity} {item.unit}</Text>
            {item.quantity <= item.min_threshold && 
                <View style={styles.lowStockBadge}>
                    <Ionicons name="warning-outline" size={14} color="#D97706" />
                    <Text style={styles.lowStockText}>Stock bas</Text>
                </View>
            }
        </View>
    </TouchableOpacity>
);

const OptimizationCard: React.FC<{ optimization: any }> = ({ optimization }) => (
    <View style={[styles.card, styles.optimizationCard]}>
        <View style={styles.cardHeader}>
            <Ionicons name="bulb-outline" size={22} color="#F59E0B" />
            <Text style={styles.cardTitle}>{optimization.title}</Text>
        </View>
        <Text style={styles.optimizationDescription}>{optimization.description}</Text>
    </View>
);


const ConsumptionTrackingModal: React.FC<{ visible: boolean; stock: any; isFeed: boolean; onClose: () => void; onSave: (data: any) => void; }> = ({ visible, stock, isFeed, onClose, onSave }) => {
    // Basic modal implementation
    return (
        <Modal visible={visible} onRequestClose={onClose} transparent>
            <View style={styles.modalContainer}>
                <View style={styles.modalContent}>
                    <Text>Track Consumption</Text>
                    {/* Add form fields for tracking */}
                    <TouchableOpacity onPress={onClose}>
                        <Text>Close</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

const StockItemModal: React.FC<{ visible: boolean; item: any; onClose: () => void; onSave: (data: any, lots: any) => void; userId: string | null; }> = ({ visible, item, onClose, onSave, userId }) => {
    // Basic modal implementation
    return (
        <Modal visible={visible} onRequestClose={onClose} transparent>
            <View style={styles.modalContainer}>
                <View style={styles.modalContent}>
                    <Text>Stock Item</Text>
                    {/* Add form fields for stock item */}
                    <TouchableOpacity onPress={onClose}>
                        <Text>Close</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

/**
 * COMPOSANT : GESTION STOCK INTELLIGENT
 *
 * - Affichage prédictions consommation
 * - Enregistrement consommation manuelle/automatique
 * - Alertes rupture proactive
 * - Suggestions optimisation
 */

export const SmartStockManagement: React.FC = () => {
  const { userId } = useUniversalIntelligence();
  const {
    calculateFarmConsumption,
    predictStockNeeds,
    trackConsumption,
    generateOptimizations,
  } = useStockOptimizer();
  const { generateUpcomingFeedAlerts } = useLotIntelligence();

  const [consumption, setConsumption] = useState<any>(null);
  const [predictions, setPredictions] = useState<any[]>([]);
  const [optimizations, setOptimizations] = useState<any[]>([]);
  const [stockItems, setStockItems] = useState<any[]>([]);
  const [feedChangeAlerts, setFeedChangeAlerts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showTrackingModal, setShowTrackingModal] = useState(false);
  const [showAddStockModal, setShowAddStockModal] = useState(false);
  const [selectedStock, setSelectedStock] = useState<any>(null);
  const [selectedStockItem, setSelectedStockItem] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const fadeAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(50))[0];
  const scaleAnim = useState(new Animated.Value(0.95))[0];

  const lowStockItems = stockItems.filter(item => item.quantity <= item.min_threshold);

  useEffect(() => {
    if (typeof userId === 'string' && userId.length > 0) {
      loadData();
    }
  }, [userId]);

  useEffect(() => {
    if (!isLoading && !error) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 600, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 1, duration: 400, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]).start();
    }
  }, [isLoading, error, fadeAnim, slideAnim, scaleAnim]);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    if (!userId || userId === 'null') {
      setIsLoading(false);
      return;
    }
    try {
      const [cons, pred, opts, stock, feedAlerts] = await Promise.all([
        calculateFarmConsumption(userId!),
        predictStockNeeds(userId!),
        generateOptimizations(userId!),
        loadStockItems(),
        generateUpcomingFeedAlerts(userId!),
      ]);
      setConsumption(cons);
      setPredictions(pred);
      setOptimizations(opts);
      setStockItems(stock);
      setFeedChangeAlerts(feedAlerts);
    } catch (error: any) {
      console.error('[SmartStock] Error loading data:', error);
      setError(error.message || 'Erreur de chargement des données');
    } finally {
      setIsLoading(false);
    }
  };

  const loadStockItems = async () => {
    const supabase = await ensureSupabaseInitialized();
    const { data, error } = await supabase.from('stock').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  };

  const handleAddStock = () => {
    setSelectedStockItem(null);
    setShowAddStockModal(true);
  };

  const handleEditStock = (item: any) => {
    setSelectedStockItem(item);
    setShowAddStockModal(true);
  };

  const handleStockSubmit = async (stockData: any, selectedLots: string[]) => {
    try {
      const supabase = await ensureSupabaseInitialized();
      let stockItemId = selectedStockItem?.id;

      if (selectedStockItem) {
        const { error } = await supabase.from('stock').update(stockData).eq('id', selectedStockItem.id);
        if (error) throw error;
      } else {
        const { data: newStock, error } = await supabase.from('stock').insert({ ...stockData, user_id: userId }).select('id').single();
        if (error) throw error;
        if (newStock) stockItemId = newStock.id;
      }

      if (stockData.category === 'feed' && stockItemId) {
        await supabase.from('lot_stock_assignments').delete().eq('stock_item_id', stockItemId);
        if (selectedLots && selectedLots.length > 0) {
          const assignmentsToInsert = selectedLots.map(lotId => ({ stock_item_id: stockItemId, lot_id: lotId, user_id: userId }));
          await supabase.from('lot_stock_assignments').insert(assignmentsToInsert);
        }
      }
      setShowAddStockModal(false);
      loadData();
    } catch (error: any) {
      console.error('Error saving stock item:', error);
      Alert.alert('Erreur', `Impossible de sauvegarder l'article: ${error.message}`);
    }
  };

  const handleOpenAdjustmentModal = (item: any) => {
    setSelectedStock(item);
    setShowTrackingModal(true);
  };

  if (isLoading) {
    return (
      <ScrollView style={styles.container}>
        <StockSkeleton type="header" />
        <View style={styles.section}><View style={styles.sectionTitleSkeleton} />{[1, 2, 3].map(i => <StockSkeleton key={`consumption-${i}`} type="lot" />)}</View>
        <View style={styles.section}><View style={styles.sectionHeader}><View style={styles.sectionTitleSkeleton} /><View style={styles.refreshIconSkeleton} /></View>{[1, 2].map(i => <StockSkeleton key={`prediction-${i}`} type="prediction" />)}</View>
        <View style={styles.section}><View style={styles.sectionHeader}><View style={styles.sectionTitleSkeleton} /><View style={styles.addIconSkeleton} /></View><StockSkeleton type="stats" />{[1, 2, 3, 4].map(i => <StockSkeleton key={`stock-${i}`} type="stock-item" />)}</View>
        <View style={styles.section}><View style={styles.sectionTitleSkeleton} />{[1, 2].map(i => <StockSkeleton key={`optimization-${i}`} type="optimization" />)}</View>
      </ScrollView>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={48} color="#DC2626" />
        <Text style={styles.errorTitle}>Erreur de chargement</Text>
        <Text style={styles.errorMessage}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadData}><Text style={styles.retryButtonText}>Réessayer</Text></TouchableOpacity>
      </View>
    );
  }

  return (
    <Animated.ScrollView style={[styles.container, { opacity: fadeAnim }]} showsVerticalScrollIndicator={false}>
      <LinearGradient colors={['#667EEA', '#764BA2']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.headerGradient}>
        <View style={styles.header}>
          <View style={styles.headerCard}>
            <View style={styles.headerIconContainer}><Ionicons name="restaurant" size={32} color="#FFFFFF" /></View>
            <View style={styles.headerContent}>
              <Text style={styles.headerLabel}>Consommation Quotidienne</Text>
              <Text style={styles.headerValue}>{consumption?.total_daily_consumption.toFixed(1) || '0'} kg/jour</Text>
              <Text style={styles.headerSubtext}>Alimentation intelligente active</Text>
            </View>
            <View style={styles.headerDecoration}><Ionicons name="analytics" size={20} color="rgba(255,255,255,0.7)" /></View>
          </View>
        </View>
      </LinearGradient>

      {feedChangeAlerts.length > 0 && (
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>🔔 Alertes Proactives</Text>
            {feedChangeAlerts.map(alert => (
                <View key={alert.id} style={styles.proactiveAlertCard}>
                    <Ionicons name="warning" size={24} color="#F59E0B" />
                    <View style={styles.proactiveAlertContent}>
                        <Text style={styles.proactiveAlertTitle}>{alert.title}</Text>
                        <Text style={styles.proactiveAlertMessage}>{alert.message}</Text>
                        <TouchableOpacity style={styles.proactiveAlertAction} onPress={() => router.push('/stock')}>
                            <Text style={styles.proactiveAlertActionText}>Gérer le stock</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            ))}
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📊 Consommation par Type</Text>
        <View style={styles.consumptionTypeContainer}>
            {consumption && Object.entries(consumption.consumption_by_feed_type).map(([type, qty]: [string, any]) => (
              <View key={type} style={styles.consumptionCard}><Text style={styles.consumptionType}>{formatFeedType(type)}</Text><Text style={styles.consumptionValue}>{qty.toFixed(1)} kg/jour</Text></View>
            ))}
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>🔮 Prédictions de Stock</Text><TouchableOpacity onPress={loadData}><Ionicons name="refresh" size={20} color="#3B82F6" /></TouchableOpacity></View>
        {predictions.map((pred, index) => (
          <Animated.View key={pred.stock_item_id} style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim.interpolate({ inputRange: [0, 50], outputRange: [0, index * 10] }) }] }}>
            <PredictionCard prediction={pred} onTrack={() => handleOpenAdjustmentModal(pred)} />
          </Animated.View>
        ))}
        {predictions.length === 0 && (
          <Animated.View style={[styles.emptyState, { opacity: fadeAnim }]}>
            <View style={styles.emptyIconContainer}><Ionicons name="checkmark-circle" size={48} color="#10B981" /></View>
            <Text style={styles.emptyTitle}>Stock optimal</Text><Text style={styles.emptyText}>Tous vos stocks sont bien approvisionnés</Text>
            <View style={styles.emptyDecoration}><Ionicons name="leaf" size={24} color="#10B981" /></View>
          </Animated.View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🐔 Consommation par Lot</Text>
        <View style={styles.lotConsumptionContainer}>
            {consumption?.consumption_by_lot.map((lotCons: any) => (<LotConsumptionCard key={lotCons.lot_id} consumption={lotCons} />))}
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>📦 Articles en Stock</Text><TouchableOpacity onPress={handleAddStock}><Ionicons name="add-circle" size={28} color="#3B82F6" /></TouchableOpacity></View>
        <View style={styles.statsContainer}>
          <LinearGradient colors={['#3B82F6', '#1D4ED8']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.statCardGradient}><View style={styles.statCard}><Ionicons name="cube" size={24} color="#FFFFFF" style={styles.statIcon} /><Text style={styles.statValue}>{stockItems.length}</Text><Text style={styles.statLabel}>Articles</Text></View></LinearGradient>
          <LinearGradient colors={['#F59E0B', '#D97706']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.statCardGradient}><View style={styles.statCard}><Ionicons name="warning" size={24} color="#FFFFFF" style={styles.statIcon} /><Text style={styles.statValue}>{lowStockItems.length}</Text><Text style={styles.statLabel}>En alerte</Text></View></LinearGradient>
          <LinearGradient colors={['#10B981', '#059669']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.statCardGradient}><View style={styles.statCard}><Ionicons name="cash" size={24} color="#FFFFFF" style={styles.statIcon} /><Text style={styles.statValue}>{(() => { const total = stockItems.reduce((sum, item) => sum + (item.quantity * (item.cost || 0)), 0); if (total >= 1000000) return `${(total / 1000000).toFixed(1)}M`; else if (total >= 1000) return `${(total / 1000).toFixed(0)}K`; return total.toLocaleString(); })()}</Text><Text style={styles.statLabel}>CFA Total</Text></View></LinearGradient>
        </View>
        {stockItems.length === 0 ? (
          <Animated.View style={[styles.emptyState, { opacity: fadeAnim }]}><LinearGradient colors={['#F8FAFC', '#F1F5F9']} style={styles.emptyStateGradient}><View style={styles.emptyIconContainer}><Ionicons name="cube" size={48} color="#94A3B8" /></View><Text style={styles.emptyStateTitle}>Stock vide</Text><Text style={styles.emptyStateText}>Aucun article en stock</Text><Text style={styles.emptyStateSubtext}>Commencez par ajouter votre premier article d'alimentation</Text><TouchableOpacity style={styles.emptyStateButton} onPress={handleAddStock}><LinearGradient colors={['#3B82F6', '#1D4ED8']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.emptyStateButtonGradient}><Ionicons name="add-circle" size={20} color="#FFFFFF" /><Text style={styles.emptyStateButtonText}>Ajouter un article</Text></LinearGradient></TouchableOpacity></LinearGradient></Animated.View>
        ) : (
          <Animated.View style={[{ opacity: fadeAnim }, styles.stockGridContainer]}>{stockItems.map((item) => (<View key={item.id} style={styles.stockGridItem}><StockItemCard item={item} onPress={() => handleEditStock(item)} /></View>))}</Animated.View>
        )}
      </View>

      {optimizations.length > 0 && (
        <View style={styles.section}><Text style={styles.sectionTitle}>💡 Suggestions d'Optimisation</Text>{optimizations.map((opt, index) => (<OptimizationCard key={index} optimization={opt} />))}</View>
      )}

      <ConsumptionTrackingModal visible={showTrackingModal} stock={selectedStock} isFeed={selectedStock?.category === 'feed'} onClose={() => setShowTrackingModal(false)} onSave={async (data) => { try { const supabase = await ensureSupabaseInitialized(); const newQuantity = selectedStock.current_quantity - data.quantity; if (newQuantity < 0) { Alert.alert('Erreur', 'La quantité retirée ne peut pas dépasser le stock actuel.'); return; } await supabase.from('stock').update({ quantity: newQuantity }).eq('id', selectedStock.stock_item_id); await trackConsumption(data.lotId, selectedStock.stock_item_id, data.quantity, data.type); setShowTrackingModal(false); loadData(); } catch (error: any) { Alert.alert('Erreur', `Impossible de mettre à jour le stock: ${error.message}`); } }} />
      <StockItemModal visible={showAddStockModal} item={selectedStockItem} onClose={() => setShowAddStockModal(false)} onSave={handleStockSubmit} userId={userId} />
    </Animated.ScrollView>
  );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F3F4F6',
    },
    headerGradient: {
        paddingTop: 50,
        paddingBottom: 20,
        paddingHorizontal: 20,
        borderBottomLeftRadius: 25,
        borderBottomRightRadius: 25,
    },
    header: {
        // No direct styles needed, handled by gradient
    },
    headerCard: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 15,
        padding: 20,
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerIconContainer: {
        backgroundColor: 'rgba(255,255,255,0.3)',
        borderRadius: 50,
        padding: 12,
        marginRight: 15,
    },
    headerContent: {
        flex: 1,
    },
    headerLabel: {
        fontSize: 16,
        color: '#E0E7FF',
        fontWeight: '600',
    },
    headerValue: {
        fontSize: 24,
        color: '#FFFFFF',
        fontWeight: '800',
        marginTop: 4,
    },
    headerSubtext: {
        fontSize: 12,
        color: '#C7D2FE',
        marginTop: 2,
    },
    headerDecoration: {
        position: 'absolute',
        right: 20,
        top: 20,
        opacity: 0.5,
    },
    section: {
        padding: 20,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1F2937',
    },
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
    consumptionTypeContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    consumptionCard: {
        flex: 1,
        minWidth: '45%',
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 15,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    consumptionType: {
        fontSize: 14,
        fontWeight: '600',
        color: '#4B5563',
    },
    consumptionValue: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1F2937',
        marginTop: 5,
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 15,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        shadowColor: '#1F2937',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1F2937',
        marginLeft: 10,
    },
    predictionText: {
        fontSize: 14,
        color: '#4B5563',
        marginBottom: 15,
    },
    predictionDays: {
        fontWeight: 'bold',
        color: '#D97706',
    },
    trackButton: {
        backgroundColor: '#3B82F6',
        borderRadius: 8,
        paddingVertical: 10,
        alignItems: 'center',
    },
    trackButtonText: {
        color: '#FFFFFF',
        fontWeight: '600',
    },
    lotConsumptionContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    lotConsumptionCard: {
        flex: 1,
        minWidth: '45%',
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 15,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    lotName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#4B5563',
        marginBottom: 5,
    },
    lotConsumptionValue: {
        fontSize: 16,
        fontWeight: '700',
        color: '#8B5CF6',
    },
    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
        gap: 10,
    },
    statCardGradient: {
        flex: 1,
        borderRadius: 12,
    },
    statCard: {
        padding: 15,
        alignItems: 'center',
    },
    statIcon: {
        marginBottom: 8,
    },
    statValue: {
        fontSize: 20,
        fontWeight: '800',
        color: '#FFFFFF',
    },
    statLabel: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.8)',
        fontWeight: '600',
    },
    stockGridContainer: {
        // Using ScrollView now, so no grid styles needed here
    },
    stockItemCard: {
        // Re-using 'card' style
    },
    stockItemContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 10,
    },
    stockItemQuantity: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1F2937',
    },
    lowStockBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FEF3C7',
        borderRadius: 12,
        paddingVertical: 4,
        paddingHorizontal: 8,
    },
    lowStockText: {
        marginLeft: 5,
        color: '#B45309',
        fontSize: 12,
        fontWeight: '600',
    },
    optimizationCard: {
        // Re-using 'card' style
    },
    optimizationDescription: {
        fontSize: 14,
        color: '#4B5563',
        lineHeight: 20,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 40,
    },
    emptyIconContainer: {
        // styles for empty state icon
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1F2937',
        marginTop: 15,
    },
    emptyText: {
        fontSize: 14,
        color: '#6B7280',
        marginTop: 5,
        textAlign: 'center',
        maxWidth: '80%',
    },
    emptyDecoration: {
        position: 'absolute',
        opacity: 0.1,
    },
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 20,
        width: '80%',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    errorTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: '#DC2626',
        marginTop: 15,
    },
    errorMessage: {
        fontSize: 16,
        color: '#4B5563',
        textAlign: 'center',
        marginTop: 10,
    },
    retryButton: {
        marginTop: 20,
        backgroundColor: '#3B82F6',
        paddingVertical: 10,
        paddingHorizontal: 25,
        borderRadius: 8,
    },
    retryButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
});