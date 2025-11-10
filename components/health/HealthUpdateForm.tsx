import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface HealthUpdateFormProps {
  onClose: () => void;
  onUpdate: () => void;
}

export default function HealthUpdateForm({ onClose, onUpdate }: HealthUpdateFormProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Mise à Jour Quotidienne de la Santé</Text>
      <Text>Ce composant est un placeholder. Implémentez ici la logique de mise à jour de la santé.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
});
