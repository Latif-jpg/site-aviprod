import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { colors } from '../styles/commonStyles';
import { getMarketplaceImageUrl } from '../config'; // Importer la fonction
import Icon from './Icon';
import { Product } from '../lib/marketingAgent'; // Assuming Product type is exported from here


interface ProductCardProps {
  product: Product;
  onPress: (product: Product) => void;
  currentUserId?: string;
}

export default function ProductCard({ product, onPress, currentUserId }: ProductCardProps) {
  if (!product) return null;

  const isOwnProduct = currentUserId && product.seller_id === currentUserId;

  return (
    <TouchableOpacity
      key={product.id}
      style={styles.productCard}
      onPress={() => onPress(product)}
    >
      <Image source={{ uri: getMarketplaceImageUrl(product.image) }} style={styles.productImage} />
      {!product.in_stock && (
        <View style={styles.outOfStockBadge}>
          <Text style={styles.outOfStockText}>Vendu</Text>
        </View>
      )}
      {isOwnProduct && (
        <View style={styles.ownProductBadge}>
          <Icon name="person" size={12} color={colors.white} />
        </View>
      )}
      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={2}>{product.name || 'Sans nom'}</Text>
        {product.farm_name && (
          <Text style={styles.productFarmName} numberOfLines={1}>
            Par: {product.farm_name}
          </Text>
        )}
        {(product.location || product.city) && (
          <View style={styles.productLocation}>
            <Icon name="location" size={12} color={colors.orange} />
            <Text style={styles.productLocationText} numberOfLines={1}>
              {product.city || product.location}
            </Text>
          </View>
        )}
        <Text style={styles.productDescription} numberOfLines={1}>{product.description || ''}</Text>
        {product.is_on_sale && product.discount_percentage > 0 ? (
          <View style={styles.priceContainer}>
            <Text style={styles.originalPrice}>
              {(product.price || 0).toLocaleString()} CFA
            </Text>
            <Text style={styles.discountedPrice}>
              {((product.price || 0) * (1 - (product.discount_percentage || 0) / 100)).toLocaleString()} CFA
            </Text>
          </View>
        ) : (
          <Text style={styles.productPrice}>{(product.price || 0).toLocaleString()} CFA</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  productCard: {
    width: '48%',
    backgroundColor: colors.backgroundAlt,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
  },
  productImage: {
    width: '100%',
    height: 120,
    backgroundColor: colors.border,
  },
  productInfo: {
    padding: 12,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  productDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  productFarmName: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  originalPrice: {
    fontSize: 14,
    color: colors.textSecondary,
    textDecorationLine: 'line-through',
    marginRight: 5,
  },
  discountedPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.error,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.orange,
  },
  outOfStockBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  outOfStockText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.white,
  },
  ownProductBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: colors.primary,
    padding: 4,
    borderRadius: 12,
  },
  productLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  productLocationText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
});
