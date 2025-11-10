import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Dimensions, Animated } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../styles/commonStyles';
import Icon from '../components/Icon';

const { width } = Dimensions.get('window');

const onboardingSlides = [
  {
    key: '1',
    logo: '🐔',
    title: 'Aviprod',
    subtitle: 'Gérez votre élevage intelligemment',
    features: [
      { icon: 'analytics', text: 'Suivi en temps réel de vos lots' },
      { icon: 'heart', text: 'Gestion sanitaire intelligente' },
      { icon: 'cash', text: 'Optimisation financière' },
    ],
    gradient: ['#10996E', '#0D7A57'],
    buttonColor: '#10996E',
  },
  {
    key: '2',
    logo: '📊',
    title: 'Gestion des Lots',
    subtitle: 'Contrôlez chaque détail',
    features: [
      { icon: 'egg', text: 'Suivez la croissance de vos volailles' },
      { icon: 'trending-up', text: 'Analyses de performance en temps réel' },
      { icon: 'notifications', text: 'Alertes automatiques personnalisées' },
    ],
    gradient: ['#667eea', '#764ba2'],
    buttonColor: '#667eea',
  },
  {
    key: '3',
    logo: '❤️',
    title: 'Santé & Prophylaxie',
    subtitle: 'Prévention intelligente',
    features: [
      { icon: 'bug', text: 'IA pour détecter les problèmes' },
      { icon: 'medical', text: 'Calendrier de vaccination automatique' },
      { icon: 'pulse', text: 'Suivi de la mortalité et des symptômes' },
    ],
    gradient: ['#f093fb', '#f5576c'],
    buttonColor: '#f5576c',
  },
  {
    key: '4',
    logo: '💰',
    title: 'Finance & Rentabilité',
    subtitle: 'Maximisez vos profits',
    features: [
      { icon: 'trending-down', text: 'Suivi des dépenses et revenus' },
      { icon: 'analytics', text: 'Analyses de rentabilité par lot' },
      { icon: 'cart', text: 'Marketplace intégré' },
    ],
    gradient: ['#4facfe', '#00f2fe'],
    buttonColor: '#4facfe',
  },
];

const Slide = ({ item }: { item: typeof onboardingSlides[0] }) => (
  <LinearGradient colors={item.gradient} style={styles.slide}>
    <View style={styles.logoArea}>
      <View style={styles.logo}>
        <Text style={styles.logoEmoji}>{item.logo}</Text>
      </View>
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.subtitle}>{item.subtitle}</Text>
    </View>

    <View style={styles.features}>
      {item.features.map((feature, index) => (
        <View key={index} style={styles.feature}>
          <Icon name={feature.icon as any} size={24} color="#fff" />
          <Text style={styles.featureText}>{feature.text}</Text>
        </View>
      ))}
    </View>
  </LinearGradient>
);

const Pagination = ({ data, scrollX }: { data: any[], scrollX: Animated.Value }) => {
  return (
    <View style={styles.pagination}>
      {data.map((_, i) => {
        const inputRange = [(i - 1) * width, i * width, (i + 1) * width];
        const dotWidth = scrollX.interpolate({
          inputRange,
          outputRange: [8, 24, 8],
          extrapolate: 'clamp',
        });
        const opacity = scrollX.interpolate({
          inputRange,
          outputRange: [0.4, 1, 0.4],
          extrapolate: 'clamp',
        });
        return <Animated.View key={i.toString()} style={[styles.dot, { width: dotWidth, opacity }]} />;
      })}
    </View>
  );
};

export default function WelcomeScreen() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;
  const slidesRef = useRef<FlatList>(null);

  const viewableItemsChanged = useRef(({ viewableItems }: { viewableItems: any[] }) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;

  const viewConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const handleCompleteOnboarding = async () => {
    try {
      await AsyncStorage.setItem('@onboarding_completed', 'true');
      router.replace('/auth');
    } catch (error) {
      console.error('Error completing onboarding:', error);
      // Fallback in case of error
      router.replace('/auth');
    }
  };

  const handleNext = () => {
    if (currentIndex < onboardingSlides.length - 1) {
      slidesRef.current?.scrollToIndex({ index: currentIndex + 1 });
    } else {
      handleCompleteOnboarding();
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <TouchableOpacity style={styles.skipButton} onPress={handleCompleteOnboarding}>
        <Text style={styles.skipButtonText}>Passer</Text>
      </TouchableOpacity>

      <FlatList
        data={onboardingSlides}
        renderItem={({ item }) => <Slide item={item} />}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        keyExtractor={(item) => item.key}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
          useNativeDriver: false,
        })}
        scrollEventThrottle={32}
        onViewableItemsChanged={viewableItemsChanged}
        viewabilityConfig={viewConfig}
        ref={slidesRef}
      />

      <View style={styles.footer}>
        <Pagination data={onboardingSlides} scrollX={scrollX} />
        <TouchableOpacity
          style={[styles.button, { backgroundColor: onboardingSlides[currentIndex].buttonColor }]}
          onPress={handleNext}
        >
          <Text style={styles.buttonText}>
            {currentIndex === onboardingSlides.length - 1 ? 'Commencer' : 'Suivant'}
          </Text>
        </TouchableOpacity>
        <Text style={styles.footerText}>by GreenEcoTech</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  skipButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 10,
    padding: 10,
  },
  skipButtonText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 16,
    fontWeight: '600',
  },
  slide: {
    width: width,
    flex: 1,
    paddingHorizontal: 30,
    paddingTop: 60,
    paddingBottom: 20,
  },
  logoArea: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    width: 120,
    height: 120,
    backgroundColor: 'white',
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  logoEmoji: {
    fontSize: 60,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: 'white',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
  },
  features: {
    flex: 1,
    gap: 16,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    padding: 18,
    borderRadius: 16,
    gap: 16,
  },
  featureText: {
    fontSize: 15,
    fontWeight: '500',
    color: 'white',
    lineHeight: 22,
    flex: 1,
  },
  footer: {
    paddingHorizontal: 30,
    paddingBottom: 30,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    height: 20,
    marginBottom: 24,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    backgroundColor: 'white',
    marginHorizontal: 4,
  },
  button: {
    backgroundColor: 'white',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '600',
  },
  footerText: {
    textAlign: 'center',
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 16,
    fontWeight: '600',
  },
});
