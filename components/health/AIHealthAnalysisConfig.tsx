
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { colors } from '../../styles/commonStyles';
import Icon from '../Icon';
import Button from '../Button';
import { router } from 'expo-router';

interface AIHealthAnalysisConfigProps {
  onClose: () => void;
}

export default function AIHealthAnalysisConfig({ onClose }: AIHealthAnalysisConfigProps) {
  const handleGoToSettings = () => {
    onClose();
    router.push('/settings');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Icon name="close" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Configuration Requise</Text>
        <View style={styles.headerRight} />
      </View>

      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Icon name="settings" size={64} color={colors.accentSecondary} />
        </View>

        <Text style={styles.mainTitle}>Configuration de l&apos;API Gemini</Text>
        <Text style={styles.description}>
          Pour utiliser l&apos;analyse IA de santé, vous devez d&apos;abord configurer votre clé API Google Gemini.
        </Text>

        <View style={styles.benefitsContainer}>
          <Text style={styles.benefitsTitle}>Avec l&apos;analyse IA, vous pouvez:</Text>
          
          <View style={styles.benefitItem}>
            <Icon name="checkmark-circle" size={24} color={colors.success} />
            <Text style={styles.benefitText}>
              Analyser les photos de vos volailles
            </Text>
          </View>

          <View style={styles.benefitItem}>
            <Icon name="checkmark-circle" size={24} color={colors.success} />
            <Text style={styles.benefitText}>
              Obtenir un diagnostic automatique
            </Text>
          </View>

          <View style={styles.benefitItem}>
            <Icon name="checkmark-circle" size={24} color={colors.success} />
            <Text style={styles.benefitText}>
              Recevoir des recommandations de traitement
            </Text>
          </View>

          <View style={styles.benefitItem}>
            <Icon name="checkmark-circle" size={24} color={colors.success} />
            <Text style={styles.benefitText}>
              Accéder à des produits recommandés
            </Text>
          </View>
        </View>

        <Button
          text="Configurer maintenant"
          onPress={handleGoToSettings}
          style={styles.configButton}
        />

        <TouchableOpacity onPress={onClose} style={styles.laterButton}>
          <Text style={styles.laterButtonText}>Plus tard</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  closeButton: {
    padding: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  headerRight: {
    width: 32,
  },
  content: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.accentSecondary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  benefitsContainer: {
    width: '100%',
    backgroundColor: colors.backgroundAlt,
    borderRadius: 16,
    padding: 20,
    marginBottom: 32,
  },
  benefitsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  benefitText: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  configButton: {
    width: '100%',
    backgroundColor: colors.accentSecondary,
  },
  laterButton: {
    paddingVertical: 12,
    marginTop: 12,
  },
  laterButtonText: {
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: '500',
  },
});
