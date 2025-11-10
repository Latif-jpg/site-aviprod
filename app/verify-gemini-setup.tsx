
import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../styles/commonStyles';
import Icon from '../components/Icon'; // Importation correcte
import Button from '../components/Button'; // Importation correcte
import { router } from 'expo-router'; // Importation correcte
import { ensureSupabaseInitialized } from '../config'; // Import from config

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingTop: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
  },
  content: {
    padding: 20,
  },
  section: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 12,
  },
  checkText: {
    fontSize: 16,
    color: colors.text,
    flex: 1,
  },
  statusIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoBox: {
    backgroundColor: colors.primary + '20',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  infoText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  errorBox: {
    backgroundColor: colors.error + '20',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  errorText: {
    fontSize: 14,
    color: colors.error,
    lineHeight: 20,
  },
  successBox: {
    backgroundColor: colors.success + '20',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  successText: {
    fontSize: 14,
    color: colors.success,
    lineHeight: 20,
  },
  instructionsBox: {
    backgroundColor: colors.warning + '20',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.warning,
    marginBottom: 8,
  },
  instructionsList: {
    gap: 8,
  },
  instructionItem: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  buttonContainer: {
    gap: 12,
    marginTop: 16,
  },
});

interface CheckResult {
  status: 'pending' | 'success' | 'error' | 'warning';
  message: string;
  details?: string;
}

export default function VerifyGeminiSetupScreen() {
  const [isChecking, setIsChecking] = useState(false);
  const [checks, setChecks] = useState<{
    supabase: CheckResult;
    auth: CheckResult;
    edgeFunction: CheckResult;
    geminiApi: CheckResult;
  }>({
    supabase: { status: 'pending', message: 'En attente...' },
    auth: { status: 'pending', message: 'En attente...' },
    edgeFunction: { status: 'pending', message: 'En attente...' },
    geminiApi: { status: 'pending', message: 'En attente...' },
  });

  const runDiagnostics = async () => {
    setIsChecking(true);
    
    // Reset checks
    setChecks({
      supabase: { status: 'pending', message: 'Vérification...' },
      auth: { status: 'pending', message: 'En attente...' },
      edgeFunction: { status: 'pending', message: 'En attente...' },
      geminiApi: { status: 'pending', message: 'En attente...' },
    });

    try {
      // Check 1: Supabase Connection
      console.log('🔍 Checking Supabase connection...');
      const supabase = await ensureSupabaseInitialized();
      setChecks(prev => ({
        ...prev,
        supabase: { 
          status: 'success', 
          message: 'Connexion Supabase établie',
          details: 'Le client Supabase est initialisé correctement'
        }
      }));

      // Check 2: Authentication
      console.log('🔍 Checking authentication...');
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        setChecks(prev => ({
          ...prev,
          auth: { 
            status: 'error', 
            message: 'Non authentifié',
            details: 'Vous devez être connecté pour tester l\'API Gemini'
          }
        }));
        setIsChecking(false);
        return;
      }

      setChecks(prev => ({
        ...prev,
        auth: { 
          status: 'success', 
          message: 'Utilisateur authentifié',
          details: `User ID: ${user.id.substring(0, 8)}...`
        }
      }));

      // Check 3: Edge Function Availability
      console.log('🔍 Checking Edge Function...');
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setChecks(prev => ({
          ...prev,
          edgeFunction: { 
            status: 'error', 
            message: 'Session invalide',
            details: 'Impossible d\'obtenir le token d\'authentification'
          }
        }));
        setIsChecking(false);
        return;
      }

      setChecks(prev => ({
        ...prev,
        edgeFunction: { 
          status: 'pending', 
          message: 'Test de l\'Edge Function en cours...'
        }
      }));

      // Check 4: Gemini API via Edge Function
      console.log('🔍 Testing Gemini API...');
      const functionUrl = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/gemini-health-analysis`;
      
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          images: [],
          symptoms: ['Test de diagnostic'],
          description: 'Test de configuration de l\'API Gemini',
          lotId: 'test',
        }),
      });

      const responseData = await response.json();
      console.log('📦 Edge Function response:', responseData);

      if (!response.ok) {
        setChecks(prev => ({
          ...prev,
          edgeFunction: { 
            status: 'error', 
            message: 'Edge Function erreur',
            details: `Status ${response.status}: ${responseData.error || 'Erreur inconnue'}`
          },
          geminiApi: { 
            status: 'error', 
            message: 'Test API Gemini échoué',
            details: responseData.error || 'Vérifiez les logs de l\'Edge Function'
          }
        }));
        setIsChecking(false);
        return;
      }

      setChecks(prev => ({
        ...prev,
        edgeFunction: { 
          status: 'success', 
          message: 'Edge Function opérationnelle',
          details: 'La fonction répond correctement'
        },
        geminiApi: { 
          status: 'success', 
          message: 'API Gemini fonctionnelle',
          details: `Diagnostic reçu: ${responseData.diagnosis || 'Test réussi'}`
        }
      }));

      Alert.alert(
        '✅ Configuration Valide!',
        'Tous les tests ont réussi. L\'analyse IA est prête à être utilisée.',
        [{ text: 'OK' }]
      );

    } catch (error: any) {
      console.error('❌ Diagnostic error:', error);
      setChecks(prev => ({
        ...prev,
        edgeFunction: { 
          status: 'error', 
          message: 'Erreur de test',
          details: error.message || 'Erreur inconnue'
        }
      }));
    } finally {
      setIsChecking(false);
    }
  };

  const getStatusIcon = (status: CheckResult['status']) => {
    switch (status) {
      case 'success':
        return <Icon name="checkmark-circle" size={24} color={colors.success} />;
      case 'error':
        return <Icon name="close-circle" size={24} color={colors.error} />;
      case 'warning':
        return <Icon name="warning" size={24} color={colors.warning} />;
      case 'pending':
        return <ActivityIndicator size="small" color={colors.textSecondary} />;
    }
  };

  const getStatusBox = (check: CheckResult) => {
    if (!check.details) return null;

    switch (check.status) {
      case 'success':
        return (
          <View style={styles.successBox}>
            <Text style={styles.successText}>{check.details}</Text>
          </View>
        );
      case 'error':
        return (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{check.details}</Text>
          </View>
        );
      case 'warning':
        return (
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>{check.details}</Text>
          </View>
        );
      default:
        return null;
    }
  };

  const allSuccess = Object.values(checks).every(check => check.status === 'success');
  const hasErrors = Object.values(checks).some(check => check.status === 'error');

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Icon name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Diagnostic Gemini</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.instructionsBox}>
          <Text style={styles.instructionsTitle}>📋 Instructions</Text>
          <View style={styles.instructionsList}>
            <Text style={styles.instructionItem}>
              1. Assurez-vous d&apos;avoir configuré GEMINI_API_KEY dans les secrets Supabase
            </Text>
            <Text style={styles.instructionItem}>
              2. La clé doit commencer par &quot;AIza&quot; (Google AI Studio)
            </Text>
            <Text style={styles.instructionItem}>
              3. Cliquez sur &quot;Lancer le Diagnostic&quot; pour tester
            </Text>
            <Text style={styles.instructionItem}>
              4. Consultez les logs de l&apos;Edge Function en cas d&apos;erreur
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔍 Tests de Configuration</Text>
          
          <View style={styles.checkItem}>
            {getStatusIcon(checks.supabase.status)}
            <Text style={styles.checkText}>Connexion Supabase</Text>
          </View>
          {getStatusBox(checks.supabase)}

          <View style={styles.checkItem}>
            {getStatusIcon(checks.auth.status)}
            <Text style={styles.checkText}>Authentification</Text>
          </View>
          {getStatusBox(checks.auth)}

          <View style={styles.checkItem}>
            {getStatusIcon(checks.edgeFunction.status)}
            <Text style={styles.checkText}>Edge Function</Text>
          </View>
          {getStatusBox(checks.edgeFunction)}

          <View style={styles.checkItem}>
            {getStatusIcon(checks.geminiApi.status)}
            <Text style={styles.checkText}>API Gemini</Text>
          </View>
          {getStatusBox(checks.geminiApi)}
        </View>

        {hasErrors && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🔧 Solutions</Text>
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>
                Pour configurer la clé API Gemini:{'\n\n'}
                1. Allez sur https://aistudio.google.com/app/apikey{'\n'}
                2. Créez une nouvelle clé API{'\n'}
                3. Copiez la clé (commence par AIza...){'\n'}
                4. Dans Supabase Dashboard:{'\n'}
                   - Settings → Edge Functions → Secrets{'\n'}
                   - Ajoutez GEMINI_API_KEY avec votre clé{'\n'}
                5. Attendez 1-2 minutes et réessayez
              </Text>
            </View>
          </View>
        )}

        {allSuccess && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>✅ Configuration Valide</Text>
            <View style={styles.successBox}>
              <Text style={styles.successText}>
                Tous les tests ont réussi! L&apos;analyse IA est prête à être utilisée.
                Vous pouvez maintenant utiliser la fonctionnalité d&apos;analyse de santé.
              </Text>
            </View>
          </View>
        )}

        <View style={styles.buttonContainer}>
          <Button
            text={isChecking ? "Test en cours..." : "🔍 Lancer le Diagnostic"}
            onPress={runDiagnostics}
            disabled={isChecking}
          />
          
          {allSuccess && (
            <Button
              text="🤖 Tester l'Analyse IA"
              onPress={() => router.push('/health')}
              style={{ backgroundColor: colors.success }}
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
