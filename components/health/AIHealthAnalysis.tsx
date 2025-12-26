import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, TextInput, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { colors } from '../../styles/commonStyles'; // Correction du chemin
import Icon from '../Icon'; // Correction du chemin
import Button from '../Button'; // Correction du chemin
import { supabase } from '../../config'; // Utiliser le client Supabase consolidé
import { useSubscription } from '../../contexts/SubscriptionContext';
import { router } from 'expo-router';
import { useDataCollector } from '../../src/hooks/useDataCollector';

// Hook personnalisé pour gérer les Avicoins
const useAvicoins = () => {
  const refreshAvicoins = () => {
    // Émettre un événement personnalisé pour rafraîchir les Avicoins
    // Utiliser DeviceEventEmitter pour React Native
    const { DeviceEventEmitter } = require('react-native');
    DeviceEventEmitter.emit('refreshAvicoins');
  };

  return { refreshAvicoins };
};

const COMMON_SYMPTOMS = [
  "Léthargie", "Perte d'appétit", "Diarrhée", "Toux", "Éternuements",
  "Difficulté respiratoire", "Yeux gonflés", "Écoulement yeux/nez",
  "Boiterie", "Baisse de ponte", "Crête pâle", "Plumes ébouriffées"
];

export default function AIHealthAnalysis() {
  const [images, setImages] = useState<string[]>([]);
  const [description, setDescription] = useState('');
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Utiliser le hook d'abonnement pour vérifier les limites
  const { subscription, hasAccess } = useSubscription();
  const { refreshAvicoins } = useAvicoins();
  const { trackAIAnalysis } = useDataCollector();

  const handleImagePick = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission refusée', 'L\'accès à la galerie est nécessaire pour ajouter des photos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({

      allowsMultipleSelection: true,
      quality: 1,
    });

    if (!result.canceled) {
      setImages(prev => [...prev, ...result.assets.map(a => a.uri)]);
    }
  };

  const toggleSymptom = (symptom: string) => {
    setSymptoms(prev =>
      prev.includes(symptom) ? prev.filter(s => s !== symptom) : [...prev, symptom]
    );
  };

  const compressImage = async (uri: string): Promise<string> => {
    // For now, return the original URI
    // Image compression will be implemented when expo-image-manipulator is properly installed
    console.log('Image compression placeholder - URI:', uri);
    return uri;
  };

  const handleAnalysis = async () => {
    if (images.length === 0 && !description && symptoms.length === 0) {
      Alert.alert('Données insuffisantes', 'Veuillez ajouter au moins une photo, une description ou un symptôme.');
      return;
    }

    // Variables pour suivre l'état des vérifications
    let hasUnlimitedAccess = false;
    let usageAllowed = true;

    // Vérifier les limites d'utilisation avant de procéder

    try {
      // Vérifier d'abord si l'utilisateur a un abonnement payant avec analyses illimitées
      hasUnlimitedAccess = subscription?.plan?.features?.ai_analyses_per_month === -1;

      if (!hasUnlimitedAccess) {
        // Vérifier les limites d'utilisation pour les plans freemium/premium
        const { data: usageCheckResult, error: usageError } = await supabase.rpc('check_usage_limit', {
          feature_key: 'ai_analyses_per_month'
        });

        if (usageError) {
          console.error('❌ Error checking usage limit:', usageError);
          Alert.alert('Erreur', 'Impossible de vérifier les limites d\'utilisation. Veuillez réessayer.');
          return;
        }

        usageAllowed = usageCheckResult;

        if (!usageAllowed) {
          // Vérifier si l'utilisateur a des Avicoins pour payer
          const { data: avicoinsData, error: avicoinsError } = await supabase
            .from('user_avicoins')
            .select('balance')
            .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
            .maybeSingle();

          if (avicoinsError) {
            console.error('❌ Error checking avicoins:', avicoinsError);
          }

          const avicoinsBalance = avicoinsData?.balance || 0;
          const aiAnalysisCost = 5; // Coût fixe de 5 Avicoins par analyse IA

          if (avicoinsBalance >= aiAnalysisCost) {
            // Demander confirmation pour utiliser les Avicoins
            Alert.alert(
              'Limite atteinte - Utiliser Avicoins',
              `Vous avez atteint votre limite mensuelle d'analyses IA.\n\nCoût: ${aiAnalysisCost} Avicoins\nSolde actuel: ${avicoinsBalance} Avicoins\n\nConfirmer l'utilisation d'Avicoins pour cette analyse ?`,
              [
                { text: 'Annuler', style: 'cancel' },
                {
                  text: 'Utiliser Avicoins',
                  onPress: () => {
                    // Continuer avec l'analyse en utilisant les Avicoins
                    performAnalysis(supabase, hasUnlimitedAccess, usageAllowed);
                  }
                }
              ]
            );
            return;
          } else {
            // Pas assez d'Avicoins, proposer mise à niveau ou achat
            const currentPlan = subscription?.plan?.name || 'freemium';
            const limit = subscription?.plan?.features?.ai_analyses_per_month || 2;

            Alert.alert(
              'Limite atteinte',
              `Vous avez atteint la limite de ${limit} analyses IA par mois pour le plan ${currentPlan}.\n\nSolde Avicoins insuffisant (${avicoinsBalance} disponibles, ${aiAnalysisCost} requis).\n\nPassez à un plan supérieur ou achetez des Avicoins.`,
              [
                { text: 'Annuler', style: 'cancel' },
                {
                  text: 'Voir les plans',
                  onPress: () => router.push('/subscription-plans')
                },
                {
                  text: 'Acheter Avicoins',
                  onPress: () => router.push('/subscription-plans')
                }
              ]
            );
            return;
          }
        }
      }
    } catch (error: any) {
      Alert.alert('Erreur', 'Impossible de vérifier les limites d\'utilisation. Veuillez réessayer.');
      return;
    }
    // Si on arrive ici, soit accès illimité soit limite non atteinte, on peut lancer l'analyse
    await performAnalysis(supabase, hasUnlimitedAccess, usageAllowed);
  };

  const performAnalysis = async (supabase: any, hasUnlimitedAccess: boolean, usageAllowed: boolean) => {
    const startTime = performance.now(); // Démarrer le chronomètre
    setIsLoading(true);
    setError(null);
    setAnalysisResult(null);

    try {
      setLoadingMessage('Compression des images...');
      const compressedImagesBase64 = await Promise.all(
        images.map(async (uri) => {
          const compressedUri = await compressImage(uri);
          // React Native's fetch doesn't support response.blob(), so we use XMLHttpRequest
          const blob: Blob = await new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.onload = () => resolve(xhr.response);
            xhr.onerror = (e) => reject(new TypeError("Network request failed"));
            xhr.responseType = "blob";
            xhr.open("GET", compressedUri, true);
            xhr.send(null);
          });
          return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        })
      );

      setLoadingMessage('Analyse par l\'IA en cours...');
      const { data, error: functionError } = await supabase.functions.invoke('gemini-health-analysis', {
        body: {
          images: compressedImagesBase64,
          description,
          symptoms,
        },
      });

      if (functionError) throw functionError;
      if (data.error) throw new Error(data.error);

      const duration = performance.now() - startTime;

      // TRACKER L'ANALYSE RÉUSSIE
      trackAIAnalysis(
        'health_diagnosis',
        duration,
        true, // succès
        {
          images_count: images.length,
          symptoms_count: symptoms.length,
          description_length: description.length,
          diagnosis: data.diagnosis,
          confidence: data.confidence,
        }
      );

      // Si l'analyse a réussi et que nous utilisons des Avicoins, déduire le coût
      if (!hasUnlimitedAccess && !usageAllowed) {
        const aiAnalysisCost = 5;
        const { error: transactionError } = await supabase
          .from('avicoins_transactions')
          .insert({
            user_id: (await supabase.auth.getUser()).data.user?.id,
            amount: -aiAnalysisCost,
            transaction_type: 'ai_analysis',
            description: 'Analyse IA de santé animale'
          });

        if (transactionError) {
          console.error('❌ Error deducting avicoins:', transactionError);
          // L'analyse a réussi mais la déduction a échoué - on continue quand même
        } else {
          console.log('✅ Avicoins deducted for AI analysis');
          // Rafraîchir le solde Avicoins sur le dashboard
          refreshAvicoins();
        }
      }

      setAnalysisResult(data);
    } catch (err: any) {
      const duration = performance.now() - startTime;

      // TRACKER L'ANALYSE ÉCHOUÉE
      trackAIAnalysis(
        'health_diagnosis',
        duration,
        false, // échec
        {
          images_count: images.length,
          symptoms_count: symptoms.length,
          description_length: description.length,
          error_message: err.message,
        }
      );

      console.error('❌ AI Analysis Error:', err);
      setError(err.message || 'Une erreur est survenue lors de l\'analyse.');
      Alert.alert('Erreur d\'analyse', err.message || 'Impossible de terminer l\'analyse. Veuillez vérifier votre configuration et réessayer.');
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  };

  const resetForm = () => {
    setImages([]);
    setDescription('');
    setSymptoms([]);
    setAnalysisResult(null);
    setError(null);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>{loadingMessage}</Text>
      </SafeAreaView>
    );
  }

  if (analysisResult) {
    const confidence = analysisResult.confidence || 0;
    let confidenceColor = colors.success;
    if (confidence < 75) confidenceColor = colors.orange;
    if (confidence < 50) confidenceColor = colors.error;

    const getPublicModelName = (model: string) => {
      if (!model) return 'Aviprod IA';
      if (model.toLowerCase().includes('gemini')) {
        return 'Aviprod IA 1';
      }
      if (model.toLowerCase().includes('gpt')) {
        return 'Aviprod IA 2';
      }
      return 'Aviprod IA'; // Fallback for unknown models
    };

    return (
      <SafeAreaView style={styles.container}>
        <ScrollView>
          <Text style={styles.sectionTitle}>Résultats de l'Analyse</Text>
          <View style={styles.resultCard}>
            <Text style={styles.resultLabel}>Diagnostic Probable</Text>
            <Text style={styles.resultDiagnosis}>{analysisResult.diagnosis}</Text>
            <Text style={styles.resultLabel}>Score de Confiance</Text>
            <View style={styles.confidenceContainer}>
              <View style={[styles.confidenceBar, { width: `${confidence}%`, backgroundColor: confidenceColor }]} />
            </View>
            <Text style={[styles.confidenceText, { color: confidenceColor }]}>{confidence}%</Text>
            <Text style={styles.resultLabel}>Modèle d'IA Utilisé</Text>
            <Text style={styles.modelText}>{getPublicModelName(analysisResult.model)}</Text>
          </View>
          <View style={styles.resultCard}>
            <Text style={styles.resultLabel}>Plan de Traitement Suggéré</Text>
            <Text style={styles.resultPlan}>{analysisResult.treatmentPlan}</Text>
          </View>
          <View style={styles.warningCard}>
            <Icon name="alert-triangle" size={24} color={colors.warning} />
            <Text style={styles.warningText}>
              Ce diagnostic est généré par une IA et ne remplace pas l'avis d'un vétérinaire professionnel.
            </Text>
          </View>
          <Button text="Nouvelle Analyse" onPress={resetForm} style={{ marginTop: 20 }} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <Text style={styles.sectionTitle}>Ajouter des Photos</Text>
        <View style={styles.imageContainer}>
          {images.map((uri, index) => (
            <Image key={index} source={{ uri }} style={styles.imagePreview} />
          ))}
          <TouchableOpacity style={styles.imagePicker} onPress={handleImagePick}>
            <Icon name="camera" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Décrire les Symptômes</Text>
        <TextInput
          style={styles.textInput}
          placeholder="Ex: Mes poules ont la diarrhée depuis 2 jours, elles mangent moins..."
          value={description}
          onChangeText={setDescription}
          multiline
        />

        <Text style={styles.sectionTitle}>Symptômes Courants</Text>
        <View style={styles.symptomsContainer}>
          {COMMON_SYMPTOMS.map(symptom => (
            <TouchableOpacity
              key={symptom}
              style={[styles.symptomChip, symptoms.includes(symptom) && styles.symptomChipActive]}
              onPress={() => toggleSymptom(symptom)}
            >
              <Text style={[styles.symptomText, symptoms.includes(symptom) && styles.symptomTextActive]}>{symptom}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Button text="Analyser avec l'IA" onPress={handleAnalysis} style={{ marginTop: 30 }} />
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  imageContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  imagePicker: {
    width: 80,
    height: 80,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.backgroundAlt,
  },
  imagePreview: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: colors.background,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  symptomsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  symptomChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.backgroundAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  symptomChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  symptomText: {
    color: colors.text,
    fontWeight: '500',
  },
  symptomTextActive: {
    color: colors.white,
  },
  resultCard: {
    backgroundColor: colors.backgroundAlt,
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  resultLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  resultDiagnosis: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  resultPlan: {
    fontSize: 16,
    color: colors.text,
    lineHeight: 24,
  },
  confidenceContainer: {
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 4,
    overflow: 'hidden',
    marginVertical: 8,
  },
  confidenceBar: {
    height: '100%',
  },
  confidenceText: {
    fontSize: 16,
    fontWeight: '700',
    alignSelf: 'flex-end',
  },
  modelText: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'right',
    fontStyle: 'italic',
    marginTop: 8,
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.warning + '20',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: colors.warning,
  },
  warningText: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
  },
});