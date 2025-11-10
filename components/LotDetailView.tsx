
import React from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity } from 'react-native';
import { colors, commonStyles } from '../styles/commonStyles';
import { Lot } from '../types';
import Icon from './Icon';
import Button from './Button';

interface LotDetailViewProps {
  lot: Lot;
  onClose: () => void;
}

export default function LotDetailView({ lot, onClose }: LotDetailViewProps) {
  const getBreedImage = (breed: string) => {
    // Generate breed-specific images from Unsplash
    const breedImages: { [key: string]: string } = {
      'broiler': 'https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?w=400&h=300&fit=crop',
      'layer': 'https://images.unsplash.com/photo-1612817288484-6f916006741a?w=400&h=300&fit=crop',
      'breeder': 'https://images.unsplash.com/photo-1594736797933-d0401ba2fe65?w=400&h=300&fit=crop',
      'ross 308': 'https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?w=400&h=300&fit=crop',
      'isa brown': 'https://images.unsplash.com/photo-1612817288484-6f916006741a?w=400&h=300&fit=crop',
      'rhode island red': 'https://images.unsplash.com/photo-1594736797933-d0401ba2fe65?w=400&h=300&fit=crop',
    };
    
    return breedImages[breed.toLowerCase()] || breedImages['broiler'];
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

  const stageInfo = getStageInfo(lot.stage);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Icon name="close" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>{lot.name}</Text>
      </View>

      <View style={styles.imageContainer}>
        <Image 
          source={{ uri: getBreedImage(lot.breed || lot.birdType) }}
          style={styles.breedImage}
          resizeMode="cover"
        />
        <View style={styles.imageOverlay}>
          <Text style={styles.breedName}>{lot.breed || lot.birdType}</Text>
          <View style={[styles.stageBadge, { backgroundColor: stageInfo.color }]}>
            <Text style={styles.stageText}>{lot.stage}</Text>
          </View>
        </View>
      </View>

      <View style={styles.infoContainer}>
        <View style={styles.infoRow}>
          <View style={styles.infoCard}>
            <Icon name="calendar" size={20} color={colors.primary} />
            <Text style={styles.infoLabel}>Entry Date</Text>
            <Text style={styles.infoValue}>{lot.entryDate || lot.dateCreated}</Text>
          </View>
          
          <View style={styles.infoCard}>
            <Icon name="time" size={20} color={colors.accent} />
            <Text style={styles.infoLabel}>Current Age</Text>
            <Text style={styles.infoValue}>{lot.age} days</Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <View style={styles.infoCard}>
            <Icon name="scale" size={20} color={colors.success} />
            <Text style={styles.infoLabel}>Avg Weight</Text>
            <Text style={styles.infoValue}>{lot.averageWeight || 'N/A'} kg</Text>
          </View>
          
          <View style={styles.infoCard}>
            <Icon name="cash" size={20} color={colors.accentSecondary} />
            <Text style={styles.infoLabel}>Price/kg</Text>
            <Text style={styles.infoValue}>{lot.sellingPrice || 'N/A'} CFA</Text>
          </View>
        </View>

        <View style={styles.healthSection}>
          <View style={styles.sectionHeader}>
            <Icon name="medical" size={24} color={getHealthStatusColor(lot.healthStatus)} />
            <Text style={styles.sectionTitle}>Health Status</Text>
          </View>
          
          <View style={[styles.healthBadge, { backgroundColor: getHealthStatusColor(lot.healthStatus) }]}>
            <Text style={styles.healthText}>{lot.healthStatus.toUpperCase()}</Text>
          </View>
          
          <View style={styles.healthStats}>
            <View style={styles.healthStat}>
              <Text style={styles.healthStatLabel}>Mortality</Text>
              <Text style={styles.healthStatValue}>{lot.mortality}</Text>
            </View>
            <View style={styles.healthStat}>
              <Text style={styles.healthStatLabel}>Feed/day</Text>
              <Text style={styles.healthStatValue}>{lot.feedConsumption}kg</Text>
            </View>
            <View style={styles.healthStat}>
              <Text style={styles.healthStatLabel}>Total Birds</Text>
              <Text style={styles.healthStatValue}>{lot.quantity}</Text>
            </View>
          </View>
        </View>

        <View style={styles.treatmentSection}>
          <Text style={styles.sectionTitle}>Treatments</Text>
          
          <View style={styles.treatmentSubsection}>
            <Text style={styles.treatmentSubtitle}>✅ Completed</Text>
            {lot.treatmentsDone && lot.treatmentsDone.length > 0 ? (
              lot.treatmentsDone.map((treatment, index) => (
                <View key={index} style={styles.treatmentItem}>
                  <Text style={styles.treatmentName}>{treatment.name}</Text>
                  <Text style={styles.treatmentDate}>{treatment.date}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.noTreatments}>No treatments completed yet</Text>
            )}
          </View>

          <View style={styles.treatmentSubsection}>
            <Text style={styles.treatmentSubtitle}>⏳ Pending</Text>
            {lot.treatmentsPending && lot.treatmentsPending.length > 0 ? (
              lot.treatmentsPending.map((treatment, index) => (
                <View key={index} style={styles.treatmentItem}>
                  <Text style={styles.treatmentName}>{treatment.name}</Text>
                  <Text style={styles.treatmentDate}>Due: {treatment.date}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.noTreatments}>No pending treatments</Text>
            )}
          </View>
        </View>

        <View style={styles.actionButtons}>
          <Button
            text="Health Analysis"
            onPress={() => console.log('Navigate to health analysis')}
            style={[styles.actionButton, { backgroundColor: colors.primary }]}
          />
          
          <Button
            text="Add Treatment"
            onPress={() => console.log('Add treatment')}
            style={[styles.actionButton, { backgroundColor: colors.accent }]}
          />
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
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
    paddingBottom: 40,
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
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
  },
});
