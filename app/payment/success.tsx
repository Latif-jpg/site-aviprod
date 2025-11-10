
import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSubscription } from '../../contexts/SubscriptionContext';
import { Icon } from '../../components/Icon'; // Assurez-vous que le chemin est correct

const PaymentSuccessScreen = () => {
  const { payment_id } = useLocalSearchParams();
  const router = useRouter();
  const { refreshSubscription } = useSubscription();
  const [status, setStatus] = useState('loading'); // loading, success, error

  useEffect(() => {
    const handlePaymentSuccess = async () => {
      try {
        console.log('Payment success screen, refreshing subscription for payment_id:', payment_id);
        await refreshSubscription();
        setStatus('success');

        // Redirect after a short delay
        setTimeout(() => {
          router.replace('/dashboard');
        }, 3000);
      } catch (error) {
        console.error('Error refreshing subscription after payment:', error);
        setStatus('error');
      }
    };

    handlePaymentSuccess();
  }, [payment_id, refreshSubscription, router]);

  return (
    <View style={styles.container}>
      {status === 'loading' && (
        <>
          <ActivityIndicator size="large" color="#2196F3" />
          <Text style={styles.text}>Validation de votre paiement...</Text>
        </>
      )}
      {status === 'success' && (
        <>
          <Icon name="check-circle" size={60} color="#4CAF50" />
          <Text style={styles.title}>Paiement Réussi!</Text>
          <Text style={styles.text}>Votre abonnement a été activé.</Text>
          <Text style={styles.text}>Vous allez être redirigé vers le tableau de bord.</Text>
        </>
      )}
      {status === 'error' && (
        <>
          <Icon name="x-circle" size={60} color="#F44336" />
          <Text style={styles.title}>Erreur de Paiement</Text>
          <Text style={styles.text}>Nous n'avons pas pu vérifier votre paiement.</Text>
          <Text style={styles.text}>Veuillez contacter le support si le problème persiste.</Text>
        </>
      )}
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

export default PaymentSuccessScreen;
