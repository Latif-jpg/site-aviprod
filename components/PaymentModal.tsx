import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, commonStyles } from '../styles/commonStyles';
import Icon from './Icon';
import Button from './Button';
import { usePayments } from '../hooks/usePayments';
import * as Linking from 'expo-linking';

interface PaymentModalProps {
  isVisible: boolean;
  onClose: () => void;
  amount: number;
  description: string;
  paymentType: string;
  referenceType: string;
  referenceId: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export default function PaymentModal({
  isVisible,
  onClose,
  amount,
  description,
  paymentType,
  referenceType,
  referenceId,
  onSuccess,
  onError
}: PaymentModalProps) {
  const { paymentMethods, createPayment, isProcessing } = usePayments();
  const [selectedMethod, setSelectedMethod] = useState<string>('');

  useEffect(() => {
    if (paymentMethods.length > 0 && !selectedMethod) {
      setSelectedMethod(paymentMethods[0].code);
    }
  }, [paymentMethods, selectedMethod]);

  const handlePayment = async () => {
    if (!selectedMethod) {
      Alert.alert('Erreur', 'Veuillez sélectionner une méthode de paiement');
      return;
    }

    try {
      const result = await createPayment(
        amount,
        selectedMethod,
        paymentType,
        referenceType,
        referenceId,
        description
      );

      if (result.success && result.payment_url) {
        // Open payment URL in browser
        await Linking.openURL(result.payment_url);

        // Close modal
        onClose();

        // Show success message
        Alert.alert(
          'Paiement initié',
          'Vous allez être redirigé vers la page de paiement PayDunya. Veuillez compléter le paiement.',
          [{ text: 'OK' }]
        );

        // Call success callback if provided
        if (onSuccess) {
          onSuccess();
        }
      } else {
        const errorMessage = result.error || 'Erreur lors de l\'initiation du paiement';
        Alert.alert('Erreur', errorMessage);

        if (onError) {
          onError(errorMessage);
        }
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Erreur inattendue lors du paiement';
      Alert.alert('Erreur', errorMessage);

      if (onError) {
        onError(errorMessage);
      }
    }
  };

  const getPaymentMethodIcon = (code: string) => {
    switch (code) {
      case 'orange_money':
        return 'phone-portrait';
      case 'moov_money':
        return 'phone-portrait';
      case 'card':
        return 'card';
      default:
        return 'cash';
    }
  };

  const getPaymentMethodColor = (code: string) => {
    switch (code) {
      case 'orange_money':
        return colors.warning;
      case 'moov_money':
        return colors.primary;
      case 'card':
        return colors.accent;
      default:
        return colors.textSecondary;
    }
  };

  if (!isVisible) return null;

  return (
    <View style={styles.overlay}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Icon name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Paiement</Text>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.amountSection}>
            <Text style={styles.amountLabel}>Montant à payer</Text>
            <Text style={styles.amount}>{amount.toLocaleString()} CFA</Text>
            <Text style={styles.description}>{description}</Text>
          </View>

          <View style={styles.methodsSection}>
            <Text style={styles.sectionTitle}>Choisissez votre méthode de paiement</Text>

            {paymentMethods.map((method) => (
              <TouchableOpacity
                key={method.code}
                style={[
                  styles.methodCard,
                  selectedMethod === method.code && styles.methodCardSelected
                ]}
                onPress={() => setSelectedMethod(method.code)}
              >
                <View style={styles.methodInfo}>
                  <View style={[
                    styles.methodIcon,
                    { backgroundColor: getPaymentMethodColor(method.code) + '20' }
                  ]}>
                    <Icon
                      name={getPaymentMethodIcon(method.code) as any}
                      size={24}
                      color={getPaymentMethodColor(method.code)}
                    />
                  </View>
                  <View style={styles.methodDetails}>
                    <Text style={styles.methodName}>{method.name}</Text>
                    <Text style={styles.methodProvider}>{method.provider}</Text>
                  </View>
                </View>
                <View style={[
                  styles.radioButton,
                  selectedMethod === method.code && styles.radioButtonSelected
                ]}>
                  {selectedMethod === method.code && (
                    <View style={styles.radioButtonInner} />
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.infoSection}>
            <View style={styles.infoItem}>
              <Icon name="shield-checkmark" size={20} color={colors.success} />
              <Text style={styles.infoText}>Paiement sécurisé via PayDunya</Text>
            </View>
            <View style={styles.infoItem}>
              <Icon name="time" size={20} color={colors.primary} />
              <Text style={styles.infoText}>Traitement instantané</Text>
            </View>
            <View style={styles.infoItem}>
              <Icon name="checkmark-circle" size={20} color={colors.accent} />
              <Text style={styles.infoText}>Confirmation automatique</Text>
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Button
            title={isProcessing ? 'Traitement...' : 'Procéder au paiement'}
            onPress={handlePayment}
            disabled={isProcessing || !selectedMethod}
            style={styles.payButton}
          />
          {isProcessing && (
            <ActivityIndicator size="small" color={colors.primary} style={styles.loading} />
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 1000,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  closeButton: {
    marginRight: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  amountSection: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    alignItems: 'center',
  },
  amountLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  amount: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.primary,
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: colors.text,
    textAlign: 'center',
  },
  methodsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
  },
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundAlt,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  methodCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  methodInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  methodIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  methodDetails: {
    flex: 1,
  },
  methodName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  methodProvider: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioButtonSelected: {
    borderColor: colors.primary,
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  infoSection: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 12,
    padding: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: colors.text,
    marginLeft: 12,
    flex: 1,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  payButton: {
    marginBottom: 0,
  },
  loading: {
    marginTop: 12,
  },
});