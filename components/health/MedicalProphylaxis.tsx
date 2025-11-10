import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { colors } from '../../styles/commonStyles';
import Icon from '../Icon';
import { supabase } from '../../config'; // Import supabase directly
import { router } from 'expo-router';

// --- ÉTAPE 1: Importer les outils de verrouillage ---
import { useSubscription } from '../../contexts/SubscriptionContext';
import PremiumModal from '../PremiumModal';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Lot {
  id: string;
  name: string;
  breed: string;
  quantity: number;
  age_days: number;
  created_at: string;
}

interface Vaccination {
  id: string;
  vaccine_name: string;
  description: string;
  age_range_days: { min: number; max: number };
  priority: 'high' | 'medium' | 'low';
  frequency: 'once' | 'repeat';
  interval_days?: number;
  lot_id: string;
  due_date: string;
  status: 'pending' | 'completed' | 'overdue';
  completed_date?: string;
}

interface VaccineProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  seller: string;
  rating: number;
  inStock: boolean;
}

interface HistoryItem {
  id: string;
  type: 'analyse' | 'vaccin';
  title: string;
  date: string;
}

const addHealthHistoryItem = async (item: Omit<HistoryItem, 'id' | 'date'>) => {
  try {
    const newHistoryItem = {
      ...item,
      id: Date.now().toString(),
      date: new Date().toISOString(),
    };

    const existingHistoryJson = await AsyncStorage.getItem('@healthHistory');
    const existingHistory = existingHistoryJson ? JSON.parse(existingHistoryJson) : [];

    const updatedHistory = [newHistoryItem, ...existingHistory].slice(0, 20);

    await AsyncStorage.setItem('@healthHistory', JSON.stringify(updatedHistory));
  } catch (e) {
    console.error("Failed to save health history item.", e);
  }
};

interface MedicalProphylaxisProps {
  onClose: () => void;
}

export default function MedicalProphylaxis({ onClose }: MedicalProphylaxisProps) {
  const [lots, setLots] = useState<Lot[]>([]);
  const [vaccinations, setVaccinations] = useState<Vaccination[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // --- ÉTAPE 2: Utiliser le hook d'abonnement ---
  const { hasAccess, loading: subscriptionLoading } = useSubscription();
  const canAccessFeature = hasAccess('sanitary_prophylaxis'); // Vérifier l'accès à la prophylaxie sanitaire
  const [selectedLot, setSelectedLot] = useState<string | null>(null);

  // Comprehensive vaccination schedule based on poultry health standards
  const vaccinationSchedule = {
    'ISA Brown': [
      {
        vaccine_name: 'Vaccin Marek',
        description: 'Protection contre la maladie de Marek',
        age_range_days: { min: 1, max: 1 },
        priority: 'high' as const,
        frequency: 'once' as const,
      },
      {
        vaccine_name: 'Vaccin Gumboro',
        description: 'Protection contre la bursite infectieuse',
        age_range_days: { min: 14, max: 16 },
        priority: 'high' as const,
        frequency: 'once' as const,
      },
      {
        vaccine_name: 'Vaccin Newcastle',
        description: 'Protection contre la maladie de Newcastle',
        age_range_days: { min: 7, max: 10 },
        priority: 'high' as const,
        frequency: 'repeat' as const,
        interval_days: 30,
      },
      {
        vaccine_name: 'Vaccin Coryza',
        description: 'Protection contre le coryza infectieux',
        age_range_days: { min: 35, max: 42 },
        priority: 'medium' as const,
        frequency: 'once' as const,
      },
    ],
    'Ross 308': [
      {
        vaccine_name: 'Vaccin Marek',
        description: 'Protection contre la maladie de Marek',
        age_range_days: { min: 1, max: 1 },
        priority: 'high' as const,
        frequency: 'once' as const,
      },
      {
        vaccine_name: 'Vaccin Gumboro',
        description: 'Protection contre la bursite infectieuse',
        age_range_days: { min: 14, max: 16 },
        priority: 'high' as const,
        frequency: 'once' as const,
      },
      {
        vaccine_name: 'Vaccin Newcastle',
        description: 'Protection contre la maladie de Newcastle',
        age_range_days: { min: 7, max: 10 },
        priority: 'high' as const,
        frequency: 'repeat' as const,
        interval_days: 30,
      },
      {
        vaccine_name: 'Vaccin Bronchite',
        description: 'Protection contre la bronchite infectieuse',
        age_range_days: { min: 7, max: 10 },
        priority: 'high' as const,
        frequency: 'once' as const,
      },
    ],
    'Cobb 500': [
      {
        vaccine_name: 'Vaccin Marek',
        description: 'Protection contre la maladie de Marek',
        age_range_days: { min: 1, max: 1 },
        priority: 'high' as const,
        frequency: 'once' as const,
      },
      {
        vaccine_name: 'Vaccin Gumboro',
        description: 'Protection contre la bursite infectieuse',
        age_range_days: { min: 14, max: 16 },
        priority: 'high' as const,
        frequency: 'once' as const,
      },
      {
        vaccine_name: 'Vaccin Newcastle',
        description: 'Protection contre la maladie de Newcastle',
        age_range_days: { min: 7, max: 10 },
        priority: 'high' as const,
        frequency: 'repeat' as const,
        interval_days: 30,
      },
      {
        vaccine_name: 'Vaccin ILT',
        description: 'Protection contre la laryngotrachéite infectieuse',
        age_range_days: { min: 21, max: 28 },
        priority: 'medium' as const,
        frequency: 'once' as const,
      },
    ],
    'default': [
      {
        vaccine_name: 'Vaccin Marek',
        description: 'Protection contre la maladie de Marek',
        age_range_days: { min: 1, max: 1 },
        priority: 'high' as const,
        frequency: 'once' as const,
      },
      {
        vaccine_name: 'Vaccin Gumboro',
        description: 'Protection contre la bursite infectieuse',
        age_range_days: { min: 14, max: 16 },
        priority: 'high' as const,
        frequency: 'once' as const,
      },
      {
        vaccine_name: 'Vaccin Newcastle',
        description: 'Protection contre la maladie de Newcastle',
        age_range_days: { min: 7, max: 10 },
        priority: 'high' as const,
        frequency: 'repeat' as const,
        interval_days: 30,
      },
    ]
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      await Promise.all([loadLots(), loadVaccinations()]);
    } catch (error) {
      console.log('⚠️ Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadLots = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) return;

      const { data: lotsData, error } = await supabase
        .from('lots')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) {
        console.log('⚠️ Error loading lots:', error);
      } else {
        setLots(lotsData || []);
      }
    } catch (error) {
      console.log('⚠️ Error in loadLots:', error);
    }
  };

  const loadVaccinations = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) return;

      const { data: vaccinationsData, error } = await supabase
        .from('vaccinations')
        .select('*')
        .eq('user_id', user.id)
        .order('due_date', { ascending: true });

      if (error) {
        console.log('⚠️ Error loading vaccinations:', error);
      } else {
        setVaccinations(vaccinationsData || []);
      }
    } catch (error) {
      console.log('⚠️ Error in loadVaccinations:', error);
    }
  };

  const generateVaccinationsForLot = async (lot: Lot) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) return;

      const schedule = vaccinationSchedule[lot.breed as keyof typeof vaccinationSchedule] ||
                      vaccinationSchedule.default;

      const vaccinationsToInsert = schedule.map(vaccine => {
        const lotCreationDate = new Date(lot.created_at);
        const dueDate = new Date(lotCreationDate);
        dueDate.setDate(lotCreationDate.getDate() + vaccine.age_range_days.min);

        // Ensure the due date is not in the past
        const today = new Date();
        if (dueDate < today) {
          dueDate.setDate(today.getDate() + 1); // Schedule for tomorrow if past due
        }

        return {
          user_id: user.id,
          lot_id: lot.id,
          vaccine_name: vaccine.vaccine_name,
          description: vaccine.description,
          age_range_days: vaccine.age_range_days,
          priority: vaccine.priority,
          frequency: vaccine.frequency,
          interval_days: vaccine.interval_days,
          due_date: dueDate.toISOString().split('T')[0],
          status: 'pending'
        };
      });

      const { error } = await supabase
        .from('vaccinations')
        .insert(vaccinationsToInsert);

      if (error) {
        console.log('⚠️ Error generating vaccinations:', error);
        Alert.alert('Erreur', 'Impossible de générer le calendrier de vaccination');
      } else {
        Alert.alert('✅ Succès', `Calendrier de vaccination généré pour ${lot.name}`);
        await loadVaccinations();
      }
    } catch (error) {
      console.log('⚠️ Error in generateVaccinationsForLot:', error);
      Alert.alert('Erreur', 'Une erreur est survenue');
    }
  };

  const markVaccinationCompleted = async (vaccinationId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) return;

      const today = new Date().toISOString().split('T')[0];

      const { error } = await supabase
        .from('vaccinations')
        .update({
          status: 'completed',
          completed_date: today
        })
        .eq('id', vaccinationId)
        .eq('user_id', user.id);

      if (error) {
        console.log('⚠️ Error updating vaccination:', error);
        Alert.alert('Erreur', 'Impossible de marquer la vaccination comme terminée');
      } else {
        Alert.alert('✅ Vaccination Terminée', 'La vaccination a été marquée comme terminée');
        const vaccination = vaccinations.find(v => v.id === vaccinationId);
        if (vaccination) {
          await addHealthHistoryItem({
            type: 'vaccin',
            title: `Vaccin: ${vaccination.vaccine_name}`,
          });
        }
        await loadVaccinations();
      }
    } catch (error) {
      console.log('⚠️ Error marking vaccination completed:', error);
      Alert.alert('Erreur', 'Une erreur est survenue');
    }
  };

  const getVaccinationsForLot = (lotId: string) => {
    return vaccinations.filter(v => v.lot_id === lotId);
  };

  const getUpcomingVaccinations = () => {
    const today = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 7);

    return vaccinations.filter(v => {
      const dueDate = new Date(v.due_date);
      return v.status === 'pending' && dueDate <= nextWeek;
    });
  };

  const getOverdueVaccinations = () => {
    const today = new Date();
    return vaccinations.filter(v => {
      const dueDate = new Date(v.due_date);
      return v.status === 'pending' && dueDate < today;
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return colors.error;
      case 'medium': return colors.warning;
      case 'low': return colors.success;
      default: return colors.textSecondary;
    }
  };

  const getStatusColor = (status: string, dueDate: string) => {
    const today = new Date();
    const due = new Date(dueDate);

    if (status === 'completed') return colors.success;
    if (due < today) return colors.error;
    if (due <= new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)) return colors.warning;
    return colors.textSecondary;
  };

  const getVaccineProducts = async (vaccineName: string) => {
    // Mock marketplace integration - in production, query actual marketplace
    const mockProducts: VaccineProduct[] = [
      {
        id: '1',
        name: `${vaccineName} - Dose Standard`,
        description: `Vaccin ${vaccineName} pour volailles - Haute efficacité`,
        price: 1500,
        category: 'vaccines',
        seller: 'VetPharma Plus',
        rating: 4.8,
        inStock: true,
      },
      {
        id: '2',
        name: `${vaccineName} - Lot Économique`,
        description: `Pack de 50 doses de ${vaccineName} - Prix réduit`,
        price: 65000,
        category: 'vaccines',
        seller: 'AgriVet Solutions',
        rating: 4.6,
        inStock: true,
      },
    ];

    return mockProducts;
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Chargement du calendrier vaccinal...</Text>
      </View>
    );
  }

  // --- ÉTAPE 3: Verrouiller l'accès ---
  // Si l'abonnement est chargé et que l'utilisateur n'a pas accès, on affiche le modal premium.
  if (!subscriptionLoading && !canAccessFeature) {
    return (
      <PremiumModal
        isVisible={true}
        onClose={() => {
          onClose(); // Ferme le composant de prophylaxie
          router.push('/subscriptions'); // Redirige vers la page des abonnements
        }}
        featureName="Calendrier Vaccinal Intelligent"
      />
    );
  }

  const upcomingVaccinations = getUpcomingVaccinations();
  const overdueVaccinations = getOverdueVaccinations();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Icon name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Prophylaxie Médicale</Text>
        <View style={styles.notificationIndicator}>
          {overdueVaccinations.length > 0 && (
            <View style={styles.overdueBadge}>
              <Text style={styles.overdueText}>{overdueVaccinations.length}</Text>
            </View>
          )}
        </View>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Alert for overdue vaccinations */}
          {overdueVaccinations.length > 0 && (
            <View style={styles.alertCard}>
              <Icon name="warning" size={24} color={colors.error} />
              <View style={styles.alertContent}>
                <Text style={styles.alertTitle}>🚨 Vaccinations en Retard</Text>
                <Text style={styles.alertText}>
                  {overdueVaccinations.length} vaccination(s) sont en retard. Veuillez les effectuer d'urgence.
                </Text>
              </View>
            </View>
          )}

          {/* Alert for upcoming vaccinations */}
          {upcomingVaccinations.length > 0 && overdueVaccinations.length === 0 && (
            <View style={styles.alertCard}>
              <Icon name="time" size={24} color={colors.warning} />
              <View style={styles.alertContent}>
                <Text style={styles.alertTitle}>⏰ Vaccinations à Venir</Text>
                <Text style={styles.alertText}>
                  {upcomingVaccinations.length} vaccination(s) sont prévues dans les 7 prochains jours.
                </Text>
              </View>
            </View>
          )}

          <View style={styles.infoCard}>
            <Icon name="information-circle" size={24} color={colors.primary} />
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>💉 Calendrier Vaccinal Intelligent</Text>
              <Text style={styles.infoText}>
                Le calendrier s'adapte automatiquement à la race et à l'âge de vos volailles.
                Les vaccins sont synchronisés avec le marketplace pour faciliter les achats.
              </Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>🐔 Vos Lots Actifs</Text>
          <View style={styles.lotsList}>
            {lots.map((lot) => {
              const lotVaccinations = getVaccinationsForLot(lot.id);
              const hasVaccinations = lotVaccinations.length > 0;

              return (
                <View key={lot.id} style={styles.lotCard}>
                  <View style={styles.lotHeader}>
                    <View style={styles.lotInfo}>
                      <Text style={styles.lotName}>{lot.name}</Text>
                      <Text style={styles.lotDetails}>
                        {lot.breed} • {lot.quantity} sujets • {lot.age_days} jours
                      </Text>
                    </View>
                    {!hasVaccinations && (
                      <TouchableOpacity
                        style={styles.generateButton}
                        onPress={() => generateVaccinationsForLot(lot)}
                      >
                        <Text style={styles.generateButtonText}>Générer</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {hasVaccinations && (
                    <View style={styles.vaccinationsList}>
                      {lotVaccinations.map((vaccination) => (
                        <View key={vaccination.id} style={styles.vaccinationItem}>
                          <View style={styles.vaccinationInfo}>
                            <Text style={styles.vaccineName}>{vaccination.vaccine_name}</Text>
                            <Text style={styles.vaccineDescription}>{vaccination.description}</Text>
                            <View style={styles.vaccinationMeta}>
                              <Text style={[
                                styles.dueDate,
                                { color: getStatusColor(vaccination.status, vaccination.due_date) }
                              ]}>
                                Échéance: {new Date(vaccination.due_date).toLocaleDateString('fr-FR', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric'
                                })}
                              </Text>
                              <View style={[
                                styles.priorityBadge,
                                { backgroundColor: getPriorityColor(vaccination.priority) + '20' }
                              ]}>
                                <Text style={[
                                  styles.priorityBadgeText,
                                  { color: getPriorityColor(vaccination.priority) }
                                ]}>
                                  {vaccination.priority === 'high' ? 'Urgent' :
                                   vaccination.priority === 'medium' ? 'Important' : 'Normal'}
                                </Text>
                              </View>
                            </View>
                          </View>

                          {vaccination.status === 'pending' && (
                            <View style={styles.actionButtons}>
                              <TouchableOpacity
                                style={styles.marketplaceButton}
                                onPress={() => {
                                  Alert.alert('Marketplace', 'Redirection vers les produits vaccins...');
                                  router.push('/marketplace');
                                }}
                              >
                                <Text style={styles.marketplaceButtonText}>Acheter</Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={styles.completeButton}
                                onPress={() => markVaccinationCompleted(vaccination.id)}
                              >
                                <Icon name="checkmark-circle" size={20} color={colors.success} />
                              </TouchableOpacity>
                            </View>
                          )}

                          {vaccination.status === 'completed' && (
                            <View style={styles.completedIndicator}>
                              <Icon name="checkmark-circle" size={20} color={colors.success} />
                              <Text style={styles.completedText}>Terminée</Text>
                            </View>
                          )}
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              );
            })}
          </View>

          {lots.length === 0 && (
            <View style={styles.emptyState}>
              <Icon name="storefront" size={48} color={colors.textSecondary} />
              <Text style={styles.emptyStateTitle}>Aucun Lot Actif</Text>
              <Text style={styles.emptyStateText}>
                Créez d'abord un lot dans la section Lots pour accéder au calendrier vaccinal.
              </Text>
              <TouchableOpacity
                style={styles.createLotButton}
                onPress={() => {
                  onClose();
                  router.push('/lots');
                }}
              >
                <Text style={styles.createLotButtonText}>Créer un Lot</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  closeButton: {
    padding: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
  },
  notificationIndicator: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overdueBadge: {
    backgroundColor: colors.error,
    borderRadius: 12,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overdueText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.backgroundAlt,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: colors.textSecondary,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  alertCard: {
    flexDirection: 'row',
    backgroundColor: colors.error + '10',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.error + '20',
    gap: 12,
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.error,
    marginBottom: 4,
  },
  alertText: {
    fontSize: 14,
    color: '#000000',
    lineHeight: 20,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: colors.primary + '10',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.primary + '20',
    gap: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: 4,
  },
  infoText: {
    fontSize: 14,
    color: '#000000',
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 16,
  },
  lotsList: {
    gap: 16,
    marginBottom: 20,
  },
  lotCard: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  lotHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  lotInfo: {
    flex: 1,
  },
  lotName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  lotDetails: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  generateButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  generateButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.backgroundAlt,
  },
  vaccinationsList: {
    gap: 12,
  },
  vaccinationItem: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  vaccinationInfo: {
    marginBottom: 8,
  },
  vaccineName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  vaccineDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  vaccinationMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dueDate: {
    fontSize: 14,
    fontWeight: '500',
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  priorityBadgeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  marketplaceButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  marketplaceButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.backgroundAlt,
  },
  completeButton: {
    padding: 6,
  },
  completedIndicator: {
    alignItems: 'center',
    gap: 4,
  },
  completedText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.success,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  createLotButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createLotButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.backgroundAlt,
  },
});
