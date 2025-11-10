
import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../styles/commonStyles';
import Icon from '../components/Icon';
import Button from '../components/Button';
import { router } from 'expo-router';

const styles = StyleSheet.create({
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
  backButton: {
    marginRight: 15,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 30,
  },
  quickCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
  },
  quickCardIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  quickCardContent: {
    flex: 1,
  },
  quickCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  quickCardDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 24,
    marginBottom: 16,
  },
  commandCard: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  commandTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6,
  },
  commandText: {
    fontFamily: 'monospace',
    fontSize: 13,
    color: colors.primary,
  },
  tipBox: {
    backgroundColor: colors.success + '20',
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
    borderWidth: 1,
    borderColor: colors.success,
  },
  tipTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.success,
    marginBottom: 8,
  },
  tipText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
});

export default function QuickHelpScreen() {
  const helpTopics = [
    {
      icon: 'wifi-off',
      title: 'Problème de Connexion Ngrok',
      description: 'Le tunnel ngrok ne fonctionne pas',
      route: '/ngrok-help',
      color: colors.error,
    },
    {
      icon: 'checkmark-circle',
      title: 'Vérifier la Connexion',
      description: 'Tester Internet, Supabase et l\'état du projet',
      route: '/connection-check',
      color: colors.primary,
    },
    {
      icon: 'analytics',
      title: 'Diagnostics Complets',
      description: 'Guide d\'utilisation de l\'application',
      route: '/help-support',
      color: colors.primary,
    },
    {
      icon: 'settings',
      title: 'Vérifier Configuration Gemini',
      description: 'Tester l\'API Gemini pour l\'analyse IA',
      route: '/verify-gemini-setup',
      color: colors.success,
    },
  ];

  const commands = [
    {
      title: 'Mode LAN (Recommandé)',
      command: 'npm run dev:lan',
      description: 'Même réseau Wi-Fi requis',
    },
    {
      title: 'Mode Automatique',
      command: 'npm run dev',
      description: 'Détection automatique',
    },
    {
      title: 'Mode Tunnel',
      command: 'npm run dev:tunnel',
      description: 'Utilise ngrok (peut échouer)',
    },
    {
      title: 'Mode Localhost',
      command: 'npm run dev:localhost',
      description: 'Émulateurs uniquement',
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Icon name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Aide Rapide</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Centre d&apos;Aide</Text>
        <Text style={styles.subtitle}>
          Accès rapide aux outils de diagnostic et résolution de problèmes
        </Text>

        <Text style={styles.sectionTitle}>🔧 Outils de Diagnostic</Text>

        {helpTopics.map((topic, index) => (
          <TouchableOpacity
            key={index}
            style={styles.quickCard}
            onPress={() => router.push(topic.route as any)}
          >
            <View style={[styles.quickCardIcon, { backgroundColor: topic.color + '20' }]}>
              <Icon name={topic.icon} size={24} color={topic.color} />
            </View>
            <View style={styles.quickCardContent}>
              <Text style={styles.quickCardTitle}>{topic.title}</Text>
              <Text style={styles.quickCardDescription}>{topic.description}</Text>
            </View>
            <Icon name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        ))}

        <Text style={styles.sectionTitle}>⌨️ Commandes Utiles</Text>

        {commands.map((cmd, index) => (
          <View key={index} style={styles.commandCard}>
            <Text style={styles.commandTitle}>{cmd.title}</Text>
            <Text style={styles.commandText}>{cmd.command}</Text>
            <Text style={[styles.quickCardDescription, { marginTop: 4 }]}>
              {cmd.description}
            </Text>
          </View>
        ))}

        <View style={styles.tipBox}>
          <Text style={styles.tipTitle}>💡 Conseil Pro</Text>
          <Text style={styles.tipText}>
            Pour la plupart des cas, utilisez le mode LAN (npm run dev:lan). 
            C&apos;est plus rapide, plus stable et ne nécessite pas de connexion Internet.
            {'\n\n'}
            Assurez-vous simplement que votre ordinateur et votre téléphone sont sur le même réseau Wi-Fi.
          </Text>
        </View>

        <View style={styles.tipBox}>
          <Text style={styles.tipTitle}>🚨 En Cas de Problème</Text>
          <Text style={styles.tipText}>
            1. Arrêtez le serveur (Ctrl+C)
            {'\n'}
            2. Redémarrez avec: npm run dev:lan
            {'\n'}
            3. Scannez le nouveau QR code
            {'\n'}
            4. Si le problème persiste, consultez l&apos;aide Ngrok
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
