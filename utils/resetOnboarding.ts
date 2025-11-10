import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';

export const resetOnboarding = async () => {
  try {
    await AsyncStorage.removeItem('@onboarding_completed');
    console.log('✅ Onboarding reset successful');
    router.replace('/welcome');
  } catch (error) {
    console.error('❌ Error resetting onboarding:', error);
  }
};
