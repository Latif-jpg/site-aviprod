import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

export default function GlobalCatchAll() {
  const router = useRouter();

  useEffect(() => {
    // Remplace toute route non trouvée par la racine de l'app.
    const t = setTimeout(() => router.replace('/'), 600);
    return () => clearTimeout(t);
  }, [router]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" />
      <Text style={styles.text}>Route introuvable — redirection...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  text: { marginTop: 12, color: '#666' },
});
