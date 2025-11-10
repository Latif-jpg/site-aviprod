
import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Icon } from '../../components/Icon'; // Assurez-vous que le chemin est correct

const PaymentCancelScreen = () => {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the subscription or dashboard page after a few seconds
    const timer = setTimeout(() => {
      router.replace('/subscription-plans'); // Ou '/dashboard'
    }, 4000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <View style={styles.container}>
      <Icon name="x-circle" size={60} color="#F44336" />
      <Text style={styles.title}>Paiement Annulé</Text>
      <Text style={styles.text}>Vous avez annulé le processus de paiement.</Text>
      <Text style={styles.text}>Vous allez être redirigé.</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginVertical: 15,
    textAlign: 'center',
  },
  text: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 5,
  },
});

export default PaymentCancelScreen;
