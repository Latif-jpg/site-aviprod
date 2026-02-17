
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, RefreshControl, Dimensions, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../styles/commonStyles';
import { router } from 'expo-router';
import Icon from '../components/Icon';
import LotCard from '../components/LotCard';
import SimpleBottomSheet from '../components/BottomSheet';
import AddLotForm from '../components/AddLotForm'; // Importation correcte
import EditLotForm from '../components/EditLotForm'; // --- NOUVEAU : Importer le formulaire d'édition ---
import FloatingActionButton from '../components/FloatingActionButton';
import { supabase } from '../config'; // Import supabase directly
import BottomNavigation from '../components/BottomNavigation';
import LotIntelligenceDashboard from '../src/intelligence/ui/LotIntelligenceDashboard';
import { useLotIntelligence } from '../src/intelligence/agents/LotIntelligenceAgent';

// --- LOGIQUE IA DÉLÉGUÉE À LotIntelligenceAgent.ts ---

const { width } = Dimensions.get('window');

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

  return <Animated.View style={[{ width, height, backgroundColor: '#e0e0e0', borderRadius: 8, opacity: opacityAnim }, style]} />;
};

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
  insightSuccess: {
    borderLeftColor: '#10b981',
  },
  insightInfo: {
    borderLeftColor: '#3b82f6',
  },
  insightWarning: {
    borderLeftColor: '#f59e0b',
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
  filterContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  filterButtonActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
  },
  filterButtonTextActive: {
    color: '#fff',
  },
  section: {
    marginBottom: 24,
  },
  lotsContainer: {
    gap: 12,
  },
  lotCardWrapper: {
    position: 'relative',
  },
  archiveButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#ef4444',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  // --- NOUVEAU : Styles pour les icônes d'action sur la carte ---
  actionIconsContainer: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    gap: 8,
    zIndex: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 20,
    padding: 6,
  },
  actionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    // La couleur de fond est définie directement dans le JSX
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 20,
    marginTop: 20,
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
    marginBottom: 24,
    lineHeight: 22,
  },
  emptyStateButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyStateButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.backgroundAlt,
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
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
});

export default function LotsScreen() {
  const [showAddLot, setShowAddLot] = useState(false);
  const [showIntelligence, setShowIntelligence] = useState(false);
  const [selectedLotId, setSelectedLotId] = useState<string | null>(null);
  const [lotToEdit, setLotToEdit] = useState<any | null>(null); // --- NOUVEAU : Pour la modale d'édition ---
  const [filter, setFilter] = useState<'all' | 'my-lots' | 'active' | 'archived'>('all');
  const [lots, setLots] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [selectedLotForDetail, setSelectedLotForDetail] = useState<any | null>(null);

  useEffect(() => {
    loadLots();
  }, []);

  const loadLots = async () => {
    try {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        console.log('No user logged in');
        setLots([]);
        return;
      }

      setCurrentUserId(user.id);

      // Load all lots with seller information - but filter by user for privacy
      const { data, error } = await supabase
        .from('lots')
        .select('*, taux_mortalite')
        .eq('user_id', user.id)  // Only show user's own lots
        .order('created_at', { ascending: false });

      if (error) throw error;

      console.log('Loaded lots:', data);

      const lotsWithDynamicAge = data?.map(lot => {
        // --- CORRECTION : Créer une nouvelle instance de date pour le calcul afin de ne pas modifier l'originale ---
        const entryDate = new Date(lot.entry_date || lot.created_at);
        const today = new Date();
        // --- CORRECTION FINALE : Utiliser initial_age_days et un calcul de date robuste ---
        entryDate.setUTCHours(0, 0, 0, 0);
        today.setUTCHours(0, 0, 0, 0);
        const daysOnFarm = Math.max(0, Math.round((today.getTime() - entryDate.getTime()) / 86400000)); // 86400000 = 1000 * 60 * 60 * 24
        let dynamicAge = (lot.initial_age_days || 0) + daysOnFarm;

        // --- CORRECTION : Un lot entré aujourd'hui a au moins 1 jour d'âge ---
        if (daysOnFarm === 0 && dynamicAge < 1) dynamicAge = 1;

        let trackingInfo = null;
        if (lot.target_sale_date) {
          const targetDate = new Date(lot.target_sale_date);
          targetDate.setUTCHours(0, 0, 0, 0); // Assurer la comparaison au jour près
          const daysUntilTarget = Math.floor((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          trackingInfo = {
            daysInFarm: daysOnFarm,
            daysUntilTarget,
            targetWeight: lot.target_weight,
            isTargetTracking: true,
          };
        } else {
          trackingInfo = {
            daysInFarm: daysOnFarm,
            isTargetTracking: false,
          };
        }

        return {
          ...lot,
          age: dynamicAge, // Override age with dynamic age
          taux_mortalite: lot.taux_mortalite || 0, // Include the calculated mortality rate
          trackingInfo,
          // --- CORRECTION FINALE : S'assurer que la date est correctement formatée ou nulle ---
          targetSaleDate: lot.target_sale_date ? new Date(lot.target_sale_date).toISOString().split('T')[0] : null,
          entryDate: lot.entry_date ? new Date(lot.entry_date).toISOString().split('T')[0] : null,
        };
      }) || [];

      // --- LOG DE VÉRIFICATION ---
      // Affiche les données transformées pour le premier lot afin de vérifier les calculs.
      console.log('📊 [1/2] [lots.tsx] Données du premier lot après calculs (âge, dates) :', JSON.stringify(lotsWithDynamicAge[0], null, 2));

      setLots(lotsWithDynamicAge);
    } catch (error) {
      console.log('⚠️ Error loading lots:', error);
      Alert.alert('Erreur', 'Impossible de charger les lots');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadLots();
  };

  const handleAddLot = async (lotData: any) => {
    try {
      console.log('Adding lot to database:', lotData);

      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        Alert.alert('Erreur', 'Vous devez être connecté pour ajouter un lot');
        return;
      }

      // --- CORRECTION : Assurer le bon format de date pour Supabase ---
      // Convertit la date de sortie prévue en format ISO 8601 (UTC) si elle existe.
      // Cela évite les problèmes de fuseau horaire qui peuvent causer des dates incorrectes.
      const targetSaleDateUTC = lotData.target_sale_date
        ? new Date(lotData.target_sale_date).toISOString()
        : null;

      const { data, error } = await supabase
        .from('lots')
        .insert([{
          user_id: user.id,
          name: lotData.name,
          breed: lotData.breed,
          bird_type: lotData.bird_type,
          quantity: lotData.quantity,
          initial_quantity: lotData.initial_quantity,
          age: lotData.age,
          entry_date: lotData.entry_date,
          target_sale_date: targetSaleDateUTC,
          target_weight: lotData.target_weight || null,
          status: 'active'
        }])
        .select()
        .single();

      if (error) throw error;

      // Le Trigger Supabase s'occupe de la création des vaccinations.
      // On ne fait plus d'appel RPC manuel ici pour éviter les doublons.
      console.log(`✅ Lot ajouté avec succès. ID: ${data.id}.`);

      console.log('Lot added successfully:', data);
      setShowAddLot(false);
      Alert.alert('Succès! 🎉', 'Le lot a été ajouté avec succès');
      loadLots();
    } catch (error: any) {
      console.log('⚠️ Error adding lot:', error);

      // Détection spécifique de l'erreur du Trigger Supabase
      if (error.code === '23505' && error.message?.includes('vaccinations')) {
        Alert.alert('Erreur Configuration DB', 'Le système automatique (Trigger) de la base de données tente de créer des doublons de vaccins. Veuillez vérifier votre fonction SQL dans Supabase.');
      } else {
        Alert.alert('Erreur', error.message || 'Impossible d\'ajouter le lot');
      }
    }
  };

  const handleArchiveLot = async (lotId: string) => {
    Alert.alert(
      'Archiver le Lot',
      'Êtes-vous sûr de vouloir archiver ce lot? Il ne sera plus visible dans la liste active.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Archiver',
          style: 'destructive',
          onPress: async () => {
            try { // Supabase est déjà importé depuis config
              const { error } = await supabase
                .from('lots')
                .update({ status: 'archived' })
                .eq('id', lotId);

              if (error) throw error;

              Alert.alert('Succès', 'Le lot a été archivé');
              loadLots();
            } catch (error: any) {
              console.log('⚠️ Error archiving lot:', error);
              Alert.alert('Erreur', 'Impossible d\'archiver le lot');
            }
          }
        }
      ]
    );
  };

  // --- NOUVEAU : Gérer la suppression directement depuis la liste ---
  const handleDeleteLot = (lot: any) => {
    Alert.alert(
      "Confirmer la suppression",
      `Êtes-vous sûr de vouloir supprimer définitivement le lot "${lot.name}" ? Cette action est irréversible.`,
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: async () => {
            try {
              const { error } = await supabase.from('lots').delete().eq('id', lot.id);
              if (error) throw error;
              Alert.alert("Succès", `Le lot "${lot.name}" a été supprimé.`);
              loadLots(); // Rafraîchir la liste
            } catch (error: any) {
              Alert.alert("Erreur", "Impossible de supprimer le lot.");
            }
          },
        },
      ]
    );
  };

  // --- NOUVEAU : Gérer la modification directement depuis la liste ---
  const handleEditLot = (lot: any) => {
    setLotToEdit(lot);
  };

  // --- NOUVEAU : Gérer la réussite de la mise à jour ---
  const handleUpdateSuccess = () => {
    setLotToEdit(null);
    loadLots();
  };

  // --- NOUVEAU : Fonction pour traduire le type de volaille pour la base de données ---
  const getBirdTypeForDB = (birdType: string): 'broilers' | 'layers' | 'local' => {
    switch (birdType) {
      case 'Poulets de chair':
        return 'broilers';
      case 'Pondeuses':
        return 'layers';
      case 'Race locale':
        return 'local';
      default:
        return 'broilers'; // Fallback par défaut
    }
  };

  const getStageFromAge = (birdType: string, age: number): 'starter' | 'grower' | 'finisher' | 'layer' | 'pré-ponte' => {
    // Protocole pour les races commerciales à croissance rapide (Broilers)
    if (birdType === 'broilers') {
      if (age <= 21) return 'starter';   // J1 à J21
      if (age <= 32) return 'grower';     // J22 à J32
      return 'finisher';
    }
    // Protocole pour les races locales et pondeuses (cycle long)
    else if (birdType === 'layers') {
      if (age <= 42) return 'starter';   // J1 à J42 (6 semaines)
      if (age <= 119) return 'grower';    // J43 à J119 (7 à 17 semaines) - Similaire à votre J105
      if (age <= 140) return 'pré-ponte'; // J120 à J140 (18 à 20 semaines) - Phase pré-ponte
      return 'layer';
    }
    // Fallback pour les types inconnus (cycle court par défaut)
    return 'starter';
  };

  const getHealthStatusFromMortality = (mortality: number): 'excellent' | 'good' | 'fair' | 'poor' => {
    if (mortality < 2) return 'excellent';
    if (mortality < 5) return 'good';
    if (mortality < 10) return 'fair';
    return 'poor';
  };

  // Calculate analytics
  const analytics = {
    totalBirds: lots.filter(l => l.status === 'active').reduce((sum, l) => sum + l.quantity, 0),
    activeLots: lots.filter(l => l.status === 'active').length,
    averageAge: lots.filter(l => l.status === 'active').length > 0
      ? Math.round(lots.filter(l => l.status === 'active').reduce((sum, l) => sum + l.age, 0) / lots.filter(l => l.status === 'active').length)
      : 0,
    healthScore: (() => {
      const activeLots = lots.filter(l => l.status === 'active');
      if (activeLots.length === 0) return 100;
      // --- CORRECTION : Utiliser le calcul pondéré correct pour le taux de mortalité global ---
      const lotsForCalc = activeLots.filter(lot => typeof lot.initial_quantity === 'number' && lot.initial_quantity > 0);
      const totalMortality = lotsForCalc.reduce((sum, lot) => sum + (lot.mortality || 0), 0);
      const totalInitialQuantity = lotsForCalc.reduce((sum, lot) => sum + lot.initial_quantity, 0);
      const mortalityRate = totalInitialQuantity > 0 ? (totalMortality / totalInitialQuantity) * 100 : 0;
      return Math.round(100 - mortalityRate);
    })(),
  };

  // AI Insights
  const getAIInsights = () => {
    const insights = [];
    const activeLots = lots.filter(l => l.status === 'active');

    // High mortality alert
    const highMortalityLots = activeLots.filter(l => (l.mortality || 0) > 5);
    if (highMortalityLots.length > 0) {
      insights.push({
        type: 'critical',
        category: 'health', // --- AJOUT ---
        title: 'Alerte Mortalité Élevée',
        description: `${highMortalityLots.length} lot(s) avec mortalité > 5%`,
        action: 'Vérifier conditions sanitaires',
        icon: 'alert-circle',
        confidence: 96
      });
    }

    // Optimal sale window
    const lotsNearTarget = activeLots.filter(l => {
      if (!l.target_sale_date) return false;
      const daysUntil = Math.floor((new Date(l.target_sale_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
      return daysUntil <= 7 && daysUntil >= 0;
    });
    if (lotsNearTarget.length > 0) {
      insights.push({
        type: 'success',
        category: 'sale', // --- AJOUT ---
        title: 'Fenêtre de Vente Optimale',
        description: `${lotsNearTarget.length} lot(s) prêt(s) pour la vente`,
        action: 'Préparer la commercialisation',
        icon: 'cash',
        confidence: 93
      });
    }

    // Growth optimization
    if (analytics.averageAge > 0 && analytics.totalBirds > 0) {
      insights.push({
        type: 'info',
        category: 'growth', // --- AJOUT ---
        title: 'Analyse de Croissance',
        description: `Âge moyen: ${analytics.averageAge} jours`,
        action: 'Ajuster l\'alimentation selon phase',
        icon: 'trending-up',
        confidence: 89
      });
    }

    return insights;
  };

  const filteredLots = lots.filter(lot => {
    if (filter === 'all') return true;
    if (filter === 'active') return lot.status === 'active';
    if (filter === 'archived') return lot.status === 'archived';
    return lot.user_id === currentUserId; // 'my-lots' is the default fallback
  });

  const renderAnalyticsCards = () => (
    <View style={styles.analyticsContainer}>
      <View style={styles.analyticsRow}>
        <LinearGradient
          colors={['#3b82f6', '#2563eb']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.analyticsCard}
        >
          {isLoading ? (
            <>
              <SkeletonPlaceholder width={48} height={48} style={{ marginBottom: 8, backgroundColor: '#ffffff40' }} />
              <SkeletonPlaceholder width="60%" height={28} style={{ marginBottom: 4, backgroundColor: '#ffffff40' }} />
              <SkeletonPlaceholder width="80%" height={12} style={{ backgroundColor: '#ffffff40' }} />
            </>
          ) : (
            <>
              <View style={styles.analyticsIcon}>
                <Icon name="layers" size={24} color="#fff" />
              </View>
              <Text style={styles.analyticsValue}>{analytics.totalBirds}</Text>
              <Text style={styles.analyticsLabel}>Total Volailles</Text>
            </>
          )}
        </LinearGradient>

        <LinearGradient
          colors={['#10b981', '#059669']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.analyticsCard}
        >
          {isLoading ? (
            <>
              <SkeletonPlaceholder width={48} height={48} style={{ marginBottom: 8, backgroundColor: '#ffffff40' }} />
              <SkeletonPlaceholder width="50%" height={28} style={{ marginBottom: 4, backgroundColor: '#ffffff40' }} />
              <SkeletonPlaceholder width="70%" height={12} style={{ backgroundColor: '#ffffff40' }} />
            </>
          ) : (
            <>
              <View style={styles.analyticsIcon}>
                <Icon name="checkmark-circle" size={24} color="#fff" />
              </View>
              <Text style={styles.analyticsValue}>{analytics.activeLots}</Text>
              <Text style={styles.analyticsLabel}>Lots Actifs</Text>
            </>
          )}
        </LinearGradient>
      </View>

      <View style={styles.analyticsRow}>
        <LinearGradient
          colors={['#f59e0b', '#d97706']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.analyticsCard}
        >
          {isLoading ? (
            <>
              <SkeletonPlaceholder width={48} height={48} style={{ marginBottom: 8, backgroundColor: '#ffffff40' }} />
              <SkeletonPlaceholder width="40%" height={28} style={{ marginBottom: 4, backgroundColor: '#ffffff40' }} />
              <SkeletonPlaceholder width="60%" height={12} style={{ backgroundColor: '#ffffff40' }} />
            </>
          ) : (
            <>
              <View style={styles.analyticsIcon}>
                <Icon name="time" size={24} color="#fff" />
              </View>
              <Text style={styles.analyticsValue}>{analytics.averageAge}j</Text>
              <Text style={styles.analyticsLabel}>Âge Moyen</Text>
            </>
          )}
        </LinearGradient>

        <LinearGradient
          colors={['#8b5cf6', '#7c3aed']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.analyticsCard}
        >
          {isLoading ? (
            <>
              <SkeletonPlaceholder width={48} height={48} style={{ marginBottom: 8, backgroundColor: '#ffffff40' }} />
              <SkeletonPlaceholder width="50%" height={28} style={{ marginBottom: 4, backgroundColor: '#ffffff40' }} />
              <SkeletonPlaceholder width="70%" height={12} style={{ backgroundColor: '#ffffff40' }} />
            </>
          ) : (
            <>
              <View style={styles.analyticsIcon}>
                <Icon name="heart" size={24} color="#fff" />
              </View>
              <Text style={styles.analyticsValue}>{analytics.healthScore}%</Text>
              <Text style={styles.analyticsLabel}>Score Santé</Text>
            </>
          )}
        </LinearGradient>
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
            insight.type === 'success' && styles.insightSuccess,
            insight.type === 'info' && styles.insightInfo,
            insight.category === 'feed_stock' && styles.insightWarning, // --- NOUVEAU ---
          ]}>
            <View style={styles.insightHeader}>
              <Icon name={insight.icon as any} size={22} color={
                insight.type === 'critical' ? '#ef4444' :
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
            <Text style={styles.headerTitle}>Gestion des Lots</Text>
            <Text style={styles.headerSubtitle}>Suivi intelligent IA</Text>
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

          <View style={styles.filterContainer}>
            {[
              { key: 'all', label: 'Tous', count: lots.filter(l => l.user_id === currentUserId).length },
              { key: 'active', label: 'Actifs', count: lots.filter(l => l.status === 'active' && l.user_id === currentUserId).length },
              { key: 'archived', label: 'Archivés', count: lots.filter(l => l.status === 'archived' && l.user_id === currentUserId).length },
            ].map((filterItem) => (
              <TouchableOpacity
                key={filterItem.key}
                style={[
                  styles.filterButton,
                  filter === filterItem.key && styles.filterButtonActive,
                ]}
                onPress={() => setFilter(filterItem.key as any)}
              >
                <Text
                  style={[
                    styles.filterButtonText,
                    filter === filterItem.key && styles.filterButtonTextActive,
                  ]}
                >
                  {filterItem.label} ({filterItem.count})
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.section}>
            <View style={styles.lotsContainer}>
              {isLoading ? (
                // --- NOUVEAU : Affichage des squelettes pendant le chargement ---
                Array.from({ length: 3 }).map((_, index) => (
                  <View key={index} style={[styles.lotCardWrapper, { backgroundColor: '#fff', padding: 16, borderRadius: 16, marginBottom: 12 }]}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
                      <SkeletonPlaceholder width="60%" height={24} />
                      <SkeletonPlaceholder width={36} height={36} style={{ borderRadius: 18 }} />
                    </View>
                    <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
                      <SkeletonPlaceholder width="30%" height={60} />
                      <SkeletonPlaceholder width="30%" height={60} />
                      <SkeletonPlaceholder width="30%" height={60} />
                    </View>
                    <SkeletonPlaceholder width="100%" height={48} />
                  </View>
                ))
              ) : filteredLots.length > 0 ? (
                filteredLots.map(lot => (
                  <View key={lot.id} style={styles.lotCardWrapper}>
                    {/* --- CORRECTION : Icônes d'action positionnées correctement --- */}
                    {lot.user_id === currentUserId && lot.status === 'active' && (
                      <View style={styles.actionIconsContainer}>
                        <TouchableOpacity style={[styles.actionIcon, { backgroundColor: colors.accent }]} onPress={() => handleEditLot(lot)}>
                          {/* --- CORRECTION : Nom de l'icône corrigé --- */}
                          <Icon name="create" size={18} color={colors.white} />
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.actionIcon, { backgroundColor: colors.warning }]} onPress={() => handleArchiveLot(lot.id)}>
                          <Icon name="archive" size={18} color={colors.white} />
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.actionIcon, { backgroundColor: colors.error }]} onPress={() => handleDeleteLot(lot)}>
                          {/* --- CORRECTION : Nom de l'icône corrigé --- */}
                          <Icon name="trash" size={18} color={colors.white} />
                        </TouchableOpacity>
                      </View>
                    )}
                    <LotCard
                      lot={{
                        // --- CORRECTION : Utiliser directement l'objet 'lot' qui a déjà été traité ---
                        // Cela garantit que chaque carte reçoit les données uniques et correctes
                        // qui ont été calculées et vérifiées par le log.
                        id: lot.id,
                        name: lot.name,
                        breed: lot.breed,
                        birdType: lot.bird_type,
                        quantity: lot.quantity,
                        age: lot.age,
                        entryDate: lot.entryDate,
                        dateCreated: lot.created_at,
                        status: lot.status,
                        healthStatus: getHealthStatusFromMortality(lot.taux_mortalite),
                        feedConsumption: lot.feed_consumption || 0,
                        mortality: lot.mortality || 0,
                        averageWeight: lot.poids_moyen || 0,
                        sellingPrice: lot.selling_price || 0,
                        stage: getStageFromAge(lot.bird_type, lot.age),
                        targetSaleDate: lot.targetSaleDate,
                        targetWeight: lot.target_weight,
                        treatmentsDone: [], // Données simplifiées pour la carte
                        treatmentsPending: [], // Données simplifiées pour la carte
                        user_id: lot.user_id
                      }}
                      onPress={() => {
                        setSelectedLotForDetail(lot); // Utiliser un état séparé pour les détails
                        setShowIntelligence(true);
                      }}
                    />
                  </View>
                ))
              ) : (
                <View style={styles.emptyState}>
                  <LinearGradient
                    colors={['#3b82f620', '#2563eb20']}
                    style={styles.emptyIconContainer}
                  >
                    <Icon name="layers" size={48} color="#3b82f6" />
                  </LinearGradient>
                  <Text style={styles.emptyStateTitle}>Aucun lot trouvé</Text>
                  <Text style={styles.emptyStateText}>
                    {filter === 'all'
                      ? 'Commencez par ajouter votre premier lot!'
                      : filter === 'active'
                        ? 'Aucun lot actif pour le moment'
                        : 'Aucun lot archivé'
                    }
                  </Text>
                  <TouchableOpacity onPress={() => setShowAddLot(true)}>
                    <LinearGradient
                      colors={['#10b981', '#059669']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.emptyStateButton}
                    >
                      <Icon name="add" size={20} color="#fff" />
                      <Text style={styles.emptyStateButtonText}>Ajouter un lot</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </View>
      </ScrollView>

      <BottomNavigation />

      <FloatingActionButton
        // Le nouveau FAB en mode simple utilise la prop "onPress" et "icon"
        icon="add"
        onPress={() => setShowAddLot(true)}
      />

      <SimpleBottomSheet
        isVisible={showAddLot}
        onClose={() => setShowAddLot(false)}
      >
        <AddLotForm
          onSubmit={handleAddLot}
          onCancel={() => setShowAddLot(false)}
        />
      </SimpleBottomSheet>

      {/* Intelligence Dashboard */}
      <SimpleBottomSheet
        isVisible={showIntelligence}
        onClose={() => {
          setShowIntelligence(false);
          setSelectedLotForDetail(null);
        }}
      >
        {selectedLotForDetail && (
          <LotIntelligenceDashboard
            lotId={selectedLotForDetail.id}
            useLotIntelligenceHook={useLotIntelligence}
            onClose={() => {
              setShowIntelligence(false);
              setSelectedLotForDetail(null);
            }}
          />
        )}
      </SimpleBottomSheet>

      {/* --- NOUVEAU : Modale pour l'édition rapide --- */}
      <SimpleBottomSheet isVisible={!!lotToEdit} onClose={() => setLotToEdit(null)}>
        {lotToEdit && (
          <EditLotForm
            lot={lotToEdit}
            onClose={() => setLotToEdit(null)}
            onUpdateSuccess={handleUpdateSuccess}
          />
        )}
      </SimpleBottomSheet>
    </SafeAreaView>
  );
}
