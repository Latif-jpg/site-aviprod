
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, Alert, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { colors, commonStyles } from '../styles/commonStyles';
import Icon from './Icon';
import Button from './Button';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { supabase, ensureSupabaseInitialized } from '../config'; // Import supabase directly

interface AddProductFormProps {
  onSubmit: () => void;
  onCancel: () => void;
}

export default function AddProductForm({ onSubmit, onCancel }: AddProductFormProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('feed');
  const [image, setImage] = useState('');
  const [location, setLocation] = useState('');
  const [city, setCity] = useState('');
  const [region, setRegion] = useState('');
  const [farmName, setFarmName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingVerification, setIsCheckingVerification] = useState(false);
  const [isLoadingFarmName, setIsLoadingFarmName] = useState(true);
  const [isSponsored, setIsSponsored] = useState(false);
  const [sponsorPeriod, setSponsorPeriod] = useState<number | null>(null);
  const [isOnSale, setIsOnSale] = useState(false);
  const [discountPercentage, setDiscountPercentage] = useState('');
  const [avicoinBalance, setAvicoinBalance] = useState(0); // New state for avicoin balance

  useEffect(() => {
    loadFarmName();
    loadAvicoinBalance(); // Load avicoin balance on mount
  }, []);

  const loadAvicoinBalance = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) return;

      const { data, error } = await supabase
        .from('user_avicoins') // Changed from profiles to user_avicoins
        .select('balance') // Changed from avicoins to balance
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading avicoin balance:', error);
        return;
      }

      if (data && data.balance) {
        setAvicoinBalance(data.balance);
      }
    } catch (error) {
      console.error('Exception loading avicoin balance:', error);
    }
  };

  const loadFarmName = async () => {
    try {
      setIsLoadingFarmName(true);
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('farm_name')
        .eq('id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading farm name:', error);
        return;
      }

      if (data && data.farm_name) {
        setFarmName(data.farm_name);
      }
    } catch (error) {
      console.error('Exception loading farm name:', error);
    } finally {
      setIsLoadingFarmName(false);
    }
  };

  const categories = [
    { id: 'feed', name: 'Alimentation', icon: 'nutrition' },
    { id: 'medicine', name: 'Médicaments', icon: 'medical' },
    { id: 'equipment', name: 'Équipement', icon: 'construct' },
    { id: 'birds', name: 'Volailles', icon: 'leaf' },
  ];

  const regions = [
    'Boucle du Mouhoun',
    'Cascades',
    'Centre',
    'Centre-Est',
    'Centre-Nord',
    'Centre-Ouest',
    'Centre-Sud',
    'Est',
    'Hauts-Bassins',
    'Nord',
    'Plateau-Central',
    'Sahel',
    'Sud-Ouest',
  ];

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({

      allowsEditing: true,
      quality: 0.8,
      allowsMultipleSelection: false,
    });

    if (!result.canceled && result.assets[0]) {
      setImage(result.assets[0].uri);
    }
  };

  const uploadImageToSupabase = async (imageUri: string): Promise<string> => {
    try {
      console.log('📤 Uploading image to Supabase Storage...');

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // For React Native, use Expo FileSystem to read the file
      const fileInfo = await FileSystem.getInfoAsync(imageUri);
      if (!fileInfo.exists) {
        throw new Error('Image file does not exist');
      }

      // Read file as base64
      const base64 = await FileSystem.readAsStringAsync(imageUri, {
        encoding: 'base64',
      });

      // Convert base64 to Uint8Array
      const binaryString = atob(base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Create unique filename
      const fileExt = imageUri.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${user.id}_${Date.now()}.${fileExt}`;
      const filePath = `marketplace-products/${fileName}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('marketplace-products')
        .upload(filePath, bytes, {
          contentType: `image/${fileExt}`,
          upsert: false
        });

      if (error) {
        console.error('❌ Error uploading image:', error);
        throw error;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('marketplace-products')
        .getPublicUrl(filePath);

      console.log('✅ Image uploaded successfully:', publicUrl);
      return publicUrl;

    } catch (error: any) {
      console.error('❌ Exception uploading image:', error);
      throw new Error('Impossible de télécharger l\'image: ' + error.message);
    }
  };

  const validateForm = () => {
    if (!name.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer un nom de produit');
      return false;
    }
    if (!description.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer une description');
      return false;
    }
    if (!price || parseFloat(price) <= 0) {
      Alert.alert('Erreur', 'Veuillez entrer un prix valide');
      return false;
    }
    if (!image) {
      Alert.alert('Erreur', 'Veuillez sélectionner une image pour votre produit');
      return false;
    }
    if (!location.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer une localité');
      return false;
    }
    if (!city.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer une ville');
      return false;
    }
    if (!region) {
      Alert.alert('Erreur', 'Veuillez sélectionner une région');
      return false;
    }

    if (isSponsored && !sponsorPeriod) {
      Alert.alert('Erreur', 'Veuillez sélectionner une période de sponsoring');
      return false;
    }

    if (isOnSale) {
      const discount = parseFloat(discountPercentage);
      if (isNaN(discount) || discount <= 0 || discount >= 100) {
        Alert.alert('Erreur', 'Veuillez entrer un pourcentage de réduction valide (entre 1 et 99)');
        return false;
      }
    }

    return true;
  };

  const getDefaultImageForCategory = (cat: string) => {
    const imageMap: { [key: string]: string } = {
      feed: 'https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?w=400&h=300&fit=crop',
      medicine: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&h=300&fit=crop',
      equipment: 'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=400&h=300&fit=crop',
      birds: 'https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?w=400&h=300&fit=crop',
    };
    return imageMap[cat] || imageMap.feed;
  };

  const checkSellerVerification = async () => {
    try {
      console.log('🔍 Checking seller verification status...');
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        return { verified: false, status: null };
      }

      const { data, error } = await supabase
        .from('seller_verifications')
        .select('verification_status')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('❌ Error checking verification:', error);
        return { verified: false, status: null };
      }

      if (!data) {
        console.log('⚠️ No verification found');
        return { verified: false, status: null };
      }

      console.log('✅ Verification status:', data.verification_status);
      return {
        verified: data.verification_status === 'approved',
        status: data.verification_status
      };
    } catch (error: any) {
      console.error('❌ Exception in checkSellerVerification:', error);
      return { verified: false, status: null };
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    setIsCheckingVerification(true);

    try {
      console.log('🔍 Checking seller verification before adding product...');
      const { verified, status } = await checkSellerVerification();
      setIsCheckingVerification(false);

      if (!verified) {
        if (status === 'pending') {
          Alert.alert(
            'Vérification en cours',
            'Votre demande de vérification est en cours d\'examen. Vous pourrez vendre une fois qu\'elle sera approuvée.',
            [{ text: 'OK' }]
          );
        } else if (status === 'rejected') {
          Alert.alert(
            'Vérification refusée',
            'Votre demande de vérification a été refusée. Veuillez contacter le support.',
            [{ text: 'OK' }]
          );
        } else {
          Alert.alert(
            'Vérification requise',
            'Vous devez être vérifié pour vendre sur le marketplace. Veuillez soumettre votre demande de vérification KYC.',
            [{ text: 'OK' }]
          );
        }
        setIsSubmitting(false);
        return;
      }

      console.log('✅ Seller is verified, proceeding with product creation...');
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        Alert.alert('Erreur', 'Vous devez être connecté pour ajouter un produit');
        return;
      }

      let finalAvicoinCost = 0;
      if (isSponsored && sponsorPeriod) {
        finalAvicoinCost = sponsorPeriod * 100; // 100 Avicoins per day
        if (avicoinBalance < finalAvicoinCost) {
          Alert.alert(
            'Solde Avicoins insuffisant',
            `Vous n'avez pas assez d'Avicoins pour sponsoriser ce produit. Coût: ${finalAvicoinCost} Avicoins, Votre solde: ${avicoinBalance} Avicoins.`
          );
          setIsSubmitting(false);
          setIsCheckingVerification(false);
          return;
        }
      }

      // Handle image upload
      let imageUrl = '';
      if (image) {
        try {
          console.log('📤 Uploading selected image...');
          imageUrl = await uploadImageToSupabase(image);
          console.log('✅ Image uploaded successfully:', imageUrl);
        } catch (uploadError: any) {
          console.error('❌ Image upload failed:', uploadError);
          Alert.alert('Erreur', 'Impossible de télécharger l\'image. Veuillez réessayer.');
          setIsSubmitting(false);
          return;
        }
      } else {
        // Use default image if no image selected
        imageUrl = getDefaultImageForCategory(category);
      }

      const productData: any = {
        seller_id: user.id,
        name: name.trim(),
        description: description.trim(),
        price: parseFloat(price),
        category,
        image: imageUrl,
        location: location.trim(),
        city: city.trim(),
        region: region,
        in_stock: true,
        rating: 0,

        // Sponsorship fields
        is_sponsored: isSponsored,
        boost_level: isSponsored && sponsorPeriod ? (sponsorPeriod === 3 ? 1 : sponsorPeriod === 7 ? 2 : 3) : 0,
        sponsor_end_date: isSponsored && sponsorPeriod ? new Date(Date.now() + sponsorPeriod * 24 * 60 * 60 * 1000).toISOString() : null,

        // Promotion fields
        is_on_sale: isOnSale,
        discount_percentage: isOnSale && discountPercentage ? parseFloat(discountPercentage) : 0,
      };

      console.log('🛒 Product data to insert:', productData);

      const { data, error } = await supabase
        .from('marketplace_products')
        .insert(productData)
        .select();

      if (error) {
        console.error('❌ Error adding product:', error);
        throw error;
      }

      // If product added successfully and sponsored, debit avicoins
      if (isSponsored && finalAvicoinCost > 0) {
        const { error: debitError } = await supabase
          .from('user_avicoins') // Changed from profiles to user_avicoins
          .update({ balance: avicoinBalance - finalAvicoinCost })
          .eq('user_id', user.id);

        if (debitError) {
          console.error('❌ Error debiting Avicoins:', debitError);
          Alert.alert('Erreur', 'Produit ajouté, mais impossible de débiter les Avicoins.');
          // Optionally, you might want to revert product creation here or flag it for manual review
        } else {
          Alert.alert('Succès! ✅', `Produit ajouté et ${finalAvicoinCost} Avicoins débités.`);
          loadAvicoinBalance(); // Refresh balance
        }
      } else {
        Alert.alert('Succès! ✅', 'Produit ajouté avec succès au marketplace');
      }

      // Call onSubmit to refresh the products list
      onSubmit();
    } catch (error: any) {
      console.error('❌ Error adding product:', error);
      Alert.alert('Erreur', error.message || 'Impossible d\'ajouter le produit');
    } finally {
      setIsSubmitting(false);
      setIsCheckingVerification(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <Text style={styles.title}>Ajouter un Produit</Text>
        <Text style={styles.subtitle}>Vendez vos produits sur le marketplace</Text>
      </View>

      <Text style={styles.label}>Nom du produit *</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="Ex: Aliment poulet de chair"
        placeholderTextColor={colors.textSecondary}
      />

      <Text style={styles.label}>Nom de la ferme</Text>
      {isLoadingFarmName ? (
        <View style={styles.loadingFarmName}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.loadingFarmNameText}>Chargement du nom de ferme...</Text>
        </View>
      ) : (
        <TextInput
          style={styles.input}
          value={farmName}
          onChangeText={setFarmName}
          placeholder="Ex: Ferme Avicole Dupont"
          placeholderTextColor={colors.textSecondary}
        />
      )}

      <Text style={styles.label}>Description *</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        value={description}
        onChangeText={setDescription}
        placeholder="Décrivez votre produit..."
        placeholderTextColor={colors.textSecondary}
        multiline
        numberOfLines={4}
      />

      <Text style={styles.label}>Prix (CFA) *</Text>
      <TextInput
        style={styles.input}
        value={price}
        onChangeText={setPrice}
        placeholder="0"
        placeholderTextColor={colors.textSecondary}
        keyboardType="numeric"
      />

      <Text style={styles.label}>Catégorie *</Text>
      <View style={styles.categoryContainer}>
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat.id}
            style={[
              styles.categoryButton,
              category === cat.id && styles.categoryButtonSelected
            ]}
            onPress={() => setCategory(cat.id)}
          >
            <Icon
              name={cat.icon as any}
              size={20}
              color={category === cat.id ? colors.white : colors.text}
            />
            <Text style={[
              styles.categoryButtonText,
              category === cat.id && styles.categoryButtonTextSelected
            ]}>
              {cat.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.locationSection}>
        <View style={styles.locationHeader}>
          <Icon name="location" size={24} color={colors.orange} />
          <Text style={styles.locationTitle}>Localisation du produit</Text>
        </View>
        <Text style={styles.locationSubtitle}>
          Indiquez où se trouve le produit pour faciliter l&apos;achat par zone
        </Text>

        <Text style={styles.label}>Localité / Quartier *</Text>
        <TextInput
          style={styles.input}
          value={location}
          onChangeText={setLocation}
          placeholder="Ex: Ouaga 2000, Secteur 15"
          placeholderTextColor={colors.textSecondary}
        />

        <Text style={styles.label}>Ville *</Text>
        <TextInput
          style={styles.input}
          value={city}
          onChangeText={setCity}
          placeholder="Ex: Ouagadougou, Bobo-Dioulasso"
          placeholderTextColor={colors.textSecondary}
        />

        <Text style={styles.label}>Région *</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.regionScroll}
        >
          {regions.map((reg) => (
            <TouchableOpacity
              key={reg}
              style={[
                styles.regionButton,
                region === reg && styles.regionButtonSelected
              ]}
              onPress={() => setRegion(reg)}
            >
              <Text style={[
                styles.regionButtonText,
                region === reg && styles.regionButtonTextSelected
              ]}>
                {reg}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <Text style={styles.label}>Image (optionnel)</Text>
      <Text style={styles.helperText}>
        Une image par défaut sera utilisée si vous n&apos;en sélectionnez pas
      </Text>
      <TouchableOpacity style={styles.imageButton} onPress={pickImage}>
        {image ? (
          <Image source={{ uri: image }} style={styles.imagePreview} />
        ) : (
          <>
            <Icon name="camera" size={32} color={colors.textSecondary} />
            <Text style={styles.imageButtonText}>Ajouter une image</Text>
          </>
        )}
      </TouchableOpacity>

      {/* Avicoin Balance Display */}
      <View style={styles.avicoinBalanceContainer}>
        <Icon name="cash" size={20} color={colors.primary} />
        <Text style={styles.avicoinBalanceText}>
          Votre solde Avicoins: <Text style={styles.avicoinBalanceValue}>{avicoinBalance.toLocaleString()}</Text>
        </Text>
      </View>

      {/* Sponsorship Option */}
      <Text style={styles.label}>Option de Sponsoring</Text>
      <View style={styles.optionRow}>
        <Text style={styles.optionText}>Sponsoriser ce produit ?</Text>
        <TouchableOpacity
          style={[styles.toggleButton, isSponsored && styles.toggleButtonActive]}
          onPress={() => setIsSponsored(!isSponsored)}
        >
          <Text style={styles.toggleButtonText}>{isSponsored ? 'Oui' : 'Non'}</Text>
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

      {/* Promotion Option */}
      <Text style={styles.label}>Option de Promotion</Text>
      <View style={styles.optionRow}>
        <Text style={styles.optionText}>Mettre en promotion ?</Text>
        <TouchableOpacity
          style={[styles.toggleButton, isOnSale && styles.toggleButtonActive]}
          onPress={() => setIsOnSale(!isOnSale)}
        >
          <Text style={styles.toggleButtonText}>{isOnSale ? 'Oui' : 'Non'}</Text>
        </TouchableOpacity>
      </View>

      {isOnSale && (
        <>
          <Text style={styles.label}>Pourcentage de réduction (%)</Text>
          <TextInput
            style={styles.input}
            value={discountPercentage}
            onChangeText={setDiscountPercentage}
            placeholder="Ex: 30"
            placeholderTextColor={colors.textSecondary}
            keyboardType="numeric"
            maxLength={2}
          />
        </>
      )}

      {isCheckingVerification && (
        <View style={styles.verificationCheck}>
          <ActivityIndicator size="small" color={colors.orange} />
          <Text style={styles.verificationCheckText}>
            Vérification du statut vendeur...
          </Text>
        </View>
      )}

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.actionButton, styles.submitButton, isSubmitting && styles.disabledButton]}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color={colors.white} size="small" />
          ) : (
            <>
              <Icon name="add-circle" size={20} color={colors.white} />
              <Text style={styles.buttonText}>Ajouter</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.cancelButton, isSubmitting && styles.disabledButton]}
          onPress={onCancel}
          disabled={isSubmitting}
        >
          <Icon name="close-circle" size={20} color={colors.text} />
          <Text style={[styles.buttonText, { color: colors.text }]}>Annuler</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100, // Important pour le défilement maximum
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
    marginTop: 12,
  },
  helperText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
    fontStyle: 'italic',
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    backgroundColor: colors.backgroundAlt,
    color: colors.text,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  categoryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: colors.backgroundAlt,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  categoryButtonSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  categoryButtonTextSelected: {
    color: colors.white,
  },
  locationSection: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  locationTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  locationSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  regionScroll: {
    marginTop: 8,
  },
  regionButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 8,
  },
  regionButtonSelected: {
    backgroundColor: colors.orange,
    borderColor: colors.orange,
  },
  regionButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  regionButtonTextSelected: {
    color: colors.white,
  },
  imageButton: {
    height: 150,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 12,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.backgroundAlt,
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  imageButtonText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
  },
  verificationCheck: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 16,
    backgroundColor: colors.orange + '20',
    borderRadius: 12,
    marginTop: 16,
  },
  verificationCheckText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.orange,
  },
  buttonContainer: {
    flexDirection: 'row',
    marginTop: 32,
    gap: 12,
    marginBottom: 40,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  submitButton: {
    backgroundColor: colors.primary,
  },
  cancelButton: {
    backgroundColor: colors.backgroundAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  buttonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  disabledButton: {
    opacity: 0.6,
  },
  loadingFarmName: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: colors.backgroundAlt,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  loadingFarmNameText: {
    fontSize: 14,
    color: colors.textSecondary,
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
    backgroundColor: colors.backgroundAlt,
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
    backgroundColor: colors.backgroundAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  periodButtonActive: {
    backgroundColor: colors.orange,
    borderColor: colors.orange,
  },
  periodButtonText: {
    color: colors.text,
    fontWeight: '500',
  },
  periodButtonTextActive: {
    color: colors.white,
  },
});
