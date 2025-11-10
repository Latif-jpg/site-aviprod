import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, useWindowDimensions } from 'react-native';
import { colors } from '../styles/commonStyles';
import Icon from './Icon';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';

interface AdItem {
  id: string;
  image_url?: string;
  image?: string;
  title: string;
  subtitle: string;
  target_url?: string;
  action?: () => void;
}

interface AdBannerProps {
  type?: 'marketplace-booster' | 'partner-ad';
  ads?: AdItem[];
  autoScrollInterval?: number; // in milliseconds
}

export default function AdBanner({
  ads = [],
  autoScrollInterval = 5000
}: AdBannerProps) {

  const { width } = useWindowDimensions();
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (ads.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => {
        const nextIndex = (prevIndex + 1) % ads.length;
        scrollViewRef.current?.scrollTo({
          x: nextIndex * (width - 40),
          animated: true,
        });
        return nextIndex;
      });
    }, autoScrollInterval);

    return () => clearInterval(interval);
  }, [ads.length, autoScrollInterval, width]);

  const handleAdPress = (ad: AdItem) => {
    if (ad.action) {
      ad.action();
      return;
    }

    const url = ad.target_url;
    if (!url) return;

    if (url.startsWith('http://') || url.startsWith('https://')) {
      Linking.openURL(url);
    } else {
      router.push(url as any);
    }
  };

  const handleScroll = (event: any) => {
    const slideSize = width - 40;
    const index = Math.round(event.nativeEvent.contentOffset.x / slideSize);
    setCurrentIndex(index);
  };

  if (ads.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        contentContainerStyle={styles.scrollContainer}
      >
        {ads.map((ad) => (
          <TouchableOpacity
            key={ad.id}
            style={[styles.adSlide, { width: width - 40 }]}
            onPress={() => handleAdPress(ad)}
            activeOpacity={0.9}
          >
            <Image
              source={{ uri: ad.image_url || ad.image || 'https://via.placeholder.com/150' }}
              style={styles.adImage}
              resizeMode="cover"
            />
            <View style={styles.overlay}>
              <View style={styles.textContainer}>
                <Text style={styles.title}>{ad.title}</Text>
                <Text style={styles.subtitle}>{ad.subtitle}</Text>
              </View>
              <View style={styles.ctaContainer}>
                <Text style={styles.ctaText}>Voir plus</Text>
                <Icon name="chevron-forward" size={16} color={colors.white} />
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {ads.length > 1 && (
        <View style={styles.indicatorContainer}>
          {ads.map((_, index) => (
            <View
              key={index}
              style={[
                styles.indicator,
                index === currentIndex && styles.activeIndicator
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
    marginBottom: 20,
    height: 200, // Augmentation de la hauteur
  },
  scrollContainer: {
    paddingHorizontal: 0,
  },
  adSlide: {
    height: 200, // Augmentation de la hauteur
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  adImage: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'space-between',
    padding: 16,
  },
  textContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.white,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: colors.white,
    fontWeight: '500',
    opacity: 0.9,
  },
  ctaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    gap: 8,
  },
  ctaText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.white,
  },
  indicatorContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
  },
  activeIndicator: {
    backgroundColor: colors.primary,
    width: 24,
  },
});