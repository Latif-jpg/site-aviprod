
import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { colors } from '../styles/commonStyles';
import Icon from './Icon';
import { Lot } from '../types';

interface LotCardProps {
  lot: Lot;
  onPress: () => void;
}

const LotCard = ({ lot, onPress }: LotCardProps) => {
  // Safely access lot properties with fallbacks and null checks
  if (!lot) {
    console.error('❌ LotCard: lot is undefined or null');
    return null;
  }

  const getHealthStatusColor = (status: string) => {
    switch (status) {
      case 'excellent': return colors.success;
      case 'good': return colors.primary;
      case 'fair': return colors.warning;
      case 'poor': return colors.error;
      default: return colors.textSecondary;
    }
  };

  const getHealthStatusIcon = (status: string) => {
    switch (status) {
      case 'excellent': return 'checkmark-circle';
      case 'good': return 'checkmark-circle';
      case 'fair': return 'warning';
      case 'poor': return 'close-circle';
      default: return 'help-circle';
    }
  };

  const calculateDaysUntilExit = () => {
    // Prioritize target_sale_date if it exists
    if (lot.targetSaleDate) {
      try {
        const targetDate = new Date(lot.targetSaleDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const daysRemaining = Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return daysRemaining > 0 ? daysRemaining : 0;
      } catch (e) {
        // Fallback to age-based calculation if date is invalid
      }
    }
    // Typical exit ages by bird type
    const exitAges: Record<string, number> = {
      broilers: 42, // 6 weeks
      layers: 540, // 18 months
      breeders: 365, // 12 months
    };

    const exitAge = exitAges[lot.birdType] || 42;
    const daysRemaining = exitAge - (lot.age || 0);
    
    return daysRemaining > 0 ? daysRemaining : 0;
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('fr-FR', { 
        day: '2-digit', 
        month: 'short', 
        year: 'numeric' 
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Date invalide';
    }
  };

  const calculateExitDate = () => {
    try {
      const exitAges: Record<string, number> = {
        broilers: 42,
        layers: 540,
        breeders: 365,
      };

      const exitAge = exitAges[lot.birdType] || 42;
      const entryDate = new Date(lot.entryDate);
      const exitDate = new Date(entryDate);
      exitDate.setDate(exitDate.getDate() + exitAge);
      
      return exitDate.toLocaleDateString('fr-FR', { 
        day: '2-digit', 
        month: 'short', 
        year: 'numeric' 
      });
    } catch (error) {
      console.error('Error calculating exit date:', error);
      return 'Date invalide';
    }
  };

  const daysUntilExit = calculateDaysUntilExit();

  const mortalityRate = (lot.initial_quantity || 0) > 0 ? ((lot.mortality || 0) / (lot.initial_quantity || 0)) * 100 : 0;
  const isMortalityHigh = mortalityRate > 1;
  const currentQuantity = ((lot.initial_quantity || lot.quantity) || 0) - (lot.mortality || 0);

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
      {lot.breedImage ? (
        <Image source={{ uri: lot.breedImage }} style={styles.image} />
      ) : (
        <View style={[styles.image, styles.imagePlaceholder]}>
          <Icon name="egg" size={48} color={colors.textSecondary} />
          <Text style={styles.placeholderText}>Image non disponible</Text>
        </View>
      )}
      
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.name}>{lot.name}</Text>
            <Text style={styles.breed}>{lot.breed}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getHealthStatusColor(lot.healthStatus) }]}>
            <Icon 
              name={getHealthStatusIcon(lot.healthStatus) as any} 
              size={12} 
              color={colors.backgroundAlt} 
            />
            <Text style={styles.statusText}>{lot.healthStatus}</Text>
          </View>
        </View>

        <View style={styles.infoGrid}>
          <View style={styles.infoItem}>
            <Icon name="calendar" size={16} color={colors.primary} />
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoLabel}>Entrée</Text>
              <Text style={styles.infoValue}>{formatDate(lot.entryDate)}</Text>
            </View>
          </View>

          <View style={styles.infoItem}>
            <Icon name="time" size={16} color={colors.accent} />
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoLabel}>Âge actuel</Text>
              <Text style={styles.infoValue}>{lot.age} jours</Text>
            </View>
          </View>

          <View style={styles.infoItem}>
            <Icon name="calendar-outline" size={16} color={colors.success} />
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoLabel}>Sortie prévue</Text>
              <Text style={styles.infoValue}>{calculateExitDate()}</Text>
            </View>
          </View>

          <View style={styles.infoItem}>
            <Icon name="hourglass" size={16} color={colors.warning} />
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoLabel}>Jours restants</Text>
              <Text style={styles.infoValue}>{daysUntilExit} jours</Text>
            </View>
          </View>
        </View>

        <View style={styles.stats}>
          <View style={styles.statItem}>
            <Icon name="egg" size={16} color={colors.primary} />
            <Text style={styles.statValue}>{currentQuantity}</Text>
            <Text style={styles.statLabel}>volailles</Text>
          </View>
          
          <View style={styles.statItem}>
            <Icon name="scale" size={16} color={colors.accent} />
            <Text style={styles.statValue}>{lot.averageWeight}kg</Text>
            <Text style={styles.statLabel}>poids moy.</Text>
          </View>
          <View style={styles.statItem}>
            <Icon name="cash" size={16} color={colors.success} />
            <Text style={styles.statValue}>{lot.sellingPrice}</Text>
            <Text style={styles.statLabel}>CFA/kg</Text>
          </View>
        </View>

        <View style={styles.healthStats}>
          <View style={styles.healthStatItem}>
            <Icon name="warning" size={16} color={colors.warning} />
            <Text style={styles.healthStatValue}>{lot.sickCount || 0}</Text>
            <Text style={styles.healthStatLabel}>Malades</Text>
          </View>
          <View style={styles.healthStatItem}>
            <Icon name="close-circle" size={16} color={colors.error} />
            <Text style={styles.healthStatValue}>{lot.mortality || 0}</Text>
            <Text style={styles.healthStatLabel}>Morts</Text>
          </View>
          <View style={styles.healthStatItem}>
            <Icon name="flash" size={16} color={colors.accent} />
            <Text style={styles.healthStatValue}>{lot.quarantinedCount || 0}</Text>
            <Text style={styles.healthStatLabel}>Quarantaine</Text>
          </View>
          <View style={styles.healthStatItem}>
            <Icon name="shield-checkmark" size={16} color={colors.success} />
            <Text style={styles.healthStatValue}>
              {lot.quantity - (lot.mortality || 0) - (lot.sickCount || 0) - (lot.quarantinedCount || 0)}
            </Text>
            <Text style={styles.healthStatLabel}>Sains</Text>
          </View>
        </View>

        {isMortalityHigh && (
          <View style={styles.mortalityAlert}>
            <Icon name="warning" size={16} color={colors.error} />
            <Text style={styles.mortalityAlertText}>
              Taux de mortalité élevé: {mortalityRate.toFixed(2)}% 
              (Seuil: 1%)
            </Text>
          </View>
        )}

        {lot.treatmentsPending && lot.treatmentsPending.length > 0 && (
          <View style={styles.treatmentsAlert}>
            <Icon name="medical" size={16} color={colors.warning} />
            <Text style={styles.treatmentsText}>
              {lot.treatmentsPending.length} traitement{lot.treatmentsPending.length > 1 ? 's' : ''} à faire
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

export default memo(LotCard);

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 16,
    marginHorizontal: 20,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  image: {
    width: '100%',
    height: 180,
    resizeMode: 'cover',
  },
  imagePlaceholder: {
    backgroundColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  placeholderText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  content: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  headerLeft: {
    flex: 1,
  },
  name: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 4,
  },
  breed: {
    fontSize: 14,
    color: '#000000',
    fontWeight: '500',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  locationText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '500',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.backgroundAlt,
    textTransform: 'uppercase',
  },
  descriptionContainer: {
    backgroundColor: colors.background,
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  descriptionText: {
    fontSize: 13,
    color: '#000000',
    lineHeight: 18,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: '48%',
  },
  infoTextContainer: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    color: '#000000',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000000',
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  healthStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    backgroundColor: colors.background,
    borderRadius: 8,
    marginVertical: 16,
  },
  healthStatItem: {
    alignItems: 'center',
    gap: 4,
  },
  healthStatValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
  },
  healthStatLabel: {
    fontSize: 11,
    color: '#000000',
    fontWeight: '500',
  },
  statItem: {
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
  },
  statLabel: {
    fontSize: 11,
    color: '#000000',
    fontWeight: '500',
  },
  treatmentsAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warning + '20',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    gap: 8,
  },
  treatmentsText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.warning,
    flex: 1,
  },
  mortalityAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warning + '20',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    gap: 8,
  },
  mortalityAlertText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.error,
    flex: 1,
  },
});
