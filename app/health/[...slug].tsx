import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';

export default function HealthCatchAll() {
  const router = useRouter();

  useEffect(() => {
    // Redirige vers la page principale de santé si l'URL ne correspond à aucune route connue
    // Utilise replace pour ne pas empiler l'historique.
    router.replace('/health');
  }, [router]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" />
    </View>
  );
}
