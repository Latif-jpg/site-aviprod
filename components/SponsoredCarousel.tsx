import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Image, Dimensions } from 'react-native';
import { colors } from '../styles/commonStyles';
import Icon from './Icon';
import { Product } from '../lib/marketingAgent';
import { getMarketplaceImageUrl } from '../config'; // Le chemin est déjà correct, mais je le confirme.

const { width } = Dimensions.get('window');

interface SponsoredCarouselProps {
  products: Product[];
  onProductPress: (product: Product) => void;
}

const SponsoredCarousel: React.FC<SponsoredCarouselProps> = ({ products, onProductPress }) => {
  if (!products || products.length === 0) {
    return null;
  }

  return (
    <View style={styles.flashSalesSection}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionHeaderLeft}>
          <Icon name="star" size={24} color={colors.primary} />
          <Text style={styles.sectionTitle}>Recommandations</Text>
        </View>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.flashSalesContainer}
      >
        {products.map((product) => {
          const imageUrl = getMarketplaceImageUrl(product.image);
          console.log('Sponsored Product Image URL:', imageUrl);
          return (
          <TouchableOpacity
            key={product.id}
            style={styles.flashSaleCard}
            onPress={() => onProductPress(product)}
          >
            <Image source={{ uri: imageUrl }} style={styles.flashSaleImage} />
            <View style={styles.flashSaleBadge}>
              <Text style={styles.flashSaleBadgeText}>IA</Text>
            </View>
            {!product.in_stock && (
              <View style={styles.soldOutBadge}>
                <Text style={styles.soldOutText}>Vendu</Text>
              </View>
            )}
            <View style={styles.flashSaleInfo}>
              <Text style={styles.flashSaleName} numberOfLines={2}>{product.name || 'Sans nom'}</Text>
              <Text style={styles.flashSalePrice}>{(product.price || 0).toLocaleString()} CFA</Text>
              <View style={styles.flashSaleRating}>
                <Icon name="star" size={14} color={colors.warning} />
                <Text style={styles.flashSaleRatingText}>{product.rating || 0}</Text>
              </View>
            </View>
          </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  flashSalesSection: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
  },
  flashSalesContainer: {
    paddingHorizontal: 20,
    gap: 12,
  },
  flashSaleCard: {
    width: 140,
    backgroundColor: colors.backgroundAlt,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  flashSaleImage: {
    width: '100%',
    height: 140,
    backgroundColor: colors.border,
  },
  flashSaleBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  flashSaleBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.white,
  },
  soldOutBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: colors.error,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  soldOutText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.white,
  },
  flashSaleInfo: {
    padding: 12,
  },
  flashSaleName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  flashSalePrice: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.orange,
    marginBottom: 4,
  },
  flashSaleRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  flashSaleRatingText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#000000',
  },
});

export default SponsoredCarousel;
