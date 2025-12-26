import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, TextInput, Dimensions, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, commonStyles } from '../styles/commonStyles';
import Icon from './Icon';
import { router } from 'expo-router'; // Importation correcte
import * as ImagePicker from 'expo-image-picker'; // Importation correcte
import * as ImageManipulator from 'expo-image-manipulator'; // Importation correcte
import { supabase, ensureSupabaseInitialized } from '../config'; // Import supabase directly
import { useProfile } from '../contexts/ProfileContext';
import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';

const { width } = Dimensions.get('window');

interface DriverFormData {
  // Step 1: Personal Info
  fullName: string;
  dateOfBirth: string;
  phoneNumber: string;
  email: string;
  profilePhoto: string;

  // Step 2: Identity Verification
  idDocument: string;
  selfieWithId: string;
  fullAddress: string;

  // Step 3: Vehicle Info
  vehicleType: 'bike' | 'motorcycle' | 'car' | '';
  licensePlate: string;
  vehiclePhoto: string;
  insuranceDocument: string;

  // Step 4: Availability & Zones
  deliveryZones: string[];
  selectedProvince: string;
  availability: ('day' | 'night' | '24h')[];
  acceptedDeliveryTypes: ('fragile' | 'living' | 'generic')[];

  // Step 5: Payment Info
  paymentMethod: 'mobile_money' | 'bank' | '';
  paymentAccount: string;
  paymentProof: string;

  // Step 6: Terms
  acceptTerms: boolean;
  acceptVerification: boolean;
}

const DELIVERY_ZONES = [
  { province: 'Centre', cities: ['Ouagadougou', 'Kadiogo', 'Komsilga'] },
  { province: 'Hauts-Bassins', cities: ['Bobo-Dioulasso', 'Houndé', 'Dédougou'] },
  { province: 'Cascades', cities: ['Banfora', 'Sindou', 'Gaoua'] },
  { province: 'Centre-Nord', cities: ['Kaya', 'Kongoussi', 'Bousse'] },
  { province: 'Centre-Ouest', cities: ['Koudougou', 'Réo', 'Léo'] },
  { province: 'Est', cities: ['Fada N\'Gourma', 'Tenkodogo', 'Kantchari'] },
  { province: 'Nord', cities: ['Ouahigouya', 'Titao', 'Yako'] },
  { province: 'Sahel', cities: ['Dori', 'Gorom-Gorom', 'Djibo'] },
  { province: 'Boucle du Mouhoun', cities: ['Dédougou', 'Boromo', 'Nouna'] },
  { province: 'Centre-Sud', cities: ['Manga', 'Ziniaré', 'Pô'] },
  { province: 'Centre-Est', cities: ['Tenkodogo', 'Zorgo', 'Koupéla'] },
  { province: 'Plateau-Central', cities: ['Ziniaré', 'Ouargaye', 'Zorgo'] },
  { province: 'Sud-Ouest', cities: ['Gaoua', 'Diébougou', 'Batié'] }
];

const VEHICLE_TYPES = [
  { value: 'bike', label: 'Vélo', icon: 'bicycle' },
  { value: 'motorcycle', label: 'Moto', icon: 'car-sport' },
  { value: 'car', label: 'Voiture', icon: 'car' }
];

const PAYMENT_METHODS = [
  { value: 'mobile_money', label: 'Mobile Money' },
  { value: 'bank', label: 'Virement Bancaire' }
];

export default function DriverRegistrationForm() {
  const { profile } = useProfile();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<DriverFormData>({
    fullName: '',
    dateOfBirth: '',
    phoneNumber: '',
    email: '',
    profilePhoto: '',
    idDocument: '',
    selfieWithId: '',
    fullAddress: '',
    vehicleType: '',
    licensePlate: '',
    vehiclePhoto: '',
    insuranceDocument: '',
    deliveryZones: [],
    selectedProvince: '',
    availability: [],
    acceptedDeliveryTypes: [],
    paymentMethod: '',
    paymentAccount: '',
    paymentProof: '',
    acceptTerms: false,
    acceptVerification: false
  });

  const updateFormData = (field: keyof DriverFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const compressImage = async (uri: string): Promise<string> => {
    try {
      console.log('🗜️ Starting image compression for driver...');
      const resized = await ImageManipulator.manipulateAsync(
        uri,
        [
          { resize: { width: 800 } } // Resize to a reasonable width
        ],
        {
          compress: 0.7, // 70% quality
          format: ImageManipulator.SaveFormat.JPEG,
        }
      );

      console.log('✅ Driver image compressed successfully:', resized.uri);
      return resized.uri;
    } catch (error: any) {
      console.error('⚠️ Error compressing driver image:', error);
      Alert.alert('Erreur de compression', 'Impossible de compresser l\'image. Veuillez réessayer.');
      throw error;
    }
  };

  const pickImage = async (field: keyof DriverFormData) => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (permissionResult.granted === false) {
        Alert.alert('Permission requise', 'Vous devez autoriser l\'accès à la galerie pour continuer.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({

        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.6, // Reduced quality for better compression
      });

      if (!result.canceled) {
        // Compress the image before storing
        const compressedUri = await compressImage(result.assets[0].uri);
        updateFormData(field, compressedUri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Erreur', 'Impossible de sélectionner l\'image');
    }
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return !!(formData.fullName && formData.dateOfBirth && formData.phoneNumber && formData.email && formData.profilePhoto);
      case 2:
        return !!(formData.idDocument && formData.selfieWithId && formData.fullAddress);
      case 3:
        if (formData.vehicleType === 'bike') return !!formData.vehicleType;
        return !!(formData.vehicleType && formData.licensePlate && formData.vehiclePhoto);
      case 4:
        return !!(formData.selectedProvince && formData.deliveryZones.length > 0 && formData.availability.length > 0 && formData.acceptedDeliveryTypes.length > 0);
      case 5:
        if (formData.paymentMethod === 'mobile_money') {
          return !!(formData.paymentMethod && formData.paymentAccount);
        }
        return !!(formData.paymentMethod && formData.paymentAccount && formData.paymentProof);
      case 6:
        return !!(formData.acceptTerms && formData.acceptVerification);
      default:
        return false;
    }
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 6));
    } else {
      Alert.alert('Champs requis', 'Veuillez remplir tous les champs obligatoires avant de continuer.');
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const submitRegistration = async () => {
    if (!validateStep(6)) {
      Alert.alert('Validation requise', 'Veuillez accepter les conditions et autoriser la vérification.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (!profile) {
        Alert.alert('Erreur', 'Vous devez être connecté');
        return;
      }

      // Upload images to Supabase Storage in deliver_kyc bucket
      const uploadPromises = [];
      const imageFields = ['profilePhoto', 'idDocument', 'selfieWithId', 'vehiclePhoto', 'insuranceDocument', 'paymentProof'];

      for (const field of imageFields) {
        const imageUri = formData[field as keyof DriverFormData];
        if (imageUri && typeof imageUri === 'string') {
          const fileName = `${profile.id}/${field}_${Date.now()}.jpg`;

          uploadPromises.push(
            (async () => {
              try {
                const base64 = await FileSystem.readAsStringAsync(imageUri, { encoding: FileSystem.EncodingType.Base64 });
                const arrayBuffer = decode(base64);

                const { data, error } = await supabase.storage
                  .from('deliver_kyc')
                  .upload(fileName, arrayBuffer, {
                    contentType: 'image/jpeg',
                    upsert: false
                  });

                if (error) {
                  console.error(`Error uploading ${field}:`, error);
                  return { field, url: null };
                }
                return { field, url: data?.path ?? null };
              } catch (err) {
                console.error(`Exception uploading ${field}:`, err);
                return { field, url: null };
              }
            })()
          );
        }
      }

      const uploadResults = await Promise.all(uploadPromises);

      // Create KYC verification record for admin review (same as sellers)
      // Convertir la date de naissance au format ISO de manière sécurisée
      let dateOfBirth = null;
      if (formData.dateOfBirth) {
        const parts = formData.dateOfBirth.split('/');
        if (parts.length === 3) {
          const day = parts[0].padStart(2, '0');
          const month = parts[1].padStart(2, '0');
          const year = parts[2];
          const isoDate = `${year}-${month}-${day}`;
          const d = new Date(isoDate);
          if (!isNaN(d.getTime())) {
            dateOfBirth = isoDate;
          }
        }
      }

      // Create KYC verification record in livreur_verifications
      const { error } = await supabase
        .from('livreur_verifications')
        .insert({
          user_id: profile.id,
          full_name: formData.fullName,
          date_of_birth: dateOfBirth,
          phone_number: formData.phoneNumber,
          email: formData.email,
          profile_photo_url: uploadResults.find(r => r.field === 'profilePhoto')?.url,
          id_document_url: uploadResults.find(r => r.field === 'idDocument')?.url,
          selfie_with_id_url: uploadResults.find(r => r.field === 'selfieWithId')?.url,
          full_address: formData.fullAddress,
          vehicle_type: formData.vehicleType,
          license_plate: formData.licensePlate,
          vehicle_photo_url: uploadResults.find(r => r.field === 'vehiclePhoto')?.url,
          insurance_document_url: uploadResults.find(r => r.field === 'insuranceDocument')?.url,
          delivery_zones: formData.deliveryZones,
          availability: formData.availability,
          accepted_delivery_types: formData.acceptedDeliveryTypes,
          payment_method: formData.paymentMethod,
          payment_account: formData.paymentAccount,
          payment_proof_url: uploadResults.find(r => r.field === 'paymentProof')?.url,
          verification_status: 'pending',
          submitted_at: new Date().toISOString()
        });

      if (error) throw error;

      Alert.alert(
        'Demande envoyée ! ✅',
        'Votre demande d\'inscription en tant que livreur a été soumise. Vous recevrez une notification une fois qu\'elle sera examinée par notre équipe.',
        [
          {
            text: 'OK',
            onPress: () => router.back()
          }
        ]
      );

    } catch (error: any) {
      console.error('Error submitting registration:', error);
      Alert.alert('Erreur', error.message || 'Impossible d\'envoyer la demande');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {Array.from({ length: 6 }, (_, i) => (
        <View key={i} style={styles.stepContainer}>
          <View style={[
            styles.stepCircle,
            currentStep > i + 1 && styles.stepCompleted,
            currentStep === i + 1 && styles.stepActive
          ]}>
            <Text style={[
              styles.stepText,
              (currentStep > i + 1 || currentStep === i + 1) && styles.stepTextActive
            ]}>
              {i + 1}
            </Text>
          </View>
          {i < 5 && <View style={[
            styles.stepLine,
            currentStep > i + 1 && styles.stepLineCompleted
          ]} />}
        </View>
      ))}
    </View>
  );

  const renderStep1 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Informations Personnelles</Text>

      <TouchableOpacity style={styles.imageUpload} onPress={() => pickImage('profilePhoto')}>
        {formData.profilePhoto ? (
          <Image source={{ uri: formData.profilePhoto }} style={styles.uploadedImage} />
        ) : (
          <View style={styles.uploadPlaceholder}>
            <Icon name="camera" size={32} color={colors.primary} />
            <Text style={styles.uploadText}>Photo de profil</Text>
          </View>
        )}
      </TouchableOpacity>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Nom complet *</Text>
        <TextInput
          style={styles.input}
          value={formData.fullName}
          onChangeText={(value) => updateFormData('fullName', value)}
          placeholder="Votre nom complet"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Date de naissance *</Text>
        <TextInput
          style={styles.input}
          value={formData.dateOfBirth}
          onChangeText={(value) => updateFormData('dateOfBirth', value)}
          placeholder="JJ/MM/AAAA"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Numéro de téléphone *</Text>
        <TextInput
          style={styles.input}
          value={formData.phoneNumber}
          onChangeText={(value) => updateFormData('phoneNumber', value)}
          placeholder="+226 XX XX XX XX"
          keyboardType="phone-pad"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Email *</Text>
        <TextInput
          style={styles.input}
          value={formData.email}
          onChangeText={(value) => updateFormData('email', value)}
          placeholder="votre@email.com"
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Vérification d'Identité</Text>

      <TouchableOpacity style={styles.imageUpload} onPress={() => pickImage('idDocument')}>
        {formData.idDocument ? (
          <Image source={{ uri: formData.idDocument }} style={styles.uploadedImage} />
        ) : (
          <View style={styles.uploadPlaceholder}>
            <Icon name="person" size={32} color={colors.primary} />
            <Text style={styles.uploadText}>Carte d'identité / Passeport</Text>
          </View>
        )}
      </TouchableOpacity>

      <TouchableOpacity style={styles.imageUpload} onPress={() => pickImage('selfieWithId')}>
        {formData.selfieWithId ? (
          <Image source={{ uri: formData.selfieWithId }} style={styles.uploadedImage} />
        ) : (
          <View style={styles.uploadPlaceholder}>
            <Icon name="person" size={32} color={colors.primary} />
            <Text style={styles.uploadText}>Photo selfie avec pièce</Text>
          </View>
        )}
      </TouchableOpacity>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Adresse complète *</Text>
        <TextInput
          style={[styles.input, { height: 80 }]}
          value={formData.fullAddress}
          onChangeText={(value) => updateFormData('fullAddress', value)}
          placeholder="Votre adresse complète"
          multiline
          numberOfLines={3}
        />
      </View>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Véhicule / Équipement</Text>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Type de véhicule *</Text>
        <View style={styles.vehicleOptions}>
          {VEHICLE_TYPES.map((vehicle) => (
            <TouchableOpacity
              key={vehicle.value}
              style={[
                styles.vehicleOption,
                formData.vehicleType === vehicle.value && styles.vehicleOptionSelected
              ]}
              onPress={() => updateFormData('vehicleType', vehicle.value)}
            >
              <Icon name={vehicle.icon as any} size={24} color={formData.vehicleType === vehicle.value ? colors.white : colors.primary} />
              <Text style={[
                styles.vehicleOptionText,
                formData.vehicleType === vehicle.value && styles.vehicleOptionTextSelected
              ]}>
                {vehicle.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {formData.vehicleType && formData.vehicleType !== 'bike' && (
        <>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Numéro d'immatriculation *</Text>
            <TextInput
              style={styles.input}
              value={formData.licensePlate}
              onChangeText={(value) => updateFormData('licensePlate', value)}
              placeholder="XX-XXXX-XX"
              autoCapitalize="characters"
            />
          </View>

          <TouchableOpacity style={styles.imageUpload} onPress={() => pickImage('vehiclePhoto')}>
            {formData.vehiclePhoto ? (
              <Image source={{ uri: formData.vehiclePhoto }} style={styles.uploadedImage} />
            ) : (
              <View style={styles.uploadPlaceholder}>
                <Icon name="cart" size={32} color={colors.primary} />
                <Text style={styles.uploadText}>Photo du véhicule</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.imageUpload} onPress={() => pickImage('insuranceDocument')}>
            {formData.insuranceDocument ? (
              <Image source={{ uri: formData.insuranceDocument }} style={styles.uploadedImage} />
            ) : (
              <View style={styles.uploadPlaceholder}>
                <Icon name="shield-checkmark" size={32} color={colors.primary} />
                <Text style={styles.uploadText}>Assurance / Permis (Optionnel)</Text>
              </View>
            )}
          </TouchableOpacity>
        </>
      )}
    </View>
  );

  const renderStep4 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Disponibilité & Zones</Text>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Province *</Text>
        <View style={styles.zonesGrid}>
          {DELIVERY_ZONES.map((zone) => (
            <TouchableOpacity
              key={zone.province}
              style={[
                styles.zoneChip,
                formData.selectedProvince === zone.province && styles.zoneChipSelected
              ]}
              onPress={() => {
                updateFormData('selectedProvince', zone.province);
                updateFormData('deliveryZones', []); // Reset cities when province changes
              }}
            >
              <Text style={[
                styles.zoneChipText,
                formData.selectedProvince === zone.province && styles.zoneChipTextSelected
              ]}>
                {zone.province}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {formData.selectedProvince && (
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Ville(s) de livraison *</Text>
          <View style={styles.zonesGrid}>
            {DELIVERY_ZONES.find(z => z.province === formData.selectedProvince)?.cities.map((city) => (
              <TouchableOpacity
                key={city}
                style={[
                  styles.zoneChip,
                  formData.deliveryZones.includes(city) && styles.zoneChipSelected
                ]}
                onPress={() => {
                  const newZones = formData.deliveryZones.includes(city)
                    ? formData.deliveryZones.filter(z => z !== city)
                    : [...formData.deliveryZones, city];
                  updateFormData('deliveryZones', newZones);
                }}
              >
                <Text style={[
                  styles.zoneChipText,
                  formData.deliveryZones.includes(city) && styles.zoneChipTextSelected
                ]}>
                  {city}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Disponibilité *</Text>
        <View style={styles.availabilityOptions}>
          {[
            { value: 'day', label: 'Journée' },
            { value: 'night', label: 'Nuit' },
            { value: '24h', label: '24h/24' }
          ].map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.availabilityOption,
                formData.availability.includes(option.value as any) && styles.availabilityOptionSelected
              ]}
              onPress={() => {
                const newAvailability = formData.availability.includes(option.value as any)
                  ? formData.availability.filter(a => a !== option.value)
                  : [...formData.availability, option.value as any];
                updateFormData('availability', newAvailability);
              }}
            >
              <Text style={[
                styles.availabilityOptionText,
                formData.availability.includes(option.value as any) && styles.availabilityOptionTextSelected
              ]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Types de livraison acceptés *</Text>
        <View style={styles.deliveryTypesOptions}>
          {[
            { value: 'fragile', label: 'Produits fragiles' },
            { value: 'living', label: 'Animaux vivants' },
            { value: 'generic', label: 'Produits génériques' }
          ].map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.deliveryTypeOption,
                formData.acceptedDeliveryTypes.includes(option.value as any) && styles.deliveryTypeOptionSelected
              ]}
              onPress={() => {
                const newTypes = formData.acceptedDeliveryTypes.includes(option.value as any)
                  ? formData.acceptedDeliveryTypes.filter(t => t !== option.value)
                  : [...formData.acceptedDeliveryTypes, option.value as any];
                updateFormData('acceptedDeliveryTypes', newTypes);
              }}
            >
              <Text style={[
                styles.deliveryTypeOptionText,
                formData.acceptedDeliveryTypes.includes(option.value as any) && styles.deliveryTypeOptionTextSelected
              ]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );

  const renderStep5 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Informations de Paiement</Text>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Méthode de paiement *</Text>
        <View style={styles.paymentOptions}>
          {PAYMENT_METHODS.map((method) => (
            <TouchableOpacity
              key={method.value}
              style={[
                styles.paymentOption,
                formData.paymentMethod === method.value && styles.paymentOptionSelected
              ]}
              onPress={() => updateFormData('paymentMethod', method.value)}
            >
              <Text style={[
                styles.paymentOptionText,
                formData.paymentMethod === method.value && styles.paymentOptionTextSelected
              ]}>
                {method.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>
          {formData.paymentMethod === 'mobile_money' ? 'Numéro Mobile Money *' : 'Numéro de compte bancaire *'}
        </Text>
        <TextInput
          style={styles.input}
          value={formData.paymentAccount}
          onChangeText={(value) => updateFormData('paymentAccount', value)}
          placeholder={formData.paymentMethod === 'mobile_money' ? '+226 XX XX XX XX' : 'Numéro de compte'}
          keyboardType={formData.paymentMethod === 'mobile_money' ? 'phone-pad' : 'default'}
        />
      </View>

      {formData.paymentMethod === 'bank' && (
        <TouchableOpacity style={styles.imageUpload} onPress={() => pickImage('paymentProof')}>
          {formData.paymentProof ? (
            <Image source={{ uri: formData.paymentProof }} style={styles.uploadedImage} />
          ) : (
            <View style={styles.uploadPlaceholder}>
              <Icon name="cash" size={32} color={colors.primary} />
              <Text style={styles.uploadText}>RIB / Justificatif bancaire</Text>
            </View>
          )}
        </TouchableOpacity>
      )}
    </View>
  );

  const renderStep6 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Termes & Confirmation</Text>

      <View style={styles.termsContainer}>
        <TouchableOpacity
          style={styles.checkboxContainer}
          onPress={() => updateFormData('acceptTerms', !formData.acceptTerms)}
        >
          <View style={[styles.checkbox, formData.acceptTerms && styles.checkboxChecked]}>
            {formData.acceptTerms && <Icon name="checkmark" size={16} color={colors.white} />}
          </View>
          <Text style={styles.checkboxText}>
            J'accepte les conditions d'utilisation d'Aviprod
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.checkboxContainer}
          onPress={() => updateFormData('acceptVerification', !formData.acceptVerification)}
        >
          <View style={[styles.checkbox, formData.acceptVerification && styles.checkboxChecked]}>
            {formData.acceptVerification && <Icon name="checkmark" size={16} color={colors.white} />}
          </View>
          <Text style={styles.checkboxText}>
            J'autorise la vérification de mes informations par l'équipe Aviprod
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.summaryContainer}>
        <Text style={styles.summaryTitle}>Récapitulatif de votre demande</Text>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Nom:</Text>
          <Text style={styles.summaryValue}>{formData.fullName}</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Véhicule:</Text>
          <Text style={styles.summaryValue}>
            {VEHICLE_TYPES.find(v => v.value === formData.vehicleType)?.label || 'Non spécifié'}
          </Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Zones:</Text>
          <Text style={styles.summaryValue}>{formData.deliveryZones.join(', ')}</Text>
        </View>
      </View>
    </View>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1: return renderStep1();
      case 2: return renderStep2();
      case 3: return renderStep3();
      case 4: return renderStep4();
      case 5: return renderStep5();
      case 6: return renderStep6();
      default: return null;
    }
  };

  return (
    <SafeAreaView style={commonStyles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Devenir Livreur</Text>
      </View>

      {renderStepIndicator()}

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {renderCurrentStep()}
      </ScrollView>

      <View style={styles.footer}>
        {currentStep > 1 && (
          <TouchableOpacity style={styles.prevButton} onPress={prevStep}>
            <Text style={styles.prevButtonText}>Précédent</Text>
          </TouchableOpacity>
        )}

        {currentStep < 6 ? (
          <TouchableOpacity
            style={[styles.nextButton, !validateStep(currentStep) && styles.buttonDisabled]}
            onPress={nextStep}
            disabled={!validateStep(currentStep)}
          >
            <Text style={styles.nextButtonText}>Suivant</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.submitButton, (!validateStep(6) || isSubmitting) && styles.buttonDisabled]}
            onPress={submitRegistration}
            disabled={!validateStep(6) || isSubmitting}
          >
            <Text style={styles.submitButtonText}>
              {isSubmitting ? 'Envoi en cours...' : 'Valider et Envoyer'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  stepContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCompleted: {
    backgroundColor: colors.success,
  },
  stepActive: {
    backgroundColor: colors.primary,
  },
  stepText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  stepTextActive: {
    color: colors.white,
  },
  stepLine: {
    width: 24,
    height: 2,
    backgroundColor: colors.border,
    marginHorizontal: 4,
  },
  stepLineCompleted: {
    backgroundColor: colors.success,
  },
  scrollView: {
    flex: 1,
  },
  stepContent: {
    padding: 20,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 24,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  imageUpload: {
    alignSelf: 'center',
    marginBottom: 20,
  },
  uploadPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.backgroundAlt,
    borderWidth: 2,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadedImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  uploadText: {
    fontSize: 12,
    color: colors.primary,
    textAlign: 'center',
    marginTop: 8,
  },
  vehicleOptions: {
    flexDirection: 'row',
    gap: 12,
  },
  vehicleOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primary,
    gap: 8,
  },
  vehicleOptionSelected: {
    backgroundColor: colors.primary,
  },
  vehicleOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  vehicleOptionTextSelected: {
    color: colors.white,
  },
  zonesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  zoneChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundAlt,
  },
  zoneChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  zoneChipText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  zoneChipTextSelected: {
    color: colors.white,
  },
  availabilityOptions: {
    flexDirection: 'row',
    gap: 12,
  },
  availabilityOption: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  availabilityOptionSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  availabilityOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  availabilityOptionTextSelected: {
    color: colors.white,
  },
  deliveryTypesOptions: {
    gap: 12,
  },
  deliveryTypeOption: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  deliveryTypeOptionSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  deliveryTypeOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  deliveryTypeOptionTextSelected: {
    color: colors.white,
  },
  paymentOptions: {
    flexDirection: 'row',
    gap: 12,
  },
  paymentOption: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  paymentOptionSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  paymentOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  paymentOptionTextSelected: {
    color: colors.white,
  },
  termsContainer: {
    marginBottom: 24,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
  },
  checkboxText: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  summaryContainer: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 12,
    padding: 16,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
  },
  prevButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  prevButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  nextButton: {
    flex: 2,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
  submitButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: colors.success,
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  provinceOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  provinceOption: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundAlt,
    minWidth: '45%',
  },
  provinceOptionSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  provinceOptionText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  provinceOptionTextSelected: {
    color: colors.white,
  },
});