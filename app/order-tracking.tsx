import React from 'react';
import OrderTracking from '../components/OrderTracking';
import { useLocalSearchParams } from 'expo-router';

export default function OrderTrackingScreen() {
  const { mode } = useLocalSearchParams<{ mode?: 'customer' | 'driver' }>();

  // Passe le mode à l'écran de suivi pour qu'il sache quelles données charger.
  return <OrderTracking mode={mode || 'customer'} />;
}