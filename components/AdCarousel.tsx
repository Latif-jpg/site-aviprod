import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Image, Dimensions } from 'react-native';
import { colors } from '../styles/commonStyles';
import Icon from './Icon';

const { width } = Dimensions.get('window');

const advertisements = [
  {
    id: 'ad1',
    title: 'Promotion Spéciale',
    subtitle: 'Jusqu\'à 30% de réduction',
    image: 'https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?w=800',
    color: colors.orange,
  },
  {
    id: 'ad2',
    title: 'Nouveaux Produits',
    subtitle: 'Découvrez notre gamme',
    image: 'https://images.unsplash.com/photo-1516467508483-a7212febe31a?w=800',
    color: colors.primary,
  },
  {
    id: 'ad3',
    title: 'Livraison Gratuite',
    subtitle: 'Sur commandes +50,000 CFA',
    image: 'https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=800',
    color: colors.accentSecondary,
  },
];

const AdCarousel = () => {
  return (
    <View style={styles.adBannerContainer}>
      <ScrollView 
        horizontal 
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        style={styles.adBannerScroll}
      >
        {advertisements.map((ad) => (
          <TouchableOpacity
            key={ad.id}
            style={[styles.adBanner, { backgroundColor: ad.color }]}
            activeOpacity={0.9}
          >
            <View style={styles.adBannerContent}>
              <View style={styles.adBannerText}>
                <Text style={styles.adBannerTitle}>{ad.title}</Text>
                <Text style={styles.adBannerSubtitle}>{ad.subtitle}</Text>
                <View style={styles.adBannerButton}>
                  <Text style={styles.adBannerButtonText}>Voir Plus</Text>
                  <Icon name="arrow-forward" size={16} color={colors.white} />
                </View>
              </View>
              <Image source={{ uri: ad.image }} style={styles.adBannerImage} />
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <View style={styles.adBannerDots}>
        {advertisements.map((_, index) => (
          <View key={index} style={[styles.adBannerDot, index === 0 && styles.adBannerDotActive]} />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  adBannerContainer: {
    marginBottom: 20,
  },
  adBannerScroll: {
    height: 160,
  },
  adBanner: {
    width: width - 40,
    height: 160,
    marginHorizontal: 20,
    borderRadius: 16,
    overflow: 'hidden',
  },
  adBannerContent: {
    flex: 1,
    flexDirection: 'row',
    padding: 20,
    justifyContent: 'space-between',
  },
  adBannerText: {
    flex: 1,
    justifyContent: 'center',
  },
  adBannerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.white,
    marginBottom: 8,
  },
  adBannerSubtitle: {
    fontSize: 16,
    color: colors.white,
    marginBottom: 16,
    opacity: 0.9,
  },
  adBannerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'flex-start',
    gap: 8,
  },
  adBannerButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.white,
  },
  adBannerImage: {
    width: 120,
    height: 120,
    borderRadius: 12,
  },
  adBannerDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
  },
  adBannerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
  },
  adBannerDotActive: {
    backgroundColor: colors.orange,
    width: 24,
  },
});

export default AdCarousel;
