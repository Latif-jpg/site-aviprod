// components/ProductCarousel.tsx
import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { colors } from '../styles/commonStyles';
import Icon from './Icon';
import ProductCard from './ProductCard';
import { Product } from '../lib/marketingAgent';

interface ProductCarouselProps {
  title: string;
  subtitle?: string;
  icon?: string;
  items: Product[];
  onOpenProduct: (product: Product) => void;
  currentUserId?: string;
}

export default function ProductCarousel({ title, subtitle, icon, items, onOpenProduct, currentUserId }: ProductCarouselProps) {
  if (!items || items.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {icon && <Icon name={icon as any} size={24} color={colors.primary} />}
        <View>
            <Text style={styles.title}>{title}</Text>
            {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {items.map((p) => (
          <View key={p.id} style={{ width: 170 }}>
            <ProductCard product={p} onPress={onOpenProduct} currentUserId={currentUserId} />
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 12,
    marginVertical: 10,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  header: { 
      marginBottom: 8,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
  },
  title: { fontSize: 16, fontWeight: '700', color: colors.primary },
  subtitle: { fontSize: 12, color: colors.textSecondary },
});