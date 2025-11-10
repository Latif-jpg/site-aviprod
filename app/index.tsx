
import { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { colors } from '../styles/commonStyles';

export default function Index() {
  useEffect(() => {
    checkOnboardingStatus();
  }, []);

  const checkOnboardingStatus = async () => {
    try {
      const onboardingCompleted = await AsyncStorage.getItem('@onboarding_completed');
      
      if (onboardingCompleted) {
        // Onboarding complete, go to auth screen.
        // _layout will then redirect to /dashboard if user is already logged in.
        router.replace('/auth');
      } else {
        // First time user, show onboarding.
        router.replace('/welcome');
      }
    } catch (error) {
      console.error('Error checking onboarding status:', error);
      // Fallback to welcome screen on error.
      router.replace('/welcome');
    }
  };

  // This component should only show a loading indicator while it determines the route.
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#10996E',
  },
});
