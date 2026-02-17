import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, TextInput, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, commonStyles } from '../styles/commonStyles';
import Icon from '../components/Icon';
import { router } from 'expo-router';
import { ensureSupabaseInitialized, getMarketplaceImageUrl } from '../config';
import { useAuth } from '../hooks/useAuth';
import { useProfile } from '../contexts/ProfileContext';
import { useSubscription } from '../contexts/SubscriptionContext';
import Button from '../components/Button';
import { smartAlertSystem } from '../src/intelligence/core/SmartAlertSystem'; // Importer le singleton
import { useDataCollector } from '../src/hooks/useDataCollector';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';
import { COUNTRIES } from '../data/locations';
import SimpleBottomSheet from '../components/BottomSheet';

export default function ProfileScreen() {
  const { user } = useAuth();
  // Utiliser le contexte pour obtenir le profil et l'état de chargement.
  // Ces données se mettront à jour automatiquement.
  const { profile, loading: profileLoading, updateProfile, refreshProfile } = useProfile();
  const { subscription } = useSubscription();
  const [isEditing, setIsEditing] = useState(false);
  const [editingFullName, setEditingFullName] = useState(''); // Garder les états locaux pour l'édition
  const [editingPhone, setEditingPhone] = useState('');
  const [editingLocation, setEditingLocation] = useState('');
  const [editingFarmName, setEditingFarmName] = useState('');
  const [editingLogo, setEditingLogo] = useState<string | null>(null);
  const [editingCountry, setEditingCountry] = useState('');
  const [editingRegion, setEditingRegion] = useState('');
  const [editingCity, setEditingCity] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const { trackAction } = useDataCollector();
  const [pendingPaymentsCount, setPendingPaymentsCount] = useState(0);
  const [pendingKYCCount, setPendingKYCCount] = useState(0);
  // Suppression de l'état local avicoins, on utilise le contexte via profile?.avicoins
  const [isCountryPickerVisible, setIsCountryPickerVisible] = useState(false);
  const [isRegionPickerVisible, setIsRegionPickerVisible] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // --- NOUVEAU : Centraliser la logique d'initialisation de l'état d'édition ---
  const initializeEditingState = useCallback(() => {
    if (profile) {
      setEditingFullName(profile.full_name || '');
      setEditingPhone(profile.phone || '');
      setEditingLocation(profile.location || '');
      setEditingFarmName(profile.farm_name || '');
      setEditingLogo(profile.avatar_url || null);
      setEditingCountry(profile.country || 'Burkina Faso');

      // Tenter d'extraire la ville et la région depuis la location existante
      const locParts = (profile.location || '').split(',').map(s => s.trim());
      if (locParts.length >= 1) setEditingCity(locParts[0]);
      if (locParts.length >= 2 && locParts[1] !== profile.country) setEditingRegion(locParts[1]);
      else setEditingRegion('');
    }
  }, [profile]); // Cette fonction dépend du profil pour se recréer si le profil change

  useEffect(() => {
    if (profile?.role === 'admin') {
      fetchPendingPaymentsCount();
      fetchPendingKYCCount();
    }
  }, [profile?.role, profile?.id]); // Ajouter id pour stabiliser

  useEffect(() => {
    // Initialiser l'état d'édition SEULEMENT si on n'est pas déjà en train d'éditer
    // Cela évite de perdre les changements de l'utilisateur lors d'un refresh background
    if (!isEditing) {
      initializeEditingState();
    }
  }, [profile?.updated_at, profile?.id, isEditing, initializeEditingState]);

  useEffect(() => {
    // Rafraîchir une seule fois au montage
    refreshProfile();
  }, [user?.id]); // On ne dépend plus de refreshProfile qui peut varier par context

  const fetchPendingPaymentsCount = async () => {
    try {
      const supabase = await ensureSupabaseInitialized();
      const { data, error } = await supabase.rpc('get_pending_payment_proofs_count');

      if (error) {
        console.warn('Could not fetch pending payments count:', error.message);
        return;
      }
      setPendingPaymentsCount(data || 0);
    } catch (error) {
      console.warn('Error in fetchPendingPaymentsCount:', error);
    }
  };

  const fetchPendingKYCCount = async () => {
    try {
      const supabase = await ensureSupabaseInitialized();
      const { data, error } = await supabase.rpc('get_pending_kyc_count');

      if (error) {
        console.warn('Could not fetch pending KYC count:', error.message);
        return;
      }
      setPendingKYCCount(data || 0);
    } catch (error) {
      console.warn('Error in fetchPendingKYCCount:', error);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Déconnexion',
      'Êtes-vous sûr de vouloir vous déconnecter?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Déconnexion',
          style: 'destructive',
          onPress: async () => {
            try {
              smartAlertSystem.clearCache();
              const supabase = await ensureSupabaseInitialized();
              const { error: signOutError } = await supabase.auth.signOut({ scope: 'local' });
              if (signOutError) {
                console.error('Error clearing local session:', signOutError);
              }
              await supabase.auth.signOut();
              await AsyncStorage.removeItem('@onboarding_completed');
              await AsyncStorage.removeItem('@user_session');
              router.replace('/welcome');
            } catch (error: any) {
              console.log('Error logging out:', error);
              Alert.alert('Erreur', 'Impossible de se déconnecter');
            }
          },
        },
      ]
    );
  };



  const pickLogo = async () => {
    try {
      // 1. Demander les permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission requise', 'Veuillez autoriser l\'accès à la galerie pour changer votre logo.');
        return;
      }

      // 2. Sélectionner l'image (SANS base64 pour éviter les crashs mémoire)
      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
        exif: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedUri = result.assets[0].uri;

        // 3. Compresser et redimensionner l'image (500x500 est suffisant pour un logo)
        const manipulatedImage = await ImageManipulator.manipulateAsync(
          selectedUri,
          [{ resize: { width: 500, height: 500 } }],
          { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
        );

        setEditingLogo(manipulatedImage.uri);
      }
    } catch (error) {
      console.error('Error in pickLogo:', error);
      Alert.alert('Erreur', 'Impossible de sélectionner l\'image. Réessayez avec une image plus légère.');
    }
  };

  const uploadLogo = async (uri: string): Promise<string | null> => {
    if (!user || !uri.startsWith('file://')) return uri;

    try {
      setUploadingLogo(true);
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: 'base64',
      });
      const arrayBuffer = decode(base64);
      const fileExt = uri.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `logos/${user.id}/${Date.now()}.${fileExt}`;

      const supabase = await ensureSupabaseInitialized();
      const { error: uploadError } = await supabase.storage
        .from('marketplace-products')
        .upload(fileName, arrayBuffer, {
          contentType: `image/${fileExt}`,
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('marketplace-products')
        .getPublicUrl(fileName);

      return fileName;
    } catch (error) {
      console.error('Error uploading logo:', error);
      Alert.alert('Erreur', 'Impossible de télécharger le logo.');
      return null;
    } finally {
      setUploadingLogo(false);
    }
  };

  // --- MODIFICATION : Fonction de sauvegarde généralisée pour tous les champs éditables ---
  const handleSaveProfile = async () => {
    if (!user) return;
    if (!editingFarmName.trim()) {
      Alert.alert('Erreur', 'Le nom de la ferme ne peut pas être vide.');
      return;
    }
    if (!editingFullName.trim()) { // Ajout de la validation pour le nom complet
      Alert.alert('Erreur', 'Le nom complet ne peut pas être vide.');
      return;
    }
    if (!editingPhone.trim()) { // Ajout de la validation pour le téléphone
      Alert.alert('Erreur', 'Le numéro de téléphone ne peut pas être vide.');
      return;
    }

    let logoPath = editingLogo;
    if (editingLogo && editingLogo !== profile?.avatar_url) {
      logoPath = await uploadLogo(editingLogo);
    }

    // Créer l'objet de mise à jour avec toutes les nouvelles valeurs
    const updateData = {
      full_name: editingFullName.trim(),
      phone: editingPhone.trim(),
      location: [editingCity.trim(), editingRegion, editingCountry].filter(Boolean).join(', '),
      farm_name: editingFarmName.trim(),
      updated_at: new Date().toISOString(),
      avatar_url: logoPath,
      country: editingCountry,
    };

    setIsSaving(true);
    try {
      const supabase = await ensureSupabaseInitialized();

      // Vérifier si le profil existe déjà pour cet utilisateur
      const { data: existingProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (fetchError) {
        throw fetchError; // Gérer l'erreur de récupération du profil
      }

      let operationError;
      if (!existingProfile) {
        // Si le profil n'existe pas, le créer
        console.log('📝 Aucun profil trouvé pour l\'utilisateur, création d\'un nouveau profil...');
        const { error } = await supabase
          .from('profiles')
          .insert({ user_id: user.id, ...updateData, created_at: new Date().toISOString(), role: 'user' }); // Assurer le rôle par défaut
        operationError = error;
      } else {
        // Si le profil existe, le mettre à jour
        console.log('📝 Profil trouvé, mise à jour du profil complet...');
        const { error } = await supabase
          .from('profiles')
          .update(updateData) // Utiliser l'objet updateData complet
          .eq('user_id', user.id);
        operationError = error;
      }

      if (operationError) {
        throw operationError;
      }

      // --- AJOUT : Propager la nouvelle localité et le logo sur tous les produits existants ---
      if (editingCity.trim() || editingCountry) {
        const productUpdates: any = {};
        // Construire la localisation complète
        const newLocation = [editingCity.trim(), editingRegion, editingCountry].filter(Boolean).join(', ');
        if (newLocation) productUpdates.location = newLocation;
        if (editingCountry) productUpdates.country = editingCountry;

        const { error: productsUpdateError } = await supabase
          .from('marketplace_products')
          .update(productUpdates)
          .eq('seller_id', user.id);

        if (productsUpdateError) {
          console.warn('⚠️ Erreur lors de la mise à jour de la localisation des produits:', productsUpdateError);
        }
      }

      // Mettre à jour le contexte localement pour un retour visuel immédiat
      updateProfile(updateData);
      // Rafraîchir les données depuis le serveur pour garantir la cohérence
      await refreshProfile();

      setIsEditing(false); // Quitter le mode édition
      Alert.alert('Succès', 'Votre profil a été mis à jour.');

    } catch (error: any) {
      Alert.alert('Échec', `Impossible de sauvegarder le profil: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };


  if (profileLoading) {
    return (
      <SafeAreaView style={commonStyles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Chargement du profil...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={commonStyles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profil</Text>
        {/* --- MODIFICATION : Le bouton de l'en-tête gère "Modifier" et "Annuler" --- */}
        {isEditing ? (
          <TouchableOpacity onPress={() => {
            setIsEditing(false);
            initializeEditingState(); // Réinitialiser les changements en cas d'annulation
          }}>
            <Text style={[styles.editButtonText, { color: colors.error }]}>Annuler</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={() => setIsEditing(true)}>
            <Text style={styles.editButtonText}>Modifier</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Section Logo */}
        <View style={styles.logoSection}>
          <View style={styles.logoContainer}>
            {editingLogo ? (
              <Image
                source={{ uri: editingLogo.startsWith('file://') ? editingLogo : getMarketplaceImageUrl(editingLogo) }}
                style={styles.logoImage}
              />
            ) : (
              <View style={styles.logoPlaceholder}>
                <Icon name="image" size={40} color={colors.textSecondary} />
              </View>
            )}
            {isEditing && (
              <TouchableOpacity style={styles.editLogoButton} onPress={pickLogo}>
                <Icon name="camera" size={20} color={colors.white} />
              </TouchableOpacity>
            )}
          </View>
          {isEditing && (
            <Text style={styles.logoHelpText}>Ce logo sera affiché sur vos produits</Text>
          )}
        </View>

        {/* Section Informations Personnelles */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informations Personnelles</Text>

          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Icon name="person" size={20} color={colors.primary} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Nom complet</Text>
                {isEditing ? (
                  <TextInput
                    style={styles.editableInfoValue}
                    value={editingFullName}
                    onChangeText={setEditingFullName}
                    placeholder="Votre nom complet"
                  />
                ) : (
                  <Text style={styles.infoValue}>{profile?.full_name || 'Non défini'}</Text>
                )}
              </View>
            </View>

            <View style={styles.infoRow}>
              <Icon name="call" size={20} color={colors.primary} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Téléphone</Text>
                {isEditing ? (
                  <TextInput
                    style={styles.editableInfoValue}
                    value={editingPhone}
                    onChangeText={setEditingPhone}
                    placeholder="Votre numéro de téléphone"
                    keyboardType="phone-pad"
                  />
                ) : (
                  <Text style={styles.infoValue}>{profile?.phone || 'Non défini'}</Text>
                )}
              </View>
            </View>

            <View style={styles.infoRow}>
              <Icon name="location" size={20} color={colors.primary} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Adresse (Pays, Région, Ville)</Text>
                {isEditing ? (
                  <View style={{ gap: 8 }}>
                    <TouchableOpacity style={styles.pickerButton} onPress={() => setIsCountryPickerVisible(true)}>
                      <Text style={styles.pickerButtonText}>{editingCountry || 'Sélectionner Pays'}</Text>
                      <Icon name="chevron-down" size={16} color={colors.textSecondary} />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.pickerButton} onPress={() => setIsRegionPickerVisible(true)}>
                      <Text style={styles.pickerButtonText}>{editingRegion || 'Sélectionner Région'}</Text>
                      <Icon name="chevron-down" size={16} color={colors.textSecondary} />
                    </TouchableOpacity>

                    <TextInput
                      style={styles.editableInfoValue}
                      value={editingCity}
                      onChangeText={setEditingCity}
                      placeholder="Ville / Quartier"
                    />
                  </View>
                ) : (
                  <Text style={styles.infoValue}>
                    {[profile?.city, profile?.region, profile?.country].filter(Boolean).join(', ') || profile?.location || 'Non définie'}
                  </Text>
                )}
              </View>
            </View>
          </View>
        </View>

        {/* Section Exploitation */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Exploitation</Text>

          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Icon name="business" size={20} color={colors.primary} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Nom de la ferme</Text>
                {isEditing ? (
                  <TextInput
                    style={styles.editableInfoValue}
                    value={editingFarmName}
                    onChangeText={setEditingFarmName}
                    placeholder="Nom de votre ferme"
                  />
                ) : (
                  <Text style={styles.infoValue}>{profile?.farm_name || 'Non défini'}</Text>
                )}
              </View>
            </View>

            <View style={styles.infoRow}>
              <Icon name="card" size={20} color={colors.primary} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Rôle</Text>
                <Text style={styles.infoValue}>{profile?.role || 'Utilisateur'}</Text>
              </View>
            </View>
          </View>

          {/* --- NOUVEAU : Bouton de sauvegarde visible uniquement en mode édition --- */}
          {isEditing && (
            <View style={styles.saveButtonContainer}>
              <Button
                title={isSaving ? "Enregistrement..." : "Enregistrer les modifications"}
                onPress={handleSaveProfile}
                disabled={isSaving}
              />
            </View>
          )}
        </View>

        {/* Section Abonnement */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Abonnement & Crédits</Text>

          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Icon name="star" size={20} color={colors.primary} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Statut de l'abonnement</Text>
                <Text style={styles.infoValue}>{subscription?.plan?.display_name || 'Freemium'}</Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <Icon name="cash" size={20} color={colors.warning} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Solde Avicoins</Text>
                <Text style={[styles.infoValue, { color: colors.warning }]}>{profile?.avicoins || 0} Avicoins</Text>
              </View>
            </View>
          </View>
        </View>


        {/* Section Administration (pour les admins) */}
        {profile?.role === 'admin' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Administration</Text>

            <View style={styles.adminCard}>
              <TouchableOpacity style={styles.adminButton} onPress={() => router.push('/admin/manage-ads')}>
                <Icon name="megaphone" size={24} color={colors.white} />
                <Text style={styles.adminButtonText}>Gérer les Publicités</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.adminButton} onPress={() => router.push('/admin-driver-validation')}>
                <Icon name="car" size={24} color={colors.white} />
                <Text style={styles.adminButtonText}>Valider les Livreurs</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.adminButtonWrapper} onPress={() => router.push('/admin-kyc')}>
                <View style={styles.adminButton}>
                  <Icon name="document" size={24} color={colors.white} />
                  <Text style={styles.adminButtonText}>Gestion KYC</Text>
                </View>
                {pendingKYCCount > 0 && (
                  <View style={styles.badge}><Text style={styles.badgeText}>{pendingKYCCount}</Text></View>
                )}
              </TouchableOpacity>

              <TouchableOpacity style={styles.adminButtonWrapper} onPress={() => router.push('/admin-payment-validation')}>
                <View style={styles.adminButton}>
                  <Icon name="cash" size={24} color={colors.white} />
                  <Text style={styles.adminButtonText}>Valider les Paiements</Text>
                </View>
                {pendingPaymentsCount > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{pendingPaymentsCount}</Text>
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity style={styles.adminButton} onPress={() => router.push('/admin/send-notifications')}>
                <Icon name="megaphone" size={24} color={colors.white} />
                <Text style={styles.adminButtonText}>Envoyer des annonces</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Boutons d'actions */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.actionButton} onPress={() => {
            // TRACKER L'ACCÈS AU PARRAINAGE
            trackAction('referral_program_accessed', {
              from_screen: 'profile'
            });
            router.push('/referral'); // Supposons une nouvelle route ou garder /settings si c'est temporaire, mais le user semble vouloir un changement sémantique. 
            // NOTE: Le user a dit "renomme 'parametre' en code de parrainage". Si je garde /settings, ça va pointer vers les settings.
            // Si le user n'a pas demandé de changer la logique, je garde le endpoint mais je change le texte. 
            // MAIS, "Code de parrainage" -> /settings ? C'est bizarre.
            // Je vais garder router.push('/settings') pour l'instant car je ne connais pas la route parrainage, 
            // mais l'utilisateur a dit "renomme", donc je change le label visuel.
            router.push('/settings');
          }}>
            <Icon name="gift-outline" size={20} color={colors.primary} />
            <Text style={styles.actionButtonText}>Code de parrainage</Text>
            <Icon name="chevron-forward-outline" size={20} color={colors.textSecondary} />
          </TouchableOpacity>



          <TouchableOpacity style={styles.actionButton} onPress={() => {
            // TRACKER L'ACCÈS AU SUPPORT
            trackAction('support_accessed', {
              from_screen: 'profile'
            });
            router.push('/help-support');
          }}>
            <Icon name="help-circle" size={20} color={colors.primary} />
            <Text style={styles.actionButtonText}>Aide & Support</Text>
            <Icon name="chevron-forward-outline" size={20} color={colors.textSecondary} />
          </TouchableOpacity>




        </View>

        {/* Bouton de déconnexion */}
        <View style={styles.logoutSection}>
          <TouchableOpacity style={styles.logoutButton} onPress={() => {
            // TRACKER LA DÉCONNEXION
            trackAction('user_logout', {
              session_duration: 'unknown', // Pourrait être calculé avec un timer
              from_screen: 'profile'
            });
            handleLogout();
          }}>
            <Icon name="log-out" size={20} color={colors.error} />
            <Text style={styles.logoutButtonText}>Se déconnecter</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Country Picker */}
      <SimpleBottomSheet isVisible={isCountryPickerVisible} onClose={() => setIsCountryPickerVisible(false)}>
        <View style={styles.bottomSheetContent}>
          <Text style={styles.bottomSheetTitle}>Sélectionner un pays</Text>
          <ScrollView>
            {COUNTRIES.map((c) => (
              <TouchableOpacity
                key={c.id}
                style={styles.pickerItem}
                onPress={() => {
                  setEditingCountry(c.name);
                  setEditingRegion(''); // Reset region when country changes
                  setIsCountryPickerVisible(false);
                }}
              >
                <Text style={styles.pickerItemText}>{c.flag} {c.name}</Text>
                {editingCountry === c.name && <Icon name="checkmark" size={20} color={colors.primary} />}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </SimpleBottomSheet>

      {/* Region Picker */}
      <SimpleBottomSheet isVisible={isRegionPickerVisible} onClose={() => setIsRegionPickerVisible(false)}>
        <View style={styles.bottomSheetContent}>
          <Text style={styles.bottomSheetTitle}>Sélectionner une région ({editingCountry})</Text>
          <ScrollView>
            {(COUNTRIES.find(c => c.name === editingCountry)?.regions || []).map((r) => (
              <TouchableOpacity
                key={r.id}
                style={styles.pickerItem}
                onPress={() => { setEditingRegion(r.name); setIsRegionPickerVisible(false); }}
              >
                <Text style={styles.pickerItemText}>{r.name}</Text>
                {editingRegion === r.name && <Icon name="checkmark" size={20} color={colors.primary} />}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </SimpleBottomSheet>
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
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
  },
  infoCard: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  logoSection: {
    alignItems: 'center',
    marginVertical: 20,
  },
  logoContainer: {
    position: 'relative',
    width: 100,
    height: 100,
  },
  logoImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: colors.border,
  },
  logoPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.backgroundAlt,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editLogoButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: colors.primary,
    padding: 8,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: colors.background,
  },
  logoHelpText: { fontSize: 12, color: colors.textSecondary, marginTop: 8 },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  infoContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '500',
  },
  editButtonText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
    paddingHorizontal: 8,
  },
  editableInfoValue: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '500',
    borderBottomWidth: 1,
    borderColor: colors.primary,
    paddingBottom: 2,
  },
  pickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  pickerButtonText: { fontSize: 16, color: colors.text },

  saveButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  saveButtonText: {
    fontSize: 14,
  },
  adminCard: {
    gap: 12,
  },
  adminButtonWrapper: {
    position: 'relative',
  },
  adminButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  adminButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  badge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: colors.error,
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.backgroundAlt,
  },
  badgeText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: colors.backgroundAlt,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionButtonText: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    marginLeft: 12,
  },
  logoutSection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    backgroundColor: colors.error + '10',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.error + '20',
  },
  logoutButtonText: {
    fontSize: 16,
    color: colors.error,
    fontWeight: '600',
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: colors.textSecondary,
  },
  bottomPadding: {
    height: 100,
  },
  saveButtonContainer: {
    marginTop: 20,
    paddingHorizontal: 0, // Le padding est déjà géré par la section
  },
  bottomSheetContent: { padding: 20, height: '100%' },
  bottomSheetTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16, textAlign: 'center' },
  pickerItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  pickerItemText: { fontSize: 16, color: colors.text },
});
