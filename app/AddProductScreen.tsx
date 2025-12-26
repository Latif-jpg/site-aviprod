import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import SellerKYCVerification from '../components/SellerKYCVerification';
import { supabase } from '../config';
import { colors, commonStyles } from '../styles/commonStyles';
import Icon from '../components/Icon';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
import { COUNTRIES } from '../data/locations'; // Importer les pays
import SimpleBottomSheet from '../components/BottomSheet';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import { containsContactInfo } from '../utils/validators';

interface AddProductScreenProps {
  onProductAdded?: () => void;
  onCancel?: () => void;
}

const AddProductScreen: React.FC<AddProductScreenProps> = ({ onProductAdded, onCancel }) => {
  const [verificationStatus, setVerificationStatus] = useState<string | null>(null);
  const [isKYCVisible, setIsKYCVisible] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('');
  const [selectedImages, setSelectedImages] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [logoImage, setLogoImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [uploading, setUploading] = useState(false);
  const [country, setCountry] = useState('');
  const [city, setCity] = useState('');
  const [region, setRegion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);
  const [isCountryPickerVisible, setIsCountryPickerVisible] = useState(false);
  const [availableRegions, setAvailableRegions] = useState<{ id: string, name: string }[]>([]);

  // New states for Boost and Promotion
  const [isSponsored, setIsSponsored] = useState(false);
  const [sponsorPeriod, setSponsorPeriod] = useState<number | null>(null);
  const [isOnSale, setIsOnSale] = useState(false);
  const [discountPercentage, setDiscountPercentage] = useState('');
  const [avicoinBalance, setAvicoinBalance] = useState(0);

  const categories = ['Alimentation', 'Médicaments', 'Équipement', 'Volailles'];


  useEffect(() => {
    checkVerification();
    loadAvicoinBalance();
    loadProfileData();
  }, []);

  const loadProfileData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('country, location')
        .eq('user_id', user.id)
        .single();

      if (data) {
        if (data.country) setCountry(data.country);
        // Tenter d'extraire la région depuis location si possible
        if (data.location) {
          const parts = data.location.split(',').map((s: string) => s.trim());
          // Si format "Ville, Région, Pays"
          if (parts.length >= 2 && parts[1] !== data.country) {
            setRegion(parts[1]);
          }
          if (parts.length >= 1) setCity(parts[0]);
        }
      }
    } catch (error) {
      console.error('Erreur chargement profil:', error);
    }
  };

  const loadAvicoinBalance = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('user_avicoins')
        .select('balance')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading avicoin balance:', error);
        return;
      }

      if (data) {
        setAvicoinBalance(data.balance);
      }
    } catch (error) {
      console.error('Exception loading avicoin balance:', error);
    }
  };

  const checkVerification = async () => {
    try {
      setIsCheckingStatus(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('seller_verifications')
        .select('verification_status')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      const status = data?.verification_status || null;
      setVerificationStatus(status);

      if (status !== 'approved') {
        handleVerificationStatus(status);
      }
    } catch (error) {
      console.error("Error checking seller verification:", error);
      Alert.alert("Erreur", "Impossible de vérifier votre statut de vendeur.");
      onCancel ? onCancel() : router.back();
    } finally {
      setIsCheckingStatus(false);
    }
  };


  const handleVerificationStatus = (status: string | null) => {
    if (status === 'pending') {
      Alert.alert(
        'Vérification en cours',
        'Votre demande est en cours d\'examen. Vous pourrez vendre une fois approuvé.',
        [{ text: 'OK', onPress: () => onCancel ? onCancel() : router.back() }]
      );
    } else if (status === 'rejected') {
      Alert.alert(
        'Vérification Refusée',
        'Votre demande a été refusée. Veuillez contacter le support.',
        [{ text: 'OK', onPress: () => onCancel ? onCancel() : router.back() }]
      );
    } else {
      Alert.alert(
        'Vérification Requise',
        'Pour vendre, vous devez être vérifié. Voulez-vous commencer le processus KYC ?',
        [
          { text: 'Plus tard', style: 'cancel', onPress: onCancel },
          { text: 'Commencer', onPress: () => setIsKYCVisible(true) }
        ]
      );
    }
  };

  const pickImage = async () => {
    try {
      console.log('📸 Starting to pick real image...');
      let result = await ImagePicker.launchImageLibraryAsync({

        allowsEditing: false,
        quality: 0.7,
        base64: true,
        allowsMultipleSelection: true,
        selectionLimit: 5,
      });

      if (!result.canceled) {
        setSelectedImages(prev => [...prev, ...result.assets]);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Erreur', 'Impossible de sélectionner des images.');
    }
  };

  const pickLogo = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({

      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
      allowsMultipleSelection: false,
    });

    if (!result.canceled && result.assets.length > 0) {
      setLogoImage(result.assets[0]);
    }
  };

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddProduct = async () => {
    if (!name || !price || !category || !country) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs obligatoires (nom, prix, catégorie, pays).');
      return;
    }

    // Validation pour empêcher les coordonnées dans le titre ou la description
    if (containsContactInfo(name)) {
      Alert.alert("Titre non valide", "Le nom du produit ne doit pas contenir de coordonnées (téléphone, email, etc.).");
      return;
    }

    if (containsContactInfo(description)) {
      Alert.alert(
        "Description non valide",
        "Il est interdit de mentionner des numéros de téléphone, emails ou réseaux sociaux dans la description du produit. Les échanges doivent se faire via la messagerie de l'application.",
        [{ text: "Je corrige" }]
      );
      return;
    }

    setIsLoading(true);
    setUploading(true);

    const uploadedImageUrls: string[] = [];
    let imageUrl: string | null = null;
    let logoUrl: string | null = null;

    try {
      let productId;
      try {
        productId = uuidv4();
      } catch (e) {
        console.warn('UUID generation failed, using fallback', e);
        // Fallback : Génération manuelle d'un UUID v4 valide pour satisfaire PostgreSQL
        productId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
          var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
        });
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Utilisateur non connecté');

      // --- AJOUT : Récupérer la localisation du profil pour l'associer au produit ---
      const { data: profileData } = await supabase
        .from('profiles')
        .select('location, country, avatar_url')
        .eq('user_id', user.id)
        .single();

      // Upload Logo if exists
      if (logoImage) {
        const { base64, uri } = logoImage;
        const filePath = `logos/${user.id}/${Date.now()}.${uri.split('.').pop()}`;
        const { error: uploadError } = await supabase.storage
          .from('marketplace-products')
          .upload(filePath, decode(base64), { contentType: 'image/jpeg' });

        if (uploadError) throw uploadError;
        logoUrl = filePath;
      } else if (profileData?.avatar_url) {
        // Use profile logo if no specific product logo is uploaded
        logoUrl = profileData.avatar_url;
      }

      if (selectedImages.length > 0) {
        for (const imgAsset of selectedImages) {
          const { base64, uri } = imgAsset;
          const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${uri.split('.').pop()}`;
          const filePath = `products/${productId}/${fileName}`;
          const { error: uploadError } = await supabase.storage
            .from('marketplace-products')
            .upload(filePath, decode(base64), { contentType: 'image/jpeg' });

          if (uploadError) throw uploadError;
          uploadedImageUrls.push(filePath);
        }
        imageUrl = uploadedImageUrls.length > 0 ? uploadedImageUrls[0] : null;
      }

      const { error: insertError } = await supabase.from('marketplace_products').insert({
        id: productId,
        name,
        description,
        price: parseFloat(price),
        country,
        category, // Assuming category is a string
        seller_id: user.id,
        image: imageUrl,
        location: [city, region, country].filter(Boolean).join(', '),
        // city: city || null, // Colonne inexistante
        // region: region || null, // Colonne inexistante
        // logo: logoUrl, // Colonne inexistante

        // Sponsoring and Promotion fields
        is_sponsored: isSponsored,
        boost_level: isSponsored && sponsorPeriod ? (sponsorPeriod === 3 ? 1 : sponsorPeriod === 7 ? 2 : 3) : 0,
        sponsor_end_date: isSponsored && sponsorPeriod ? new Date(Date.now() + sponsorPeriod * 24 * 60 * 60 * 1000).toISOString() : null,
        is_on_sale: isOnSale,
        discount_percentage: isOnSale && discountPercentage ? parseFloat(discountPercentage) : 0,
      });

      if (insertError) throw insertError;

      // Handle Avicoin debit if sponsored
      if (isSponsored && sponsorPeriod) {
        const cost = sponsorPeriod * 100;
        const { error: debitError } = await supabase
          .from('user_avicoins')
          .update({ balance: avicoinBalance - cost })
          .eq('user_id', user?.id);

        if (debitError) {
          console.error('Error debiting avicoins:', debitError);
        }
      }

      Alert.alert('Succès', 'Produit ajouté avec succès!', [
        { text: 'OK', onPress: () => onProductAdded ? onProductAdded() : router.back() }
      ]);
    } catch (error: any) {
      console.error('Erreur lors de l\'ajout du produit:', error);
      Alert.alert('Erreur', 'Impossible d\'ajouter le produit. ' + (error?.message || 'Erreur inconnue'));
    } finally {
      setUploading(false);
      setIsLoading(false);
    }
  };

  const handleKYCSubmitted = () => {
    setIsKYCVisible(false);
    Alert.alert(
      'Demande Envoyée',
      'Votre demande de vérification a été envoyée. Vous recevrez une notification une fois examinée.',
      [{ text: 'OK', onPress: () => onCancel ? onCancel() : router.back() }]);
  };

  if (isCheckingStatus) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text>Vérification de votre statut de vendeur...</Text>
      </View>
    );
  }

  if (isKYCVisible) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <SellerKYCVerification
          onVerificationSubmitted={handleKYCSubmitted}
          onCancel={() => onCancel ? onCancel() : router.back()}
        />
      </SafeAreaView>
    );
  }

  if (verificationStatus === 'approved') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 120 }}>
          <View style={styles.header}>
            <Text style={styles.title}>Ajouter un Produit</Text>
          </View>

          <TextInput style={styles.input} placeholder="Nom du produit" value={name} onChangeText={setName} />
          <TextInput style={styles.input} placeholder="Prix (CFA)" value={price} onChangeText={setPrice} keyboardType="numeric" />
          <TextInput style={styles.input} placeholder="Description du produit" value={description} onChangeText={setDescription} multiline />
          {containsContactInfo(description) && (
            <Text style={styles.validationErrorText}>
              ⚠️ Il est interdit d'inclure des numéros de téléphone ou contacts dans la description.
            </Text>
          )}

          <Text style={styles.label}>Pays</Text>
          <TouchableOpacity style={styles.input} onPress={() => setIsCountryPickerVisible(true)}>
            <Text style={styles.inputText}>{country ? `${COUNTRIES.find(c => c.name === country)?.flag} ${country}` : 'Sélectionner un pays'}</Text>
          </TouchableOpacity>

          {/* Region Selection based on Country */}
          {country && availableRegions.length > 0 && (
            <>
              <Text style={styles.label}>Région</Text>
              <View style={styles.categoryContainer}>
                {availableRegions.map((reg) => (
                  <TouchableOpacity key={reg.id} style={[styles.categoryChip, region === reg.name && styles.categoryChipSelected]} onPress={() => setRegion(reg.name)}>
                    <Text style={[styles.categoryChipText, region === reg.name && styles.categoryChipTextSelected]}>{reg.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          <Text style={styles.label}>Ville</Text>
          <TextInput style={styles.input} placeholder="Ville ou localité" value={city} onChangeText={setCity} />

          <Text style={styles.label}>Catégorie</Text>
          <View style={styles.categoryContainer}>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[styles.categoryChip, category === cat && styles.categoryChipSelected]}
                onPress={() => setCategory(cat)}
              >
                <Text style={[styles.categoryChipText, category === cat && styles.categoryChipTextSelected]}>{cat}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Logo (Optionnel)</Text>
          <TouchableOpacity style={styles.imagePicker} onPress={pickLogo}>
            <Icon name="image" size={24} color={colors.primary} />
            <Text style={styles.imagePickerText}>{logoImage ? 'Changer le logo' : 'Ajouter un logo'}</Text>
          </TouchableOpacity>
          {logoImage && (
            <View style={styles.logoPreviewContainer}>
              <Image source={{ uri: logoImage.uri }} style={styles.logoPreview} />
              <TouchableOpacity style={styles.removeButton} onPress={() => setLogoImage(null)}>
                <Icon name="close-circle" size={24} color={colors.danger} />
              </TouchableOpacity>
            </View>
          )}

          <Text style={styles.label}>Photos du produit</Text>
          <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
            <Icon name="camera" size={24} color={colors.primary} />
            <Text style={styles.imagePickerText}>Ajouter des photos</Text>
          </TouchableOpacity>

          {selectedImages.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imagePreviewContainer}>
              {selectedImages.map((img, index) => (
                <View key={index} style={styles.imagePreviewWrapper}>
                  <Image source={{ uri: img.uri }} style={styles.imagePreview} />
                  <TouchableOpacity style={styles.removeImageButton} onPress={() => removeImage(index)}>
                    <Icon name="close-circle" size={20} color={colors.danger} />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          )}

          {/* Avicoin Balance Display */}
          <View style={styles.avicoinBalanceContainer}>
            <Icon name="cash" size={20} color={colors.primary} />
            <Text style={styles.avicoinBalanceText}>
              Votre solde Avicoins: <Text style={styles.avicoinBalanceValue}>{avicoinBalance.toLocaleString()}</Text>
            </Text>
          </View>

          {/* Sponsoring Options */}
          <Text style={styles.label}>Option de Sponsoring</Text>
          <View style={styles.optionRow}>
            <Text style={styles.optionText}>Sponsoriser ce produit ?</Text>
            <TouchableOpacity
              style={[styles.toggleButton, isSponsored && styles.toggleButtonActive]}
              onPress={() => setIsSponsored(!isSponsored)}
            >
              <Text style={[styles.toggleButtonText, !isSponsored && styles.toggleButtonTextInactive]}>{isSponsored ? 'Oui' : 'Non'}</Text>
            </TouchableOpacity>
          </View>

          {isSponsored && (
            <>
              <Text style={styles.label}>Période de Sponsoring (jours)</Text>
              <View style={styles.periodContainer}>
                {[3, 7, 14].map((period) => (
                  <TouchableOpacity
                    key={period}
                    style={[
                      styles.periodButton,
                      sponsorPeriod === period && styles.periodButtonActive,
                    ]}
                    onPress={() => setSponsorPeriod(period)}
                  >
                    <Text
                      style={[
                        styles.periodButtonText,
                        sponsorPeriod === period && styles.periodButtonTextActive,
                      ]}
                    >
                      {period} jours
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              {sponsorPeriod && (
                <Text style={styles.helperText}>
                  Coût estimé: {(sponsorPeriod * 100).toLocaleString()} Avicoins
                </Text>
              )}
            </>
          )}

          {/* Promotion Options */}
          <Text style={styles.label}>Option de Promotion</Text>
          <View style={styles.optionRow}>
            <Text style={styles.optionText}>Mettre en promotion ?</Text>
            <TouchableOpacity
              style={[styles.toggleButton, isOnSale && styles.toggleButtonActive]}
              onPress={() => setIsOnSale(!isOnSale)}
            >
              <Text style={[styles.toggleButtonText, !isOnSale && styles.toggleButtonTextInactive]}>{isOnSale ? 'Oui' : 'Non'}</Text>
            </TouchableOpacity>
          </View>

          {isOnSale && (
            <TextInput
              style={styles.input}
              value={discountPercentage}
              onChangeText={setDiscountPercentage}
              placeholder="Pourcentage de réduction (%)"
              keyboardType="numeric"
              maxLength={2}
            />
          )}
        </ScrollView>

        <SimpleBottomSheet isVisible={isCountryPickerVisible} onClose={() => setIsCountryPickerVisible(false)}>
          <View style={styles.bottomSheetContainer}>
            <Text style={styles.bottomSheetTitle}>Sélectionner un pays</Text>
            <ScrollView>
              {COUNTRIES.map((c) => (
                <TouchableOpacity
                  key={c.id}
                  style={styles.countryPickerItem}
                  onPress={() => {
                    setCountry(c.name);
                    setIsCountryPickerVisible(false);
                  }}
                >
                  <Text style={styles.countryPickerFlag}>{c.flag}</Text>
                  <Text style={styles.countryPickerName}>{c.name}</Text>
                  {country === c.name && <Icon name="checkmark-circle" size={24} color={colors.primary} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </SimpleBottomSheet>

        {/* Fixed action buttons */}
        <View style={styles.fixedActionButtons}>
          <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={onCancel} disabled={isLoading}>
            <Text style={styles.buttonText}>Annuler</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.button} onPress={handleAddProduct} disabled={isLoading}>
            {isLoading ? <ActivityIndicator color={colors.white} /> : <Text style={styles.buttonText}>Ajouter le produit</Text>}
          </TouchableOpacity>
        </View>

      </SafeAreaView>
    );
  }

  // Fallback view if status is not approved and KYC is not visible
  return null;
};













const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: colors.background,
  },
  containerWithPaddingBottom: {
    paddingBottom: 100, // Make space for fixed buttons
  },
  header: {
    marginBottom: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
  },
  input: {
    ...commonStyles.input,
    marginBottom: 15,
  },
  inputText: {
    fontSize: 16,
    color: '#333',
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 5,
  },
  categoryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 15,
  },
  categoryChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: colors.border,
    marginRight: 10,
    marginBottom: 10,
  },
  categoryChipSelected: {
    backgroundColor: colors.primary,
  },
  categoryChipText: {
    color: colors.text,
    fontSize: 14,
  },
  categoryChipTextSelected: {
    color: colors.white,
  },
  imagePicker: {
    ...commonStyles.input,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    borderStyle: 'dashed',
    borderColor: colors.primary,
    marginBottom: 15,
  },
  imagePickerText: {
    marginLeft: 10,
    color: colors.primary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  imagePreviewContainer: {
    marginBottom: 15,
  },
  imagePreviewWrapper: {
    marginRight: 10,
  },
  imagePreview: {
    width: 100,
    height: 100,
    borderRadius: 8,
    marginRight: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  removeImageButton: {
    position: 'absolute',
    top: -5,
    right: 5,
    backgroundColor: 'white',
    borderRadius: 10,
  },
  logoPreviewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  logoPreview: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 1,
    borderColor: colors.border,
  },
  removeButton: {
    marginLeft: 10,
  },
  fixedActionButtons: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 15,
    paddingHorizontal: 20,
    backgroundColor: colors.white, // Or a suitable background
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  button: {
    ...commonStyles.button,
    flex: 1,
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: colors.error,
  },
  buttonText: {
    ...commonStyles.buttonText,
  },
  bottomSheetContainer: {
    padding: 20,
    maxHeight: '80%', // Limit height
  },
  bottomSheetTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: colors.primary,
  },
  countryPickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  countryPickerFlag: {
    fontSize: 24,
    marginRight: 15,
  },
  countryPickerName: {
    fontSize: 16,
    flex: 1,
  },
  avicoinBalanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary + '20',
    padding: 12,
    borderRadius: 12,
    marginTop: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.primary + '40',
    gap: 8,
  },
  avicoinBalanceText: {
    fontSize: 15,
    color: colors.primary,
    fontWeight: '500',
  },
  avicoinBalanceValue: {
    fontWeight: 'bold',
    color: colors.primary,
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.border + '40',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
  },
  optionText: {
    fontSize: 16,
    color: colors.text,
  },
  toggleButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.border,
  },
  toggleButtonActive: {
    backgroundColor: colors.primary,
  },
  toggleButtonText: {
    color: colors.white,
    fontWeight: 'bold',
  },
  toggleButtonTextInactive: {
    color: colors.text,
  },
  periodContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 12,
  },
  periodButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  periodButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  periodButtonText: {
    color: colors.text,
    fontWeight: '500',
  },
  periodButtonTextActive: {
    color: colors.white,
  },
  helperText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
    fontStyle: 'italic',
  },
  validationErrorText: {
    color: colors.error,
    fontSize: 12,
    marginBottom: 15,
    marginTop: -10,
  },
});

export default AddProductScreen;