import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import AdCarousel from './AdCarousel';
import SponsoredCarousel from './SponsoredCarousel';
import { Product } from '../lib/marketingAgent';

interface AlternatingCarouselProps {
  sponsoredProducts: Product[];
  onProductPress: (product: Product) => void;
}

const AlternatingCarousel: React.FC<AlternatingCarouselProps> = ({ sponsoredProducts, onProductPress }) => {
  const [showAds, setShowAds] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => {
      setShowAds(prevShowAds => !prevShowAds);
    }, 10000); // 10 seconds

    return () => clearInterval(timer);
  }, []);

  return (
    <View style={styles.container}>
      {showAds ? (
        <AdCarousel />
      ) : (
        <SponsoredCarousel products={sponsoredProducts} onProductPress={onProductPress} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    minHeight: 220, // Adjust to the height of the largest carousel
  },
});

export default AlternatingCarousel;
