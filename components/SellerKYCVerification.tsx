
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity, Image, ActivityIndicator, Platform, TextInput } from 'react-native';
import { colors } from '../styles/commonStyles';
import Icon from './Icon';
import Button from './Button';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator'; // Importation correcte
import { supabase } from '../config'; // Import supabase directly

interface SellerKYCVerificationProps {
  onVerificationSubmitted: () => void;
  onCancel: () => void;
}

export default function SellerKYCVerification({ onVerificationSubmitted, onCancel }: SellerKYCVerificationProps) {
  const [realPhoto, setRealPhoto] = useState<string | null>(null);
  const [idPhoto, setIdPhoto] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fullName, setFullName] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [location, setLocation] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingType, setProcessingType] = useState<'real' | 'id' | null>(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkExistingVerification();
  }, []);

  const checkExistingVerification = async () => {
    try {
      const supabase = await ensureSupabaseInitialized();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setIsLoading(false);
        return;
      }

      // Pré-remplir les champs si le profil existe
      const { data: profileData } = await supabase.from('profiles').select('full_name, phone, location').eq('user_id', user.id).single();
      if (profileData) {
        setFullName(profileData.full_name || '');
        setWhatsappNumber(profileData.phone || '');
        setLocation(profileData.location || '');
      }

      const { data, error } = await supabase
        .from('seller_verifications')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('❌ Error checking verification:', error);
      }

      if (data) {
        console.log('✅ Found existing verification:', data.verification_status);
        setVerificationStatus(data.verification_status);
      }

      setIsLoading(false);
    } catch (error: any) {
      console.error('❌ Exception in checkExistingVerification:', error);
      setIsLoading(false);
    }
  };

  // Compress and resize image to prevent memory issues
  const compressImage = async (uri: string): Promise<string> => {
    try {
      console.log('🗜️ Starting image compression...');
      console.log('📏 Original URI:', uri);
      
      // First resize to a reasonable size
      const resized = await ImageManipulator.manipulateAsync(
        uri,
        [
          { resize: { width: 800 } } // Smaller size for better memory management
        ],
        {
          compress: 0.7, // 70% quality
          format: ImageManipulator.SaveFormat.JPEG,
        }
      );

      console.log('✅ Image compressed successfully');
      console.log('📏 Compressed URI:', resized.uri);
      return resized.uri;
    } catch (error: any) {
      console.error('⚠️ Error compressing image:', error);
      console.error('Error details:', JSON.stringify(error));
      throw new Error('Échec de la compression de l\'image. Veuillez réessayer avec une image plus petite.');
    }
  };

  const pickImage = async (type: 'real' | 'id') => {
    try {
      console.log(`📸 Starting to pick ${type} image...`);
      setIsProcessing(true);
      setProcessingType(type);

      // Request permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission requise', 'Veuillez autoriser l\'accès à la galerie pour continuer');
        setIsProcessing(false);
        setProcessingType(null);
        return;
      }

      console.log('✅ Permission granted, launching image picker...');

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: type === 'real' ? [1, 1] : [4, 3],
        quality: 0.7, // Lower initial quality to prevent memory issues
        exif: false, // Don't include EXIF data to reduce size
      });

      if (result.canceled) {
        console.log('❌ User canceled image selection');
        setIsProcessing(false);
        setProcessingType(null);
        return;
      }

      if (!result.assets || result.assets.length === 0) {
        console.log('❌ No image selected');
        setIsProcessing(false);
        setProcessingType(null);
        return;
      }

      console.log('📷 Image selected, starting compression...');
      const selectedUri = result.assets[0].uri;
      
      // Compress the image
      const compressedUri = await compressImage(selectedUri);
      
      console.log(`✅ Setting ${type} photo...`);
      if (type === 'real') {
        setRealPhoto(compressedUri);
      } else {
        setIdPhoto(compressedUri);
      }
      
      console.log('✅ Photo processed successfully');
      Alert.alert('Succès', 'Photo ajoutée avec succès');
      
      setIsProcessing(false);
      setProcessingType(null);
    } catch (error: any) {
      console.error('❌ Error in pickImage:', error);
      console.error('Error stack:', error.stack);
      setIsProcessing(false);
      setProcessingType(null);
      Alert.alert(
        'Erreur', 
        error.message || 'Impossible de sélectionner l\'image. Veuillez réessayer avec une image plus petite.'
      );
    }
  };

  const takePhoto = async (type: 'real' | 'id') => {
    try {
      console.log(`📸 Starting to take ${type} photo...`);
      setIsProcessing(true);
      setProcessingType(type);

      // Request permission
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission requise', 'Veuillez autoriser l\'accès à la caméra pour continuer');
        setIsProcessing(false);
        setProcessingType(null);
        return;
      }

      console.log('✅ Camera permission granted, launching camera...');

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: type === 'real' ? [1, 1] : [4, 3],
        quality: 0.7, // Lower initial quality
        exif: false, // Don't include EXIF data
      });

      if (result.canceled) {
        console.log('❌ User canceled photo capture');
        setIsProcessing(false);
        setProcessingType(null);
        return;
      }

      if (!result.assets || result.assets.length === 0) {
        console.log('❌ No photo captured');
        setIsProcessing(false);
        setProcessingType(null);
        return;
      }

      console.log('📷 Photo captured, starting compression...');
      const capturedUri = result.assets[0].uri;
      
      // Compress the image
      const compressedUri = await compressImage(capturedUri);
      
      console.log(`✅ Setting ${type} photo...`);
      if (type === 'real') {
        setRealPhoto(compressedUri);
      } else {
        setIdPhoto(compressedUri);
      }
      
      console.log('✅ Photo processed successfully');
      Alert.alert('Succès', 'Photo ajoutée avec succès');
      
      setIsProcessing(false);
      setProcessingType(null);
    } catch (error: any) {
      console.error('❌ Error in takePhoto:', error);
      console.error('Error stack:', error.stack);
      setIsProcessing(false);
      setProcessingType(null);
      Alert.alert(
        'Erreur', 
        error.message || 'Impossible de prendre la photo. Veuillez réessayer.'
      );
    }
  };

  // Convert blob to ArrayBuffer using FileReader API (React Native compatible)
  const blobToArrayBuffer = (blob: Blob): Promise<ArrayBuffer> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (reader.result instanceof ArrayBuffer) {
          resolve(reader.result);
        } else {
          reject(new Error('Failed to convert blob to ArrayBuffer'));
        }
      };
      reader.onerror = () => {
        reject(new Error('FileReader error'));
      };
      reader.readAsArrayBuffer(blob);
    });
  };

  const uploadPhotoToStorage = async (uri: string, type: 'real' | 'id', userId: string): Promise<string | null> => {
    try {
      const fileExt = 'jpg';
      const timestamp = Date.now();
      const fileName = `${userId}/kyc_${type}_${timestamp}.${fileExt}`;

      // Correction: Create FormData manually for React Native compatibility
      const formData = new FormData();
      formData.append('file', {
        uri: uri,
        name: fileName,
        type: 'image/jpeg',
      } as any);

      console.log('📝 File name:', fileName);
      console.log('📤 Uploading to Supabase Storage...'); // Correction: Point-virgule supprimé

      const { data, error } = await supabase.storage
        .from('kyc-photos')
        // Pass the FormData object directly
        .upload(fileName, formData, {
          upsert: false,
        });

      if (error) {
        console.error('❌ Upload error:', error);
        throw error;
      }

      console.log('✅ Upload successful:', data);

      // Return the path, not the full public URL
      return data.path;
    } catch (error: any) {
      console.error('❌ Exception in uploadPhotoToStorage:', error);
      console.error('Error details:', JSON.stringify(error));
      throw new Error(`Échec du téléchargement de la photo ${type}: ${error.message}`);
    }
  };

  const handleSubmit = async () => {
    if (!agreedToTerms) {
      Alert.alert('Erreur', 'Veuillez accepter les conditions de garantie');
      return;
    }

    if (!fullName.trim()) {
      Alert.alert('Erreur', 'Veuillez saisir votre nom et prénom');
      return;
    }

    if (!whatsappNumber.trim()) {
      Alert.alert('Erreur', 'Veuillez saisir votre numéro WhatsApp');
      return;
    }

    if (!location.trim()) {
      Alert.alert('Erreur', 'Veuillez saisir votre localisation');
      return;
    }

    if (!realPhoto || !idPhoto) {
      Alert.alert('Erreur', 'Veuillez fournir les deux photos requises');
      return;
    }

    setIsSubmitting(true);
    try {
      console.log('📤 Starting KYC submission...');
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        Alert.alert('Erreur', 'Vous devez être connecté');
        setIsSubmitting(false);
        return;
      }

      console.log('👤 User ID:', user.id);

      // Upload photos to Supabase Storage
      console.log('📤 Uploading real photo...');
      const realPhotoUrl = await uploadPhotoToStorage(realPhoto, 'real', user.id);
      
      if (!realPhotoUrl) {
        throw new Error('Échec du téléchargement de la photo réelle');
      }

      console.log('✅ Real photo uploaded:', realPhotoUrl);

      console.log('📤 Uploading ID photo...');
      const idPhotoUrl = await uploadPhotoToStorage(idPhoto, 'id', user.id);
      
      if (!idPhotoUrl) {
        throw new Error('Échec du téléchargement de la photo d\'identité');
      }

      console.log('✅ ID photo uploaded:', idPhotoUrl);

      // Save verification data to database
      const verificationData = {
        user_id: user.id,
        real_photo_url: realPhotoUrl,
        id_photo_url: idPhotoUrl,
        full_name: fullName,
        whatsapp_number: whatsappNumber,
        location: location,
        verification_status: 'pending',
        submitted_at: new Date().toISOString(),
      };

      console.log('💾 Saving to database...');

      const { error } = await supabase
        .from('seller_verifications')
        .upsert(verificationData, {
          onConflict: 'user_id'
        });

      if (error) {
        console.error('❌ Database error:', error);
        throw error;
      }

      console.log('✅ Verification submitted successfully');
      
      // Clear images from memory
      setRealPhoto(null);
      setIdPhoto(null);
      
      Alert.alert(
        'Demande envoyée! ✅',
        'Votre demande de vérification a été envoyée avec succès. Notre équipe va l\'examiner et vous recevrez une notification une fois approuvée.',
        [
          {
            text: 'OK',
            onPress: onVerificationSubmitted,
          }
        ]
      );
    } catch (error: any) {
      console.error('❌ Error submitting verification:', error);
      console.error('Error stack:', error.stack);
      Alert.alert(
        'Erreur', 
        error.message || 'Impossible de soumettre la vérification. Veuillez réessayer.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.orange} />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  if (verificationStatus === 'pending') {
    return (
      <View style={styles.statusContainer}>
        <Icon name="time" size={64} color={colors.warning} />
        <Text style={styles.statusTitle}>Vérification en cours</Text>
        <Text style={styles.statusText}>
          Votre demande de vérification est en cours d&apos;examen par notre équipe. 
          Vous recevrez une notification une fois qu&apos;elle sera approuvée.
        </Text>
        <Button title="Fermer" onPress={onCancel} variant="secondary" />
      </View>
    );
  }

  if (verificationStatus === 'approved') {
    return (
      <View style={styles.statusContainer}>
        <Icon name="checkmark-circle" size={64} color={colors.success} />
        <Text style={styles.statusTitle}>Compte vérifié! ✅</Text>
        <Text style={styles.statusText}>
          Votre compte vendeur a été vérifié. Vous pouvez maintenant vendre sur le marketplace.
        </Text>
        <Button title="Fermer" onPress={onCancel} />
      </View>
    );
  }

  if (verificationStatus === 'rejected') {
    return (
      <View style={styles.statusContainer}>
        <Icon name="close-circle" size={64} color={colors.error} />
        <Text style={styles.statusTitle}>Vérification refusée</Text>
        <Text style={styles.statusText}>
          Votre demande de vérification a été refusée. Veuillez contacter le support pour plus d&apos;informations.
        </Text>
        <Button title="Fermer" onPress={onCancel} variant="secondary" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Icon name="shield-checkmark" size={48} color={colors.orange} />
        <Text style={styles.title}>Vérification Vendeur</Text>
        <Text style={styles.subtitle}>
          Pour vendre sur le marketplace, vous devez être vérifié par notre équipe
        </Text>
      </View>

      {isProcessing && (
        <View style={styles.processingBanner}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.processingText}>
            {processingType === 'real' 
              ? 'Traitement de votre photo...' 
              : 'Traitement de la photo CNI...'}
          </Text>
        </View>
      )}

      <View style={styles.guaranteeSection}>
        <View style={styles.guaranteeHeader}>
          <Icon name="document-text" size={24} color={colors.primary} />
          <Text style={styles.guaranteeTitle}>Garantie Anti-Fraude</Text>
        </View>
        <Text style={styles.guaranteeText}>
          Je certifie sur l&apos;honneur que:
        </Text>
        <View style={styles.guaranteeList}>
          <View style={styles.guaranteeItem}>
            <Icon name="checkmark-circle" size={20} color={colors.success} />
            <Text style={styles.guaranteeItemText}>
              Je ne suis pas un arnaqueur ou un escroc
            </Text>
          </View>
          <View style={styles.guaranteeItem}>
            <Icon name="checkmark-circle" size={20} color={colors.success} />
            <Text style={styles.guaranteeItemText}>
              Les informations que je fournis sont exactes
            </Text>
          </View>
          <View style={styles.guaranteeItem}>
            <Icon name="checkmark-circle" size={20} color={colors.success} />
            <Text style={styles.guaranteeItemText}>
              Je respecterai les règles du marketplace
            </Text>
          </View>
          <View style={styles.guaranteeItem}>
            <Icon name="checkmark-circle" size={20} color={colors.success} />
            <Text style={styles.guaranteeItemText}>
              Je fournirai des produits de qualité
            </Text>
          </View>
        </View>

        <TouchableOpacity 
          style={styles.agreeButton}
          onPress={() => setAgreedToTerms(!agreedToTerms)}
          disabled={isProcessing || isSubmitting}
        >
          <View style={[styles.checkbox, agreedToTerms && styles.checkboxChecked]}>
            {agreedToTerms && <Icon name="checkmark" size={16} color={colors.white} />}
          </View>
          <Text style={styles.agreeText}>
            J&apos;accepte cette garantie et je comprends que toute fraude entraînera la suspension de mon compte
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.kycSection}>
        <Text style={styles.sectionTitle}>Documents KYC Requis</Text>
        <Text style={styles.sectionSubtitle}>
          Veuillez fournir les documents suivants pour vérification
        </Text>

        <View style={styles.inputSection}>
          <Text style={styles.photoLabel}>Nom & Prénom *</Text>
          <TextInput
            style={styles.input}
            placeholder="Votre nom complet"
            value={fullName}
            onChangeText={setFullName}
            editable={!isSubmitting && !isProcessing}
          />
        </View>

        <View style={styles.inputSection}>
          <Text style={styles.photoLabel}>Numéro WhatsApp *</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: 70123456"
            value={whatsappNumber}
            onChangeText={setWhatsappNumber}
            keyboardType="phone-pad"
            editable={!isSubmitting && !isProcessing}
          />
        </View>

        <View style={styles.inputSection}>
          <Text style={styles.photoLabel}>Localisation (Ville / Quartier) *</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: Ouagadougou, Patte d'oie"
            value={location}
            onChangeText={setLocation}
            editable={!isSubmitting && !isProcessing}
          />
        </View>

        <View style={styles.photoSection}>
          <Text style={styles.photoLabel}>1. Photo réelle de vous *</Text>
          <Text style={styles.photoHelper}>
            Une photo claire de votre visage (selfie)
          </Text>
          <View style={styles.photoButtons}>
            <TouchableOpacity 
              style={styles.photoButton}
              onPress={() => takePhoto('real')}
              disabled={isProcessing || isSubmitting}
            >
              <Icon name="camera" size={24} color={isProcessing || isSubmitting ? colors.textSecondary : colors.orange} />
              <Text style={[styles.photoButtonText, (isProcessing || isSubmitting) && styles.photoButtonTextDisabled]}>Prendre</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.photoButton}
              onPress={() => pickImage('real')}
              disabled={isProcessing || isSubmitting}
            >
              <Icon name="images" size={24} color={isProcessing || isSubmitting ? colors.textSecondary : colors.orange} />
              <Text style={[styles.photoButtonText, (isProcessing || isSubmitting) && styles.photoButtonTextDisabled]}>Galerie</Text>
            </TouchableOpacity>
          </View>
          {realPhoto && (
            <View style={styles.photoPreview}>
              <Image source={{ uri: realPhoto }} style={styles.previewImage} />
              <TouchableOpacity 
                style={styles.removeButton}
                onPress={() => setRealPhoto(null)}
                disabled={isProcessing || isSubmitting}
              >
                <Icon name="close-circle" size={24} color={colors.error} />
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.photoSection}>
          <Text style={styles.photoLabel}>2. Photo de votre pièce d&apos;identité (CNI) *</Text>
          <Text style={styles.photoHelper}>
            Carte d&apos;identité nationale, passeport ou permis de conduire
          </Text>
          <View style={styles.photoButtons}>
            <TouchableOpacity 
              style={styles.photoButton}
              onPress={() => takePhoto('id')}
              disabled={isProcessing || isSubmitting}
            >
              <Icon name="camera" size={24} color={isProcessing || isSubmitting ? colors.textSecondary : colors.orange} />
              <Text style={[styles.photoButtonText, (isProcessing || isSubmitting) && styles.photoButtonTextDisabled]}>Prendre</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.photoButton}
              onPress={() => pickImage('id')}
              disabled={isProcessing || isSubmitting}
            >
              <Icon name="images" size={24} color={isProcessing || isSubmitting ? colors.textSecondary : colors.orange} />
              <Text style={[styles.photoButtonText, (isProcessing || isSubmitting) && styles.photoButtonTextDisabled]}>Galerie</Text>
            </TouchableOpacity>
          </View>
          {idPhoto && (
            <View style={styles.photoPreview}>
              <Image source={{ uri: idPhoto }} style={styles.previewImage} />
              <TouchableOpacity 
                style={styles.removeButton}
                onPress={() => setIdPhoto(null)}
                disabled={isProcessing || isSubmitting}
              >
                <Icon name="close-circle" size={24} color={colors.error} />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      <View style={styles.securityNote}>
        <Icon name="lock-closed" size={20} color={colors.primary} />
        <Text style={styles.securityNoteText}>
          Vos documents sont sécurisés et cryptés. Ils ne seront utilisés que pour la vérification 
          et ne seront jamais partagés publiquement.
        </Text>
      </View>

      <View style={styles.buttonContainer}>
        <Button
          title={isSubmitting ? 'Envoi en cours...' : 'Soumettre la vérification'}
          onPress={handleSubmit}
          disabled={isSubmitting || isProcessing || !agreedToTerms || !realPhoto || !idPhoto || !fullName || !whatsappNumber || !location}
          icon={isSubmitting ? undefined : 'send'}
        />
        <Button
          title="Annuler"
          onPress={onCancel}
          variant="secondary"
          disabled={isSubmitting || isProcessing}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  processingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary + '20',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    gap: 12,
  },
  processingText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
  },
  statusContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    gap: 16,
  },
  statusTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  statusText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  guaranteeSection: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  guaranteeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  guaranteeTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  guaranteeText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  guaranteeList: {
    gap: 12,
    marginBottom: 16,
  },
  guaranteeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  guaranteeItemText: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  agreeButton: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 12,
    backgroundColor: colors.background,
    borderRadius: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  agreeText: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  kycSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 20,
  },
  inputSection: {
    marginBottom: 20,
  },
  input: {
    backgroundColor: colors.backgroundAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginTop: 8,
    color: colors.text,
  },
  photoSection: {
    marginBottom: 16,
  },
  photoLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  photoHelper: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  photoButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  photoButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    backgroundColor: colors.backgroundAlt,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.orange,
    borderStyle: 'dashed',
  },
  photoButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.orange,
  },
  photoButtonTextDisabled: {
    color: colors.textSecondary,
  },
  photoPreview: {
    marginTop: 8,
    position: 'relative',
    borderRadius: 8,
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: 150,
    borderRadius: 8,
  },
  removeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: colors.white,
    borderRadius: 12,
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primary + '20',
    padding: 8,
    borderRadius: 6,
    marginBottom: 16,
  },
  securityNoteText: {
    flex: 1,
    fontSize: 12,
    color: colors.text,
    lineHeight: 16,
  },
  buttonContainer: {
    gap: 8,
    marginBottom: 20,
  },
});
