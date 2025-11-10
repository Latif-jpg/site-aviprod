
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, commonStyles } from '../styles/commonStyles';
import Icon from '../components/Icon';
import { supabase } from './integrations/supabase/client';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';

interface CheckResult {
  name: string;
  status: 'pending' | 'success' | 'error' | 'warning';
  message: string;
}

export default function VerifySetupScreen() {
  const [checks, setChecks] = useState<CheckResult[]>([]);
  const [loading, setLoading] = useState(false);

  const updateCheck = (name: string, status: CheckResult['status'], message: string) => {
    setChecks(prev => {
      const existing = prev.find(c => c.name === name);
      if (existing) {
        return prev.map(c => c.name === name ? { name, status, message } : c);
      }
      return [...prev, { name, status, message }];
    });
  };

  const runChecks = useCallback(async () => {
    setLoading(true);
    setChecks([]);

    // Check 1: Supabase Connection
    updateCheck('Supabase', 'pending', 'Vérification de la connexion...');
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        updateCheck('Supabase', 'error', `Erreur: ${error.message}`);
      } else {
        updateCheck('Supabase', 'success', 'Connexion établie');
      }
    } catch (error: any) {
      updateCheck('Supabase', 'error', `Exception: ${error.message}`);
    }

    // Check 2: Profiles Table
    updateCheck('Table profiles', 'pending', 'Vérification...');
    try {
      const { error } = await supabase.from('profiles').select('id').limit(1);
      if (error) {
        if (error.message.includes('relation "public.profiles" does not exist')) {
          updateCheck('Table profiles', 'error', 'Table non créée - Voir SETUP_INSTRUCTIONS.md');
        } else {
          updateCheck('Table profiles', 'warning', `Avertissement: ${error.message}`);
        }
      } else {
        updateCheck('Table profiles', 'success', 'Table accessible');
      }
    } catch (error: any) {
      updateCheck('Table profiles', 'error', `Exception: ${error.message}`);
    }

    // Check 3: User Settings Table
    updateCheck('Table user_settings', 'pending', 'Vérification...');
    try {
      const { error } = await supabase.from('user_settings').select('id').limit(1);
      if (error) {
        if (error.message.includes('relation "public.user_settings" does not exist')) {
          updateCheck('Table user_settings', 'error', 'Table non créée - Voir SETUP_INSTRUCTIONS.md');
        } else {
          updateCheck('Table user_settings', 'warning', `Avertissement: ${error.message}`);
        }
      } else {
        updateCheck('Table user_settings', 'success', 'Table accessible');
      }
    } catch (error: any) {
      updateCheck('Table user_settings', 'error', `Exception: ${error.message}`);
    }

    // Check 4: Camera Permission
    updateCheck('Permission Caméra', 'pending', 'Vérification...');
    try {
      const { status } = await ImagePicker.getCameraPermissionsAsync();
      if (status === 'granted') {
        updateCheck('Permission Caméra', 'success', 'Permission accordée');
      } else {
        updateCheck('Permission Caméra', 'warning', 'Permission non accordée - Sera demandée lors de l\'utilisation');
      }
    } catch (error: any) {
      updateCheck('Permission Caméra', 'error', `Exception: ${error.message}`);
    }

    // Check 5: Gallery Permission
    updateCheck('Permission Galerie', 'pending', 'Vérification...');
    try {
      const { status } = await ImagePicker.getMediaLibraryPermissionsAsync();
      if (status === 'granted') {
        updateCheck('Permission Galerie', 'success', 'Permission accordée');
      } else {
        updateCheck('Permission Galerie', 'warning', 'Permission non accordée - Sera demandée lors de l\'utilisation');
      }
    } catch (error: any) {
      updateCheck('Permission Galerie', 'error', `Exception: ${error.message}`);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    runChecks();
  }, [runChecks]);

  const getStatusIcon = (status: CheckResult['status']) => {
    switch (status) {
      case 'success': return 'checkmark-circle';
      case 'error': return 'close-circle';
      case 'warning': return 'warning';
      case 'pending': return 'time';
    }
  };

  const getStatusColor = (status: CheckResult['status']) => {
    switch (status) {
      case 'success': return colors.success;
      case 'error': return colors.error;
      case 'warning': return colors.warning;
      case 'pending': return colors.textSecondary;
    }
  };

  const allSuccess = checks.length > 0 && checks.every(c => c.status === 'success');
  const hasErrors = checks.some(c => c.status === 'error');

  return (
    <SafeAreaView style={commonStyles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Vérification de Configuration</Text>
        <TouchableOpacity onPress={runChecks} style={styles.refreshButton} disabled={loading}>
          <Icon name="refresh" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {loading && checks.length === 0 && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Vérification en cours...</Text>
          </View>
        )}

        {checks.map((check, index) => (
          <View key={index} style={styles.checkCard}>
            <Icon 
              name={getStatusIcon(check.status)} 
              size={32} 
              color={getStatusColor(check.status)} 
            />
            <View style={styles.checkContent}>
              <Text style={styles.checkName}>{check.name}</Text>
              <Text style={[styles.checkMessage, { color: getStatusColor(check.status) }]}>
                {check.message}
              </Text>
            </View>
          </View>
        ))}

        {checks.length > 0 && (
          <View style={styles.summaryCard}>
            {allSuccess && (
              <>
                <Icon name="checkmark-circle" size={48} color={colors.success} />
                <Text style={styles.summaryTitle}>✅ Configuration Complète!</Text>
                <Text style={styles.summaryText}>
                  Toutes les vérifications sont passées. Votre application est prête à être utilisée.
                </Text>
              </>
            )}
            
            {hasErrors && (
              <>
                <Icon name="warning" size={48} color={colors.error} />
                <Text style={styles.summaryTitle}>⚠️ Configuration Incomplète</Text>
                <Text style={styles.summaryText}>
                  Certaines vérifications ont échoué. Consultez SETUP_INSTRUCTIONS.md pour résoudre les problèmes.
                </Text>
              </>
            )}

            {!allSuccess && !hasErrors && (
              <>
                <Icon name="information-circle" size={48} color={colors.warning} />
                <Text style={styles.summaryTitle}>⚠️ Avertissements</Text>
                <Text style={styles.summaryText}>
                  La configuration de base fonctionne, mais certaines fonctionnalités peuvent nécessiter une configuration supplémentaire.
                </Text>
              </>
            )}
          </View>
        )}

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>📚 Documentation</Text>
          <Text style={styles.infoText}>
            Pour plus d&apos;informations sur la configuration, consultez:
          </Text>
          <Text style={styles.infoText}>• SETUP_INSTRUCTIONS.md</Text>
          <Text style={styles.infoText}>• IMPLEMENTATION_NOTES.md</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
    textAlign: 'center',
  },
  refreshButton: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  checkCard: {
    flexDirection: 'row',
    backgroundColor: colors.backgroundAlt,
    margin: 20,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    gap: 16,
    alignItems: 'center',
  },
  checkContent: {
    flex: 1,
  },
  checkName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  checkMessage: {
    fontSize: 14,
    lineHeight: 20,
  },
  summaryCard: {
    backgroundColor: colors.backgroundAlt,
    margin: 20,
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    gap: 12,
  },
  summaryTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  summaryText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  infoCard: {
    backgroundColor: colors.primary + '20',
    margin: 20,
    marginTop: 0,
    padding: 20,
    borderRadius: 12,
    gap: 8,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
});
