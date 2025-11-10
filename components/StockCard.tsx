
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, commonStyles } from '../styles/commonStyles';
import { StockItem } from '../types';
import Icon from './Icon';

interface StockCardProps {
  item: StockItem;
  onPress?: () => void;
}

const StockCard: React.FC<StockCardProps> = ({ item, onPress }) => {
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'feed': return 'nutrition' as const;
      case 'medicine': return 'medical' as const;
      case 'equipment': return 'construct' as const;
      default: return 'cube' as const;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'feed': return colors.success;
      case 'medicine': return colors.error;
      case 'equipment': return colors.primary;
      default: return colors.textSecondary;
    }
  };

  // --- AMÉLIORATION : Logique de détection du seuil de stock ---
  const isLowStock = item.quantity <= item.min_threshold;
  // Le "stock de sécurité" est considéré comme le double du seuil minimum. La barre de progression est basée sur ce niveau.
  const maxStockForPercentage = (item.min_threshold || 10) * 2; // Si pas de seuil, on assume 10.
  const stockPercentage = (item.quantity / maxStockForPercentage) * 100;

  return (
    <TouchableOpacity
      style={[commonStyles.card, styles.stockCard, isLowStock && styles.lowStockCard]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <View style={[
          styles.iconContainer,
          { backgroundColor: getCategoryColor(item.category) + '20' }
        ]}>
          <Icon 
            name={getCategoryIcon(item.category)} 
            size={20} 
            color={getCategoryColor(item.category)} 
          />
        </View>
        
        <View style={styles.itemInfo}>
          <Text style={styles.itemName}>{item.name}</Text>
          <Text style={styles.supplier}>{item.supplier || 'Sans fournisseur'}</Text>
        </View>

        {isLowStock && (
          <View style={styles.alertBadge}>
            <Icon name="warning" size={16} color={colors.error} />
          </View>
        )}
      </View>

      <View style={styles.quantityContainer}>
        <View style={styles.quantityInfo}>
          <Text style={[
            styles.quantity,
            isLowStock && styles.lowStockText
          ]}>
            {item.quantity} {item.unit}
          </Text>
          <Text style={styles.threshold}>
            Min: {item.min_threshold} {item.unit}
          </Text>
        </View>

        <View style={styles.stockBar}>
          <View 
            style={[
              styles.stockFill,
              { 
                width: `${Math.min(stockPercentage, 100)}%`,
                backgroundColor: isLowStock ? colors.error : colors.success
              }
            ]} 
          />
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.category}>{item.category}</Text>
        <Text style={styles.cost}>{item.cost.toLocaleString()} CFA/{item.unit}</Text>
      </View>

      {item.expiryDate && (
        <View style={styles.expiryContainer}>
          <Icon name="alarm" size={14} color={colors.warning} />
          <Text style={styles.expiryDate}>
            Expire: {new Date(item.expiryDate).toLocaleDateString()}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  stockCard: {
    marginHorizontal: 0,
    borderWidth: 1,
    borderColor: colors.secondary,
  },
  lowStockCard: {
    borderColor: colors.error,
    backgroundColor: colors.error + '10',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  supplier: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  alertBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.error + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityContainer: {
    marginBottom: 12,
  },
  quantityInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  quantity: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  lowStockText: {
    color: colors.error,
  },
  threshold: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  stockBar: {
    height: 6,
    backgroundColor: colors.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  stockFill: {
    height: '100%',
    borderRadius: 3,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  category: {
    fontSize: 14,
    color: colors.textSecondary,
    textTransform: 'capitalize',
  },
  cost: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  expiryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  expiryDate: {
    fontSize: 12,
    color: colors.warning,
    marginLeft: 6,
    fontWeight: '500',
  },
});

export default StockCard;
