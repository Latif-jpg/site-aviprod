
import { colors, commonStyles } from '../styles/commonStyles';
import React, { useState, useEffect } from 'react';
import Button from '../components/Button';
import Icon from '../components/Icon';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getSupabaseClient } from './integrations/supabase/client';
import { router } from 'expo-router';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, ScrollView, Alert } from 'react-native';

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
  statusCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  statusLabel: {
    fontSize: 16,
    color: colors.text,
    flex: 1,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 14,
    marginLeft: 8,
    fontWeight: '600',
  },
  statusSuccess: {
    color: colors.success,
  },
  statusError: {
    color: colors.error,
  },
  statusWarning: {
    color: colors.warning,
  },
  detailsBox: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 12,
    marginTop: 10,
  },
  detailsText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  buttonContainer: {
    marginTop: 20,
  },
  helpButton: {
    marginTop: 10,
  },
  summaryCard: {
    backgroundColor: colors.primary + '20',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 10,
  },
  summaryText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  errorCard: {
    backgroundColor: colors.error + '20',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.error,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.error,
    marginBottom: 10,
  },
  errorText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
});

export default function ConnectionCheckScreen() {
  const [checking, setChecking] = useState(true);
  const [supabaseStatus, setSupabaseStatus] = useState<'checking' | 'success' | 'error'>('checking');
  const [supabaseDetails, setSupabaseDetails] = useState('');
  const [internetStatus, setInternetStatus] = useState<'checking' | 'success' | 'error'>('checking');
  const [internetDetails, setInternetDetails] = useState('');
  const [projectStatus, setProjectStatus] = useState<'checking' | 'success' | 'error' | 'warning'>('checking');
  const [projectDetails, setProjectDetails] = useState('');

  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    setChecking(true);
    setSupabaseStatus('checking');
    setInternetStatus('checking');
    setProjectStatus('checking');

    // Check internet connectivity
    try {
      const response = await fetch('https://www.google.com', { method: 'HEAD' });
      if (response.ok) {
        setInternetStatus('success');
        setInternetDetails('Connexion Internet active');
      } else {
        setInternetStatus('error');
        setInternetDetails('Impossible de se connecter à Internet');
      }
    } catch (error) {
      setInternetStatus('error');
      setInternetDetails(`Erreur: ${error instanceof Error ? error.message : 'Connexion Internet échouée'}`);
      console.log('Internet check error:', error);
    }

    // Check Supabase connection
    try {
      const supabase = await getSupabaseClient();
      
      if (!supabase) {
        setSupabaseStatus('error');
        setSupabaseDetails('Client Supabase non initialisé');
      } else {
        const { data, error } = await supabase.from('profiles').select('count').limit(1);
        
        if (error) {
          if (error.message.includes('paused')) {
            setSupabaseStatus('error');
            setSupabaseDetails('⚠️ PROJET EN PAUSE\n\nLe projet est actuellement en pause pour maintenance. Veuillez réessayer plus tard ou contacter le support technique.');
          } else if (error.message.includes('relation') && error.message.includes('does not exist')) {
            setSupabaseStatus('error');
            setSupabaseDetails('Base de données non configurée. Veuillez contacter le support technique.');
          } else {
            setSupabaseStatus('error');
            setSupabaseDetails(`Erreur Supabase: ${error.message}`);
          }
        } else {
          setSupabaseStatus('success');
          setSupabaseDetails('Connexion Supabase réussie');
        }
      }
    } catch (error) {
      setSupabaseStatus('error');
      setSupabaseDetails(`Erreur: ${error instanceof Error ? error.message : 'Connexion Supabase échouée'}`);
      console.log('Supabase check error:', error);
    }

    // Check project status
    try {
      const supabase = await getSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setProjectStatus('success');
        setProjectDetails(`Utilisateur connecté: ${user.email}`);
      } else {
        setProjectStatus('warning');
        setProjectDetails('Aucun utilisateur connecté. Veuillez vous connecter.');
      }
    } catch (error) {
      setProjectStatus('error');
      setProjectDetails(`Erreur: ${error instanceof Error ? error.message : 'Vérification utilisateur échouée'}`);
      console.log('Project check error:', error);
    }

    setChecking(false);
  };

  const renderStatusItem = (
    label: string,
    status: 'checking' | 'success' | 'error' | 'warning',
    details: string
  ) => {
    let icon = 'clock';
    let iconColor = colors.textSecondary;
    let statusTextStyle = {};

    if (status === 'success') {
      icon = 'check-circle';
      iconColor = colors.success;
      statusTextStyle = styles.statusSuccess;
    } else if (status === 'error') {
      icon = 'x-circle';
      iconColor = colors.error;
      statusTextStyle = styles.statusError;
    } else if (status === 'warning') {
      icon = 'alert-circle';
      iconColor = colors.warning;
      statusTextStyle = styles.statusWarning;
    }

    return (
      <View style={styles.statusCard}>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>{label}</Text>
          <View style={styles.statusIndicator}>
            {status === 'checking' ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Icon name={icon} size={24} color={iconColor} />
            )}
            <Text style={[styles.statusText, statusTextStyle]}>
              {status === 'checking' ? 'Vérification...' : 
               status === 'success' ? 'OK' : 
               status === 'warning' ? 'Attention' : 'Erreur'}
            </Text>
          </View>
        </View>
        {details && (
          <View style={styles.detailsBox}>
            <Text style={styles.detailsText}>{details}</Text>
          </View>
        )}
      </View>
    );
  };

  const getOverallStatus = () => {
    if (checking) return 'checking';
    if (supabaseStatus === 'error' || internetStatus === 'error' || projectStatus === 'error') {
      return 'error';
    }
    if (supabaseStatus === 'warning' || projectStatus === 'warning') {
      return 'warning';
    }
    return 'success';
  };

  const overallStatus = getOverallStatus();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Icon name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Vérification de Connexion</Text>
      </View>

      <ScrollView style={styles.content}>
        <Text style={styles.title}>État de la Connexion</Text>
        <Text style={styles.subtitle}>
          Vérification des connexions réseau et services
        </Text>

        {!checking && overallStatus === 'error' && (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>⚠️ Problèmes Détectés</Text>
            <Text style={styles.errorText}>
              Des problèmes de connexion ont été détectés. Veuillez consulter les détails ci-dessous et suivre les recommandations.
            </Text>
          </View>
        )}

        {!checking && overallStatus === 'success' && (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>✅ Tout Fonctionne</Text>
            <Text style={styles.summaryText}>
              Toutes les connexions sont opérationnelles. Votre application devrait fonctionner correctement.
            </Text>
          </View>
        )}

        {!checking && overallStatus === 'warning' && (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>⚠️ Attention</Text>
            <Text style={styles.errorText}>
              Certains éléments nécessitent votre attention. L&apos;application peut fonctionner avec des limitations.
            </Text>
          </View>
        )}

        {renderStatusItem('Connexion Internet', internetStatus, internetDetails)}
        {renderStatusItem('Connexion Base de Données', supabaseStatus, supabaseDetails)}
        {renderStatusItem('État du Projet', projectStatus, projectDetails)}

        <View style={styles.buttonContainer}>
          <Button
            title={checking ? 'Vérification...' : 'Revérifier'}
            onPress={checkConnection}
            disabled={checking}
            variant="primary"
          />
        </View>

        {supabaseStatus === 'error' && supabaseDetails.includes('PAUSE') && (
          <View style={styles.buttonContainer}>
            <Button
              title="Contacter le Support"
              onPress={() => {
                Alert.alert(
                  'Support Technique',
                  'Le projet est en maintenance. Veuillez contacter le support technique pour plus d\'informations.',
                  [{ text: 'OK' }]
                );
              }}
              variant="secondary"
            />
          </View>
        )}

        <View style={styles.helpButton}>
          <Button
            title="Aide pour Erreur Ngrok"
            onPress={() => router.push('/ngrok-help')}
            variant="secondary"
          />
        </View>

        <View style={styles.helpButton}>
          <Button
            title="Continuer"
            onPress={() => router.push('/')}
            variant="secondary"
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
