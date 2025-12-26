import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Alert, Animated } from 'react-native';
import { colors, commonStyles } from '../styles/commonStyles';
import { Lot } from '../types';
import Icon from './Icon';
import Button from './Button';
import { supabase } from '../config';
import SimpleBottomSheet from './BottomSheet';
import EditLotForm from './EditLotForm';
import { calculateOptimalSaleWindow, formatSaleWindow } from '../utils/optimalSaleCalculator';

interface LotDetailViewProps {
  lot: Lot;
  onClose: () => void;
  onLotDeleted: () => void;
  onLotUpdated: () => void;
}

export default function LotDetailView({ lot, onClose, onLotDeleted, onLotUpdated }: LotDetailViewProps) {
  const [currentLot, setCurrentLot] = useState(lot);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [optimalWindow, setOptimalWindow] = useState<any>(null);
  const scrollY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    setCurrentLot(lot);
  }, [lot]);

  // Calcul de la fenêtre optimale
  useEffect(() => {
    if (currentLot) {
      try {
        const window = calculateOptimalSaleWindow({
          id: currentLot.id,
          birdType: currentLot.birdType || 'broilers',
          age: currentLot.age,
          averageWeight: currentLot.averageWeight || 0,
          quantity: currentLot.quantity,
          sellingPrice: currentLot.sellingPrice || 1800,
          feedConsumption: currentLot.feedConsumption || 0.1,
          mortality: currentLot.mortality || 0,
          entryDate: currentLot.entryDate,
          targetSaleDate: currentLot.targetSaleDate
        });
        setOptimalWindow(window);
        
        // 🔍 DEBUG - Afficher les calculs
        console.log('📊 Fenêtre de vente optimale calculée:');
        console.log(formatSaleWindow(window));
      } catch (error) {
        console.error('Erreur calcul fenêtre optimale:', error);
      }
    }
  }, [currentLot]);

  console.log("📊 [LotDetailView] Données du lot :");
  console.log(JSON.stringify(currentLot, null, 2));

  const getBreedImage = (breed: string) => {
    const breedImages: { [key: string]: string } = {
      'broiler': 'https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?w=400&h=300&fit=crop',
      'layer': 'https://images.unsplash.com/photo-1612817288484-6f916006741a?w=400&h=300&fit=crop',
      'breeder': 'https://images.unsplash.com/photo-1594736797933-d0401ba2fe65?w=400&h=300&fit=crop',
      'ross 308': 'https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?w=400&h=300&fit=crop',
      'isa brown': 'https://images.unsplash.com/photo-1612817288484-6f916006741a?w=400&h=300&fit=crop',
      'rhode island red': 'https://images.unsplash.com/photo-1594736797933-d0401ba2fe65?w=400&h=300&fit=crop',
    };
    return breedImages[breed?.toLowerCase()] || breedImages['broiler'];
  };

  const getHealthStatusColor = (status: string) => {
    switch (status) {
      case 'excellent': return colors.success;
      case 'good': return colors.primary;
      case 'fair': return colors.warning;
      case 'poor': return colors.error;
      default: return colors.textSecondary;
    }
  };

  const getStageInfo = (stage: string) => {
    const stageInfo: { [key: string]: { color: string; description: string } } = {
      'starter': { color: colors.accent, description: '0-3 weeks' },
      'grower': { color: colors.primary, description: '4-6 weeks' },
      'finisher': { color: colors.success, description: '7+ weeks' },
      'layer': { color: colors.accentSecondary, description: 'Egg production' },
      'breeder': { color: colors.secondary, description: 'Breeding stock' },
    };
    return stageInfo[stage] || { color: colors.textSecondary, description: 'Unknown' };
  };

  const stageInfo = getStageInfo(currentLot.stage);

  const handleDelete = () => {
    Alert.alert(
      "Confirmer la suppression",
      `Êtes-vous sûr de vouloir supprimer le lot "${currentLot.name}" ? Cette action est irréversible.`,
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('lots')
                .delete()
                .eq('id', currentLot.id);

              if (error) throw error;

              Alert.alert("Succès", `Le lot "${currentLot.name}" a été supprimé.`);
              onLotDeleted();
              onClose();
            } catch (error: any) {
              console.error("Erreur lors de la suppression du lot:", error);
              Alert.alert("Erreur", "Impossible de supprimer le lot. Veuillez réessayer.");
            }
          },
        },
      ]
    );
  };

  const handleUpdateSuccess = (updatedLotData: Partial<Lot>) => {
    setCurrentLot(prev => ({ ...prev, ...updatedLotData }));
    setIsEditModalVisible(false);
    onLotUpdated();
  };

  const daysUntilSale = useMemo(() => {
    if (!currentLot.targetSaleDate) {
      return null;
    }
    const today = new Date();
    const targetDate = new Date(currentLot.targetSaleDate);
    today.setUTCHours(0, 0, 0, 0);
    targetDate.setUTCHours(0, 0, 0, 0);

    const diffTime = targetDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }, [currentLot.targetSaleDate]);

  return (
    <View style={styles.container}>
      <Animated.ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
      >
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Icon name="close" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>{currentLot.name}</Text>
      </View>

      <View style={styles.imageContainer}>
        <Image 
          source={{ uri: getBreedImage(currentLot.breed || currentLot.birdType || 'broiler') }}
          style={styles.breedImage}
          resizeMode="cover"
        />
        <View style={styles.imageOverlay}>
          <Text style={styles.breedName}>{currentLot.breed || currentLot.birdType}</Text>
          <View style={[styles.stageBadge, { backgroundColor: stageInfo.color, opacity: currentLot.stage ? 1 : 0 }]}>
            <Text style={styles.stageText}>{currentLot.stage}</Text>
          </View>
        </View>
      </View>

      <View style={styles.infoContainer}>
        <View style={styles.infoRow}>
          <View style={styles.infoCard}>
            <Icon name="calendar" size={20} color={colors.primary} />
            <Text style={styles.infoLabel}>Date d'entrée</Text>
            <Text style={styles.infoValue}>{new Date(currentLot.entryDate || currentLot.dateCreated).toLocaleDateString('fr-FR')}</Text>
          </View>
          
          <View style={styles.infoCard}>
            <Icon name="time" size={20} color={colors.accent} />
            <Text style={styles.infoLabel}>Âge actuel</Text>
            <Text style={styles.infoValue}>{currentLot.age} jours</Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <View style={styles.infoCard}>
            <Icon name="flag" size={20} color={colors.accentSecondary} />
            <Text style={styles.infoLabel}>Date Prévue (Manuelle)</Text>
            <Text style={styles.infoValue}>{currentLot.targetSaleDate ? new Date(currentLot.targetSaleDate).toLocaleDateString('fr-FR') : 'N/A'}</Text>
          </View>
          <View style={styles.infoCard}>
            <Icon name="hourglass" size={20} color={colors.secondary} />
            <Text style={styles.infoLabel}>Jours Restants</Text>
            <Text style={styles.infoValue}>{daysUntilSale !== null ? `${daysUntilSale} jours` : 'N/A'}</Text>
          </View>
        </View>

        {/* 🆕 NOUVELLE SECTION : Fenêtre de vente optimale IA */}
        {optimalWindow && (
          <View style={styles.optimalSaleSection}>
            <View style={styles.sectionHeader}>
              <Icon name="trending-up" size={24} color={colors.success} />
              <Text style={styles.sectionTitle}>Fenêtre de Vente Optimale (IA)</Text>
            </View>
            
            <View style={[styles.profitabilityBadge, { 
              backgroundColor: 
                optimalWindow.profitability === 'excellent' ? '#10b981' :
                optimalWindow.profitability === 'good' ? '#3b82f6' :
                optimalWindow.profitability === 'acceptable' ? '#f59e0b' : '#ef4444'
            }]}>
              <Text style={styles.profitabilityText}>
                {optimalWindow.profitability.toUpperCase()}
              </Text>
            </View>
            
            <View style={styles.dateRangeContainer}>
              <View style={styles.dateRangeItem}>
                <Text style={styles.dateRangeLabel}>Min</Text>
                <Text style={styles.dateRangeValue}>
                  {optimalWindow.minDate.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                </Text>
              </View>
              <View style={[styles.dateRangeItem, styles.dateRangeOptimal]}>
                <Text style={styles.dateRangeLabel}>🎯 Optimal</Text>
                <Text style={[styles.dateRangeValue, styles.dateRangeOptimalText]}>
                  {optimalWindow.optimalDate.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                </Text>
              </View>
              <View style={styles.dateRangeItem}>
                <Text style={styles.dateRangeLabel}>Max</Text>
                <Text style={styles.dateRangeValue}>
                  {optimalWindow.maxDate.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                </Text>
              </View>
            </View>
            
            <View style={styles.metricsGrid}>
              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>Jours restants</Text>
                <Text style={styles.metricValue}>{optimalWindow.metrics.daysUntilOptimal}</Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>Poids à gagner</Text>
                <Text style={styles.metricValue}>{optimalWindow.metrics.weightGainNeeded.toFixed(2)}kg</Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>FCR</Text>
                <Text style={styles.metricValue}>{optimalWindow.metrics.fcr.toFixed(2)}</Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>Profit estimé</Text>
                <Text style={styles.metricValue}>
                  {(optimalWindow.metrics.estimatedProfit / 1000).toFixed(0)}k F
                </Text>
              </View>
            </View>
            
            <View style={styles.recommendationBox}>
              <Icon name="bulb" size={20} color="#f59e0b" />
              <Text style={styles.recommendationText}>{optimalWindow.recommendation}</Text>
            </View>
          </View>
        )}

        <View style={styles.infoRow}>
          <View style={styles.infoCard}>
            <Icon name="scale" size={20} color={colors.success} />
            <Text style={styles.infoLabel}>Poids Moyen</Text>
            <Text style={styles.infoValue}>{currentLot.averageWeight || 'N/A'} kg</Text>
          </View>
          
          <View style={styles.infoCard}>
            <Icon name="cash" size={20} color={colors.accentSecondary} />
            <Text style={styles.infoLabel}>Prix/kg</Text>
            <Text style={styles.infoValue}>{currentLot.sellingPrice || 'N/A'} CFA</Text>
          </View>
        </View>

        <View style={styles.healthSection}>
          <View style={styles.sectionHeader}>
            <Icon name="medical" size={24} color={getHealthStatusColor(currentLot.healthStatus)} />
            <Text style={styles.sectionTitle}>État de Santé</Text>
          </View>
          
          <View style={[styles.healthBadge, { backgroundColor: getHealthStatusColor(currentLot.healthStatus) }]}>
            <Text style={styles.healthText}>{currentLot.healthStatus.toUpperCase()}</Text>
          </View>
          
          <View style={styles.healthStats}>
            <View style={styles.healthStat}>
              <Text style={styles.healthStatLabel}>Mortalité</Text>
              <Text style={styles.healthStatValue}>{currentLot.mortality}</Text>
            </View>
            <View style={styles.healthStat}>
              <Text style={styles.healthStatLabel}>Aliment/jour</Text>
              <Text style={styles.healthStatValue}>{currentLot.feedConsumption}kg</Text>
            </View>
            <View style={styles.healthStat}>
              <Text style={styles.healthStatLabel}>Total Oiseaux</Text>
              <Text style={styles.healthStatValue}>{currentLot.quantity}</Text>
            </View>
          </View>
        </View>

        <View style={styles.treatmentSection}>
          <Text style={styles.sectionTitle}>Traitements</Text>
          
          <View style={styles.treatmentSubsection}>
            <Text style={styles.treatmentSubtitle}>✅ Complétés</Text>
            {currentLot.treatmentsDone && currentLot.treatmentsDone.length > 0 ? (
              currentLot.treatmentsDone.map((treatment, index) => (
                <View key={index} style={styles.treatmentItem}>
                  <Text style={styles.treatmentName}>{treatment.name}</Text>
                  <Text style={styles.treatmentDate}>{treatment.date}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.noTreatments}>Aucun traitement complété</Text>
            )}
          </View>

          <View style={styles.treatmentSubsection}>
            <Text style={styles.treatmentSubtitle}>⏳ En attente</Text>
            {currentLot.treatmentsPending && currentLot.treatmentsPending.length > 0 ? (
              currentLot.treatmentsPending.map((treatment, index) => (
                <View key={index} style={styles.treatmentItem}>
                  <Text style={styles.treatmentName}>{treatment.name}</Text>
                  <Text style={styles.treatmentDate}>Prévu: {treatment.date}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.noTreatments}>Aucun traitement en attente</Text>
            )}
          </View>
        </View>
      </View>
      </Animated.ScrollView>

      <View style={styles.fixedFooter}>
        <Button
          title="Modifier"
          onPress={() => setIsEditModalVisible(true)}
          style={[styles.actionButton, { backgroundColor: colors.accent }]}
          icon="create-outline"
        />
        <Button
          text="Supprimer"
          onPress={handleDelete}
          style={[styles.actionButton, { backgroundColor: colors.error }]}
          icon="trash-outline"
        />
      </View>
      
      <SimpleBottomSheet isVisible={isEditModalVisible} onClose={() => setIsEditModalVisible(false)}>
        <EditLotForm
          lot={currentLot}
          onClose={() => setIsEditModalVisible(false)}
          onUpdateSuccess={handleUpdateSuccess}
        />
      </SimpleBottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 10,
  },
  closeButton: {
    marginRight: 16,
    padding: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
  },
  imageContainer: {
    position: 'relative',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
  },
  breedImage: {
    width: '100%',
    height: 200,
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  breedName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.backgroundAlt,
    textTransform: 'capitalize',
  },
  stageBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  stageText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.backgroundAlt,
    textTransform: 'uppercase',
  },
  infoContainer: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  infoRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  infoCard: {
    flex: 1,
    backgroundColor: colors.backgroundAlt,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  infoLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
    marginTop: 8,
    textAlign: 'center',
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginTop: 4,
    textAlign: 'center',
  },
  // 🆕 NOUVEAUX STYLES POUR LA SECTION IA
  optimalSaleSection: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#10b981',
  },
  profitabilityBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 16,
  },
  profitabilityText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.backgroundAlt,
  },
  dateRangeContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  dateRangeItem: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  dateRangeOptimal: {
    backgroundColor: '#10b98120',
    borderWidth: 2,
    borderColor: '#10b981',
  },
  dateRangeLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 4,
  },
  dateRangeValue: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  dateRangeOptimalText: {
    color: '#10b981',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  metricItem: {
    width: '48%',
    backgroundColor: colors.background,
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 4,
    textAlign: 'center',
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  recommendationBox: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#f59e0b20',
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
    padding: 12,
    borderRadius: 8,
  },
  recommendationText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    lineHeight: 20,
  },
  healthSection: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  healthBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 16,
  },
  healthText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.backgroundAlt,
  },
  healthStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  healthStat: {
    alignItems: 'center',
  },
  healthStatLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  healthStatValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginTop: 4,
  },
  treatmentSection: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  treatmentSubsection: {
    marginBottom: 16,
  },
  treatmentSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  treatmentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: colors.background,
    borderRadius: 8,
    marginBottom: 8,
  },
  treatmentName: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  treatmentDate: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  noTreatments: {
    fontSize: 14,
    color: colors.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 16,
  },
  fixedFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  actionButton: {
    flex: 1,
  },
});