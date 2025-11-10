import React from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

interface StockSkeletonProps {
  type?: 'header' | 'prediction' | 'lot' | 'stock-item' | 'stats' | 'optimization';
  count?: number;
}

const StockSkeleton: React.FC<StockSkeletonProps> = ({ type = 'stock-item', count = 1 }) => {
  const animatedValue = new Animated.Value(0);

  React.useEffect(() => {
    const startAnimation = () => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(animatedValue, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(animatedValue, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    };

    startAnimation();
  }, []);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  const renderSkeleton = () => {
    switch (type) {
      case 'header':
        return (
          <View style={styles.headerContainer}>
            <Animated.View style={[styles.headerCard, { opacity }]}>
              <View style={styles.headerIcon} />
              <View style={styles.headerContent}>
                <View style={styles.headerLabel} />
                <View style={styles.headerValue} />
              </View>
            </Animated.View>
          </View>
        );

      case 'prediction':
        return (
          <Animated.View style={[styles.predictionCard, { opacity }]}>
            <View style={styles.predictionHeader}>
              <View style={styles.predictionTitleRow}>
                <View style={styles.predictionIcon} />
                <View style={styles.predictionTitle} />
              </View>
              <View style={styles.predictionBadge} />
            </View>
            <View style={styles.predictionMetrics}>
              {[1, 2, 3, 4].map(i => (
                <View key={i} style={styles.metricRow}>
                  <View style={styles.metricLeft}>
                    <View style={styles.metricIcon} />
                    <View style={styles.metricLabel} />
                  </View>
                  <View style={styles.metricValue} />
                </View>
              ))}
            </View>
            <View style={styles.predictionRecommendations}>
              <View style={styles.recoTitle} />
              <View style={styles.recoDate} />
              <View style={styles.recoQuantity} />
              <View style={styles.recoAffected} />
            </View>
            <View style={styles.predictionActions}>
              <View style={styles.trackButton} />
            </View>
          </Animated.View>
        );

      case 'lot':
        return (
          <Animated.View style={[styles.lotCard, { opacity }]}>
            <View style={styles.lotHeader}>
              <View style={styles.lotInfo}>
                <View style={styles.lotName} />
                <View style={styles.lotDetails} />
              </View>
              <View style={styles.lotConsumption}>
                <View style={styles.lotConsumptionValue} />
                <View style={styles.lotConsumptionLabel} />
              </View>
            </View>
            <View style={styles.lotFeedType}>
              <View style={styles.feedTypeIcon} />
              <View style={styles.feedTypeText} />
            </View>
          </Animated.View>
        );

      case 'stats':
        return (
          <View style={styles.statsContainer}>
            {[1, 2, 3].map(i => (
              <Animated.View key={i} style={[styles.statCard, { opacity }]}>
                <View style={styles.statValue} />
                <View style={styles.statLabel} />
              </Animated.View>
            ))}
          </View>
        );

      case 'optimization':
        return (
          <Animated.View style={[styles.optimizationCard, { opacity }]}>
            <View style={styles.optimizationHeader}>
              <View style={styles.optimizationPriority} />
              <View style={styles.optimizationInfo}>
                <View style={styles.optimizationTitle} />
                <View style={styles.optimizationTags}>
                  <View style={styles.tag} />
                  <View style={styles.tag} />
                </View>
              </View>
            </View>
            <View style={styles.optimizationDescription} />
            <View style={styles.optimizationActions}>
              <View style={styles.actionsTitle} />
              {[1, 2, 3].map(i => (
                <View key={i} style={styles.actionItem}>
                  <View style={styles.actionBullet} />
                  <View style={styles.actionText} />
                </View>
              ))}
            </View>
          </Animated.View>
        );

      default: // stock-item
        return Array.from({ length: count }, (_, i) => (
          <Animated.View key={i} style={[styles.stockItemCard, { opacity }]}>
            <View style={styles.stockItemHeader}>
              <View style={styles.stockItemInfo}>
                <View style={styles.stockItemName} />
                <View style={styles.stockItemCategory} />
              </View>
              <View style={styles.stockItemQuantity}>
                <View style={styles.stockItemQuantityValue} />
              </View>
            </View>
            <View style={styles.stockItemDetails}>
              <View style={styles.stockItemDetail}>
                <View style={styles.detailIcon} />
                <View style={styles.detailText} />
              </View>
              <View style={styles.stockItemDetail}>
                <View style={styles.detailIcon} />
                <View style={styles.detailText} />
              </View>
            </View>
          </Animated.View>
        ));
    }
  };

  return (
    <LinearGradient
      colors={['#F9FAFB', '#F3F4F6', '#F9FAFB']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={styles.gradientContainer}
    >
      {renderSkeleton()}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradientContainer: {
    borderRadius: 12,
    overflow: 'hidden',
  },

  // Header skeleton
  headerContainer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
  },
  headerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    padding: 16,
    borderRadius: 12,
    gap: 16,
  },
  headerIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#E0F2FE',
  },
  headerContent: {
    flex: 1,
  },
  headerLabel: {
    width: 120,
    height: 14,
    borderRadius: 4,
    backgroundColor: '#E0F2FE',
    marginBottom: 8,
  },
  headerValue: {
    width: 80,
    height: 24,
    borderRadius: 6,
    backgroundColor: '#E0F2FE',
  },

  // Prediction skeleton
  predictionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#E5E7EB',
  },
  predictionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  predictionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  predictionIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  predictionTitle: {
    width: 150,
    height: 16,
    borderRadius: 4,
    backgroundColor: '#F3F4F6',
  },
  predictionBadge: {
    width: 60,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
  },
  predictionMetrics: {
    marginBottom: 16,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  metricLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metricIcon: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  metricLabel: {
    width: 100,
    height: 14,
    borderRadius: 4,
    backgroundColor: '#F3F4F6',
  },
  metricValue: {
    width: 60,
    height: 14,
    borderRadius: 4,
    backgroundColor: '#F3F4F6',
  },
  predictionRecommendations: {
    backgroundColor: '#F0F9FF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  recoTitle: {
    width: 100,
    height: 13,
    borderRadius: 4,
    backgroundColor: '#E0F2FE',
    marginBottom: 6,
  },
  recoDate: {
    width: 120,
    height: 14,
    borderRadius: 4,
    backgroundColor: '#E0F2FE',
    marginBottom: 8,
  },
  recoQuantity: {
    width: 140,
    height: 13,
    borderRadius: 4,
    backgroundColor: '#E0F2FE',
    marginBottom: 4,
  },
  recoAffected: {
    width: 80,
    height: 12,
    borderRadius: 4,
    backgroundColor: '#E0F2FE',
  },
  predictionActions: {
    flexDirection: 'row',
    gap: 8,
  },
  trackButton: {
    flex: 1,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
  },

  // Lot skeleton
  lotCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  lotHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  lotInfo: {
    flex: 1,
  },
  lotName: {
    width: 120,
    height: 16,
    borderRadius: 4,
    backgroundColor: '#F3F4F6',
    marginBottom: 4,
  },
  lotDetails: {
    width: 100,
    height: 13,
    borderRadius: 4,
    backgroundColor: '#F3F4F6',
  },
  lotConsumption: {
    alignItems: 'flex-end',
  },
  lotConsumptionValue: {
    width: 60,
    height: 18,
    borderRadius: 4,
    backgroundColor: '#F3F4F6',
    marginBottom: 4,
  },
  lotConsumptionLabel: {
    width: 50,
    height: 11,
    borderRadius: 4,
    backgroundColor: '#F3F4F6',
  },
  lotFeedType: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  feedTypeIcon: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  feedTypeText: {
    width: 80,
    height: 13,
    borderRadius: 4,
    backgroundColor: '#F3F4F6',
  },

  // Stats skeleton
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    paddingTop: 0,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  statValue: {
    width: 40,
    height: 18,
    borderRadius: 4,
    backgroundColor: '#F3F4F6',
    marginBottom: 4,
  },
  statLabel: {
    width: 50,
    height: 12,
    borderRadius: 4,
    backgroundColor: '#F3F4F6',
  },

  // Optimization skeleton
  optimizationCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  optimizationHeader: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  optimizationPriority: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  optimizationInfo: {
    flex: 1,
  },
  optimizationTitle: {
    width: 200,
    height: 16,
    borderRadius: 4,
    backgroundColor: '#F3F4F6',
    marginBottom: 8,
  },
  optimizationTags: {
    flexDirection: 'row',
    gap: 8,
  },
  tag: {
    width: 60,
    height: 20,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
  },
  optimizationDescription: {
    width: '100%',
    height: 40,
    borderRadius: 4,
    backgroundColor: '#F3F4F6',
    marginBottom: 12,
  },
  optimizationActions: {
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
  },
  actionsTitle: {
    width: 120,
    height: 13,
    borderRadius: 4,
    backgroundColor: '#F3F4F6',
    marginBottom: 8,
  },
  actionItem: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 6,
  },
  actionBullet: {
    width: 8,
    height: 14,
    borderRadius: 4,
    backgroundColor: '#F3F4F6',
  },
  actionText: {
    flex: 1,
    height: 13,
    borderRadius: 4,
    backgroundColor: '#F3F4F6',
  },

  // Stock item skeleton
  stockItemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  stockItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  stockItemInfo: {
    flex: 1,
  },
  stockItemName: {
    width: 140,
    height: 16,
    borderRadius: 4,
    backgroundColor: '#F3F4F6',
    marginBottom: 4,
  },
  stockItemCategory: {
    width: 80,
    height: 13,
    borderRadius: 4,
    backgroundColor: '#F3F4F6',
  },
  stockItemQuantity: {
    alignItems: 'flex-end',
  },
  stockItemQuantityValue: {
    width: 50,
    height: 18,
    borderRadius: 4,
    backgroundColor: '#F3F4F6',
  },
  stockItemDetails: {
    gap: 8,
  },
  stockItemDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailIcon: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#F3F4F6',
  },
  detailText: {
    width: 100,
    height: 13,
    borderRadius: 4,
    backgroundColor: '#F3F4F6',
  },
});

export default StockSkeleton;