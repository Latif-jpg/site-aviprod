import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, TextInput, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';
import { colors } from '../../styles/commonStyles';
import Icon from '../Icon';
import Button from '../Button';
import { supabase } from '../../config';
import { useSubscription } from '../../contexts/SubscriptionContext';
import { router } from 'expo-router';
import { useDataCollector } from '../../src/hooks/useDataCollector';
import { usePremiumFeature } from '../../hooks/usePremiumFeature';
import SmartTunnelModal from '../SmartTunnelModal';

// Hook personnalisé pour gérer les Avicoins (simple refresh)
const useAvicoins = () => {
  const refreshAvicoins = () => {
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

  const { refreshAvicoins } = useAvicoins();
  const { trackAIAnalysis } = useDataCollector();

  // Intégration du Tunnel Malin via le hook premium
  const { requestAccess, showTunnel, tunnelProps, isLoading: accessLoading } = usePremiumFeature({
    featureKey: 'ai_analyses_per_month',
    featureName: 'Analyse de Santé IA',
    cost: 10,
  });

  const handleImagePick = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission refusée', 'L\'accès à la galerie est nécessaire.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsMultipleSelection: true,
      quality: 0.7,
      exif: false,
    });

    if (!result.canceled && result.assets) {
      // 3. Compresser les images sélectionnées (max 800px pour l'IA, c'est suffisant et stable)
      const compressedUris = await Promise.all(
        result.assets.map(async (asset) => {
          const manipulated = await ImageManipulator.manipulateAsync(
            asset.uri,
            [{ resize: { width: 800 } }],
            { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
          );
          return manipulated.uri;
        })
      );
      setImages(prev => [...prev, ...compressedUris]);
    }
  };

  const toggleSymptom = (symptom: string) => {
    setSymptoms(prev =>
      prev.includes(symptom) ? prev.filter(s => s !== symptom) : [...prev, symptom]
    );
  };

  // Suppression du placeholder compressImage car intégré dans handleImagePick

  const handleAnalysis = async () => {
    if (images.length === 0 && !description && symptoms.length === 0) {
      Alert.alert('Données insuffisantes', 'Veuillez ajouter au moins une photo, une description ou un symptôme.');
      return;
    }

    // --- Appel au Tunnel Malin ---
    const access = await requestAccess();
    if (!access.granted) return;

    await performAnalysis();
  };

  const performAnalysis = async () => {
    const startTime = Date.now();
    setIsLoading(true);
    setError(null);
    setAnalysisResult(null);

    try {
      setLoadingMessage('Préparation des images...');
      const compressedImagesBase64 = await Promise.all(
        images.map(async (uri) => {
          return await FileSystem.readAsStringAsync(uri, {
            encoding: FileSystem.EncodingType.Base64,
          });
        })
      );

      setLoadingMessage('Analyse par l\'IA en cours...');
      const { data, error: functionError } = await supabase.functions.invoke('gemini-health-analysis', {
        body: { images: compressedImagesBase64, description, symptoms },
      });

      if (functionError) throw functionError;
      if (data.error) throw new Error(data.error);

      const duration = Date.now() - startTime;
      trackAIAnalysis('health_diagnosis', duration, true, {
        images_count: images.length,
        symptoms_count: symptoms.length,
        diagnosis: data.diagnosis,
      });

      setAnalysisResult(data);
      refreshAvicoins();
    } catch (err: any) {
      console.error('❌ AI Analysis Error:', err);
      setError(err.message || 'Une erreur est survenue.');
      Alert.alert('Erreur', err.message || 'Impossible de terminer l\'analyse.');
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

  if (isLoading || accessLoading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>{loadingMessage || 'Traitement en cours...'}</Text>
      </SafeAreaView>
    );
  }

  if (analysisResult) {
    const confidence = analysisResult.confidence || 0;
    let confidenceColor = colors.success;
    if (confidence < 75) confidenceColor = colors.orange;
    if (confidence < 50) confidenceColor = colors.error;

    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={{ padding: 20 }}>
          <Text style={styles.sectionTitle}>Résultats de l'Analyse</Text>
          <View style={styles.resultCard}>
            <Text style={styles.resultLabel}>Diagnostic Probable</Text>
            <Text style={styles.resultDiagnosis}>{analysisResult.diagnosis}</Text>
            <Text style={styles.resultLabel}>Score de Confiance</Text>
            <View style={styles.confidenceContainer}>
              <View style={[styles.confidenceBar, { width: `${confidence}%`, backgroundColor: confidenceColor }]} />
            </View>
            <Text style={[styles.confidenceText, { color: confidenceColor }]}>{confidence}%</Text>
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
          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
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
          placeholder="Détails sur l'état des animaux..."
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

        <Button text="Analyser avec l'IA (5 🪙)" onPress={handleAnalysis} style={{ marginTop: 30 }} />

        <View style={{ height: 40 }} />

        {/* Modal du Tunnel Malin */}
        <SmartTunnelModal {...tunnelProps} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: 16,
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