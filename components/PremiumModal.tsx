import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, commonStyles } from '../styles/commonStyles';
import Icon from './Icon';
import Button from './Button';
import { router } from 'expo-router';

interface PremiumModalProps {
  isVisible: boolean;
  onClose: () => void;
  featureName: string;
}

export default function PremiumModal({ isVisible, onClose, featureName }: PremiumModalProps) {
  const handleUpgrade = () => {
    onClose();
    router.push('/subscriptions');
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={isVisible}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <SafeAreaView style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Icon name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
          <View style={styles.content}>
            <View style={styles.iconContainer}>
              <Icon name="star" size={48} color={colors.primary} />
            </View>
            <Text style={styles.title}>Fonctionnalité Premium</Text>
            <Text style={styles.subtitle}>
              La fonctionnalité "{featureName}" est réservée aux abonnés Premium et Pro.
            </Text>
            <Text style={styles.description}>
              Passez à un plan supérieur pour débloquer cette fonctionnalité ainsi que de nombreux autres avantages pour optimiser votre élevage.
            </Text>
            <Button
              title="Voir les abonnements"
              onPress={handleUpgrade}
              style={styles.upgradeButton}
            />
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: '90%',
    backgroundColor: colors.background,
    borderRadius: 16,
    padding: 20,
  },
  header: {
    alignItems: 'flex-end',
  },
  closeButton: {
    padding: 8,
  },
  content: {
    alignItems: 'center',
  },
  iconContainer: {
    backgroundColor: colors.primary + '20',
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  upgradeButton: {
    width: '100%',
  },
});