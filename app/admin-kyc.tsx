
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, Image, TextInput, RefreshControl, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../styles/commonStyles';
import Icon from '../components/Icon';
import Button from '../components/Button';
import { router } from 'expo-router';
import { ensureSupabaseInitialized } from '../config';
import SimpleBottomSheet from '../components/BottomSheet';
// import ImageViewing from 'react-native-image-viewing';

interface KYCVerification {
  id: string;
  user_id: string;
  real_photo_url?: string;
  id_photo_url?: string;
  verification_status: 'pending' | 'approved' | 'rejected';
  rejection_reason?: string | null;
  submitted_at: string;
  reviewed_at?: string | null;
  reviewed_by?: string | null;
  full_name?: string | null;
  phone?: string | null;
  location?: string | null;
  email?: string | null;
  verification_type?: 'seller' | 'deliver'; // Correction: 'deliver' au lieu de 'driver'
  notes?: string; // Pour les données supplémentaires des livreurs

  // Champs spécifiques aux livreurs
  date_of_birth?: string;
  phone_number?: string;
  profile_photo_url?: string;
  id_document_url?: string;
  selfie_with_id_url?: string;
  full_address?: string;
  vehicle_type?: string;
  license_plate?: string;
  vehicle_photo_url?: string;
  insurance_document_url?: string;
  delivery_zones?: string[];
  availability?: string[];
  accepted_delivery_types?: string[];
  payment_method?: string;
  payment_account?: string;
  payment_proof_url?: string;
}

export default function AdminKYCScreen() {
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [verifications, setVerifications] = useState<KYCVerification[]>([]);
  const [filteredVerifications, setFilteredVerifications] = useState<KYCVerification[]>([]);
  const [selectedVerification, setSelectedVerification] = useState<KYCVerification | null>(null);
  const [showDetailSheet, setShowDetailSheet] = useState(false);
  const [showRejectSheet, setShowRejectSheet] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [accessDeniedReason, setAccessDeniedReason] = useState('');
  // const [isImageViewerVisible, setImageViewerVisible] = useState(false);
  // const [viewerImages, setViewerImages] = useState<{ uri: string }[]>([]);

  // const openImageViewer = (urls: string[]) => {
  //  setViewerImages(urls.map(uri => ({ uri })));
  //  setImageViewerVisible(true);
  //  };

  useEffect(() => {
    checkAdminAccess();
  }, []);

  useEffect(() => {
    if (isAdmin) {
      loadVerifications();
    }
  }, [isAdmin]);

  useEffect(() => {
    applyFilters();
  }, [verifications, filterStatus, searchQuery]);

  const checkAdminAccess = async () => {
    try {
      console.log('🔐 Checking admin access...');
      const supabase = await ensureSupabaseInitialized();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        console.log('❌ No user found');
        setAccessDeniedReason('not_logged_in');
        Alert.alert('Erreur', 'Vous devez être connecté', [
          { text: 'OK', onPress: () => router.back() }
        ]);
        return;
      }

      console.log('✅ User found:', user.email);
      setUserEmail(user.email || '');

      // Vérifier si l'utilisateur est admin
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role, full_name')
        .eq('user_id', user.id)
        .maybeSingle();

      console.log('📋 Profile data:', profile);
      console.log('📋 Profile error:', error);

      if (error) {
        console.error('❌ Error fetching profile:', error);
        setAccessDeniedReason('profile_error');
        Alert.alert(
          'Erreur',
          'Impossible de charger votre profil. Veuillez réessayer.',
          [{ text: 'OK', onPress: () => router.back() }]
        );
        return;
      }

      if (!profile) {
        console.log('❌ No profile found');
        setAccessDeniedReason('no_profile');
        Alert.alert(
          'Erreur',
          'Profil introuvable. Veuillez vous reconnecter.',
          [{ text: 'OK', onPress: () => router.back() }]
        );
        return;
      }

      if (profile.role !== 'admin') {
        console.log('❌ User is not admin. Role:', profile.role);
        setAccessDeniedReason('not_admin');
        Alert.alert(
          'Accès refusé',
          `Vous n'avez pas les permissions nécessaires pour accéder à cette page.\n\nVotre rôle actuel : ${profile.role || 'user'}\n\nPour devenir administrateur, consultez le fichier MAKE_ADMIN_GUIDE.md`,
          [{ text: 'OK', onPress: () => router.back() }]
        );
        return;
      }

      console.log('✅ Admin access granted');
      setIsAdmin(true);
    } catch (error: any) {
      console.error('❌ Exception in checkAdminAccess:', error);
      setAccessDeniedReason('exception');
      Alert.alert('Erreur', 'Une erreur est survenue lors de la vérification des permissions');
      router.back();
    } finally {
      setIsLoading(false);
    }
  };

  const loadVerifications = async () => {
    try {
      console.log('📥 Loading KYC verifications...');
      setIsLoading(true);
      const supabase = await ensureSupabaseInitialized();

      // Charger les vérifications vendeurs d'abord
      const sellerResult = await supabase.rpc('get_admin_kyc_verifications');

      if (sellerResult.error) {
        console.error('❌ Error loading seller verifications:', sellerResult.error);
        throw sellerResult.error;
      }

      // Puis charger les vérifications livreurs
      const livreurResult = await supabase
        .from('livreur_verifications')
        .select('*')
        .order('submitted_at', { ascending: false });

      if (livreurResult.error) {
        console.error('❌ Error loading livreur verifications:', livreurResult.error);
        throw livreurResult.error;
      }

      if (sellerResult.error) {
        console.error('❌ Error loading seller verifications:', sellerResult.error);
        throw sellerResult.error;
      }

      if (livreurResult.error) {
        console.error('❌ Error loading livreur verifications:', livreurResult.error);
        throw livreurResult.error;
      }

      const supabaseClient = await ensureSupabaseInitialized();
      const getPublicUrl = (bucket: string, path: string | null) => {
        if (!path) return null;
        const { data } = supabaseClient.storage.from(bucket).getPublicUrl(path);
        return data?.publicUrl || null;
      };

      // Combiner les résultats
      const allVerifications = [
        ...(sellerResult.data || []).map(v => ({ ...v, verification_type: 'seller' })),
        ...(livreurResult.data || []).map(v => ({ ...v, verification_type: 'deliver' }))
      ];

      console.log(`✅ Loaded ${allVerifications.length} verifications (${sellerResult.data?.length || 0} sellers, ${livreurResult.data?.length || 0} livreurs)`);
      setVerifications(allVerifications);

      // Transformer les URLs des images
      const transformedVerifications = allVerifications.map(v => ({
        ...v,
        // Seller specific photos
        real_photo_url: v.verification_type === 'seller' ? getPublicUrl('kyc-photos', v.real_photo_url) : null,
        id_photo_url: v.verification_type === 'seller' ? getPublicUrl('kyc-photos', v.id_photo_url) : null,
        // Deliverer specific photos
        profile_photo_url: v.verification_type === 'deliver' ? getPublicUrl('deliver_kyc', v.profile_photo_url) : null,
        id_document_url: v.verification_type === 'deliver' ? getPublicUrl('deliver_kyc', v.id_document_url) : null,
        selfie_with_id_url: v.verification_type === 'deliver' ? getPublicUrl('deliver_kyc', v.selfie_with_id_url) : null,
        vehicle_photo_url: v.verification_type === 'deliver' ? getPublicUrl('deliver_kyc', v.vehicle_photo_url) : null,
        insurance_document_url: v.verification_type === 'deliver' ? getPublicUrl('deliver_kyc', v.insurance_document_url) : null,
        payment_proof_url: v.verification_type === 'deliver' ? getPublicUrl('deliver_kyc', v.payment_proof_url) : null,
      }));
      setVerifications(transformedVerifications);
    } catch (error: any) {
      console.error('❌ Exception in loadVerifications:', error);
      Alert.alert('Erreur', `Impossible de charger les vérifications: ${error.message}`);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadVerifications();
  };

  const applyFilters = () => {
    let filtered = verifications;

    // 1. Filter by status
    if (filterStatus !== 'all') {
      filtered = filtered.filter(v => v.verification_status === filterStatus);
    }

    // 2. Filter by search query
    if (searchQuery.trim()) {
      const lowercasedQuery = searchQuery.toLowerCase();
      filtered = filtered.filter(v =>
        (v.full_name && v.full_name.toLowerCase().includes(lowercasedQuery)) ||
        (v.email && v.email.toLowerCase().includes(lowercasedQuery))
      );
    }

    setFilteredVerifications(filtered);
  };

  const handleVerificationPress = (verification: KYCVerification) => {
    setSelectedVerification(verification);
    setShowDetailSheet(true);
  };

  const handleApprove = async () => {
    if (!selectedVerification) return;

    Alert.alert(
      'Approuver la vérification',
      `Êtes-vous sûr de vouloir approuver la vérification de ${selectedVerification.full_name || selectedVerification.email}?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Approuver',
          style: 'default',
          onPress: async () => {
            try {
              setIsProcessing(true);
              console.log('✅ Approving verification:', selectedVerification.id);
              const supabase = await ensureSupabaseInitialized();
              const { data: { user } } = await supabase.auth.getUser();

              if (!user) {
                Alert.alert('Erreur', 'Session expirée');
                return;
              }

              // Mettre à jour selon le type de vérification
              if (selectedVerification.verification_type === 'deliver') {
                // Pour les livreurs, mettre à jour livreur_verifications
                const { error: updateError } = await supabase
                  .from('livreur_verifications')
                  .update({
                    verification_status: 'approved',
                    reviewed_at: new Date().toISOString(),
                    reviewed_by: user.id,
                    rejection_reason: null,
                  })
                  .eq('id', selectedVerification.id);

                if (updateError) throw updateError;

                // La table 'delivery_drivers' n'est pas utilisée. L'approbation dans 'livreur_verifications' est suffisante.
              } else {
                // Pour les vendeurs, mettre à jour seller_verifications
                const { error: sellerError } = await supabase
                  .from('seller_verifications')
                  .update({
                    verification_status: 'approved',
                    reviewed_at: new Date().toISOString(),
                    reviewed_by: user.id,
                    rejection_reason: null,
                  })
                  .eq('id', selectedVerification.id);

                if (sellerError) throw sellerError;

                // Mettre à jour le profil
                const { error: profileError } = await supabase
                  .from('profiles')
                  .update({ seller_verified: true })
                  .eq('user_id', selectedVerification.user_id);

                if (profileError) throw profileError;
              }

              console.log('✅ Verification approved successfully');
              Alert.alert('Succès', 'Vérification approuvée avec succès');
              setShowDetailSheet(false);
              loadVerifications();
            } catch (error: any) {
              console.error('❌ Error approving verification:', error);
              Alert.alert('Erreur', 'Impossible d\'approuver la vérification');
            } finally {
              setIsProcessing(false);
            }
          },
        },
      ]
    );
  };

  const handleReject = () => {
    setShowDetailSheet(false);
    setShowRejectSheet(true);
  };

  const handleConfirmReject = async () => {
    if (!selectedVerification) return;

    if (!rejectionReason.trim()) {
      Alert.alert('Erreur', 'Veuillez fournir une raison de rejet');
      return;
    }

    try {
      setIsProcessing(true);
      console.log('❌ Rejecting verification:', selectedVerification.id);
      const supabase = await ensureSupabaseInitialized();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        Alert.alert('Erreur', 'Session expirée');
        return;
      }

      // Mettre à jour selon le type de vérification
      if (selectedVerification.verification_type === 'deliver') {
        // Pour les livreurs
        const { error: updateError } = await supabase
          .from('livreur_verifications')
          .update({
            verification_status: 'rejected',
            reviewed_at: new Date().toISOString(),
            reviewed_by: user.id,
            rejection_reason: rejectionReason.trim(),
          })
          .eq('id', selectedVerification.id);

        if (updateError) throw updateError;
      } else {
        // Pour les vendeurs
        const { error: updateError } = await supabase
          .from('seller_verifications')
          .update({
            verification_status: 'rejected',
            reviewed_at: new Date().toISOString(),
            reviewed_by: user.id,
            rejection_reason: rejectionReason.trim(),
          })
          .eq('id', selectedVerification.id);

        if (updateError) throw updateError;

        // Mettre à jour le profil pour marquer le vendeur comme non vérifié
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ seller_verified: false })
          .eq('user_id', selectedVerification.user_id);

        if (profileError) throw profileError;
      }

      console.log('✅ Verification rejected successfully');
      Alert.alert('Succès', 'Vérification rejetée avec succès');
      setShowRejectSheet(false);
      setRejectionReason('');
      loadVerifications();
    } catch (error: any) {
      console.error('❌ Error rejecting verification:', error);
      Alert.alert('Erreur', 'Impossible de rejeter la vérification');
    } finally {
      setIsProcessing(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return colors.warning;
      case 'approved':
        return colors.success;
      case 'rejected':
        return colors.error;
      default:
        return colors.textSecondary;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return 'time';
      case 'approved':
        return 'checkmark-circle';
      case 'rejected':
        return 'close-circle';
      default:
        return 'help-circle';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return 'En attente';
      case 'approved':
        return 'Approuvé';
      case 'rejected':
        return 'Rejeté';
      default:
        return status;
    }
  };

  const renderVerificationCard = (verification: KYCVerification) => {
    const isDriverVerification = verification.verification_type === 'deliver';
    const name = verification.full_name || 'Nom non fourni';
    const email = verification.email || 'Email non fourni';
    const phone = isDriverVerification ? verification.phone_number : verification.phone;
    const location = isDriverVerification ? verification.full_address : verification.location;
    return (
      <TouchableOpacity
        key={verification.id}
        style={styles.card}
        onPress={() => handleVerificationPress(verification)}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
              {name.charAt(0)?.toUpperCase()}
              </Text>
            </View>
            <View style={styles.cardHeaderInfo}>
              <Text style={styles.cardName}>
              {name}
              </Text>
              <Text style={styles.cardEmail}>
              {email}
                {isDriverVerification && ' 🚗 (Livreur)'}
              </Text>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(verification.verification_status) + '20' }]}>
            <Icon name={getStatusIcon(verification.verification_status)} size={16} color={getStatusColor(verification.verification_status)} />
            <Text style={[styles.statusText, { color: getStatusColor(verification.verification_status) }]}>
              {getStatusLabel(verification.verification_status)}
            </Text>
          </View>
        </View>

        <View style={styles.cardInfo}>
          <View style={styles.infoRow}>
            <Icon name="call" size={16} color={colors.textSecondary} />
            <Text style={styles.infoText}>{phone || 'Non fourni'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Icon name="location" size={16} color={colors.textSecondary} />
            <Text style={styles.infoText}>{location || 'Non fourni'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Icon name="calendar" size={16} color={colors.textSecondary} />
            <Text style={styles.infoText}>Soumis le {formatDate(verification.submitted_at)}</Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <View style={styles.photoPreviewContainer}>
            {isDriverVerification ? (
              <View style={styles.photoPreviewItem}>
                <Image source={{ uri: verification.profile_photo_url }} style={styles.photoPreview} />
                <Text style={styles.photoPreviewLabel}>Profil</Text>
              </View>
            ) : (
              <View style={styles.photoPreviewItem}>
                <Image source={{ uri: verification.real_photo_url }} style={styles.photoPreview} />
                <Text style={styles.photoPreviewLabel}>Photo réelle</Text>
              </View>
            )}
            <View style={styles.photoPreviewItem}>
              <Image source={{ uri: isDriverVerification ? verification.id_document_url : verification.id_photo_url }} style={styles.photoPreview} />
              <Text style={styles.photoPreviewLabel}>Pièce d'identité</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderDetailSheet = () => {
    if (!selectedVerification) return null;
    const isDriver = selectedVerification.verification_type === 'deliver';
    const name = selectedVerification.full_name || 'Nom non fourni';
    const email = selectedVerification.email || 'Email non fourni';
    const phone = isDriver ? selectedVerification.phone_number : selectedVerification.phone;
    const location = isDriver ? selectedVerification.full_address : selectedVerification.location;

    return (
      <SimpleBottomSheet
        isVisible={showDetailSheet}
        onClose={() => setShowDetailSheet(false)}
        snapPoints={['95%']}
      >
        <ScrollView style={styles.detailContainer} showsVerticalScrollIndicator={false}>
          <View style={styles.detailHeader}>
            <Text style={styles.detailTitle} numberOfLines={1} ellipsizeMode="tail">{name}</Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedVerification.verification_status) + '20' }]}>
              <Icon name={getStatusIcon(selectedVerification.verification_status)} size={20} color={getStatusColor(selectedVerification.verification_status)} />
              <Text style={[styles.statusText, { color: getStatusColor(selectedVerification.verification_status) }]}>
                {getStatusLabel(selectedVerification.verification_status)}
              </Text>
            </View>
          </View>

          {selectedVerification.verification_status === 'pending' && (
            <View style={styles.actionButtonsTop}>
              <Button
                text="✅ Approuver"
                onPress={handleApprove}
                disabled={isProcessing}
                style={{ flex: 1, backgroundColor: colors.success }}
              />
              <Button
                text="❌ Rejeter"
                onPress={handleReject}
                disabled={isProcessing}
                style={{ flex: 1, backgroundColor: colors.error }}
              />
            </View>
          )}

          <View style={styles.detailSection}>
            <Text style={styles.detailSectionTitle}>Informations {isDriver ? 'du Livreur' : 'du Vendeur'}</Text>
            <View style={styles.detailInfoCard}>
              <View style={styles.detailInfoRow}>
                <Text style={styles.detailInfoLabel}>Nom complet:</Text>
                <Text style={styles.detailInfoValue}>{name}</Text>
              </View>
              <View style={styles.detailInfoRow}>
                <Text style={styles.detailInfoLabel}>Email:</Text>
                <Text style={styles.detailInfoValue}>{email}</Text>
              </View>
              <View style={styles.detailInfoRow}>
                <Text style={styles.detailInfoLabel}>Téléphone:</Text>
                <Text style={styles.detailInfoValue}>{phone || 'Non fourni'}</Text>
              </View>
              <View style={styles.detailInfoRow}>
                <Text style={styles.detailInfoLabel}>Localisation:</Text>
                <Text style={styles.detailInfoValue}>{location || 'Non fourni'}</Text>
              </View>
              <View style={styles.detailInfoRow}>
                <Text style={styles.detailInfoLabel}>Date de soumission:</Text>
                <Text style={styles.detailInfoValue}>{formatDate(selectedVerification.submitted_at)}</Text>
              </View>
              {selectedVerification.reviewed_at && (
                <View style={styles.detailInfoRow}>
                  <Text style={styles.detailInfoLabel}>Date de révision:</Text>
                  <Text style={styles.detailInfoValue}>{formatDate(selectedVerification.reviewed_at)}</Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.detailSection}>
            <Text style={styles.detailSectionTitle}>
              Documents {selectedVerification.verification_type === 'deliver' ? 'Livreur' : 'KYC'}
            </Text>

            {isDriver ? (
              <View style={styles.documentsGrid}>
                {[
                  { label: 'Photo Profil', url: selectedVerification.profile_photo_url },
                  { label: 'Pièce d\'identité', url: selectedVerification.id_document_url },
                  { label: 'Selfie avec ID', url: selectedVerification.selfie_with_id_url },
                  { label: 'Photo Véhicule', url: selectedVerification.vehicle_photo_url },
                  { label: 'Assurance', url: selectedVerification.insurance_document_url },
                  { label: 'Preuve Paiement', url: selectedVerification.payment_proof_url },
                ].map((doc, index) => (
                  <View key={index} style={styles.documentItem}>
                    <TouchableOpacity onPress={() => {}} disabled={!doc.url}>
                      {doc.url ? (
                        <Image source={{ uri: doc.url }} style={styles.documentImage} />
                      ) : (
                        <View style={[styles.documentImage, styles.photoDetailPlaceholder]}>
                          <Text style={styles.photoPlaceholderText}>Non fourni</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                    <Text style={styles.documentLabel}>{doc.label}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <>
                <View style={styles.photoDetailContainer}>
                  <Text style={styles.photoDetailLabel}>Photo réelle (Selfie)</Text>
                  <TouchableOpacity onPress={() => {}} disabled={!selectedVerification.real_photo_url}>
                    {selectedVerification.real_photo_url ? (
                      <Image source={{ uri: selectedVerification.real_photo_url }} style={styles.photoDetail} />
                    ) : (
                      <View style={[styles.photoDetail, styles.photoDetailPlaceholder]}><Text style={styles.photoPlaceholderText}>Non fournie</Text></View>
                    )}
                  </TouchableOpacity>
                </View>

                <View style={styles.photoDetailContainer}>
                  <Text style={styles.photoDetailLabel}>Pièce d&apos;identité (CNI)</Text>
                  <TouchableOpacity onPress={() => {}} disabled={!selectedVerification.id_photo_url}>
                    {selectedVerification.id_photo_url ? (
                      <Image source={{ uri: selectedVerification.id_photo_url }} style={styles.photoDetail} />
                    ) : (
                      <View style={[styles.photoDetail, styles.photoDetailPlaceholder]}><Text style={styles.photoPlaceholderText}>Non fournie</Text></View>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>

          {selectedVerification.verification_status === 'rejected' && selectedVerification.rejection_reason && (
            <View style={styles.detailSection}>
              <Text style={styles.detailSectionTitle}>Raison du rejet</Text>
              <View style={styles.rejectionReasonCard}>
                <Icon name="alert-circle-outline" size={24} color={colors.error} />
                <Text style={styles.rejectionReasonText}>
                  {selectedVerification.rejection_reason}
                </Text>
              </View>
            </View>
          )}

        </ScrollView>
      </SimpleBottomSheet>
    );
  };

  const renderRejectSheet = () => {
    return (
      <SimpleBottomSheet
        isVisible={showRejectSheet}
        onClose={() => {
          setShowRejectSheet(false);
          setRejectionReason('');
        }}
        snapPoints={['50%']}
      >
        <View style={styles.rejectContainer}>
          <Text style={styles.rejectTitle}>Rejeter la vérification</Text>
          <Text style={styles.rejectSubtitle}>
            Veuillez fournir une raison claire pour le rejet. L&apos;utilisateur recevra cette information.
          </Text>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Raison du rejet *</Text>
            <TextInput
              style={styles.textArea}
              value={rejectionReason}
              onChangeText={setRejectionReason}
              placeholder="Ex: Documents illisibles, informations incohérentes, etc."
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.actionButtons}>
            <Button
              text="Annuler"
              onPress={() => {
                setShowRejectSheet(false);
                setRejectionReason('');
              }}
              disabled={isProcessing}
              style={{ flex: 1, backgroundColor: colors.backgroundAlt }}
            />
            <Button
              text={isProcessing ? 'Traitement...' : 'Confirmer le rejet'}
              onPress={handleConfirmReject}
              disabled={isProcessing || !rejectionReason.trim()}
              style={{ flex: 1, backgroundColor: colors.error }}
            />
          </View>
        </View>
      </SimpleBottomSheet>
    );
  };

  const renderAccessDenied = () => {
    return (
      <SafeAreaView style={styles.accessDeniedContainer}>
        <Icon name="shield-checkmark-outline" size={80} color={colors.error} />
        <Text style={styles.accessDeniedTitle}>Accès Refusé</Text>
        <Text style={styles.accessDeniedText}>
          Vous n&apos;avez pas les permissions nécessaires pour accéder à cette page.
        </Text>
        
        {userEmail && (
          <View style={styles.infoCard}>
            <Text style={styles.infoCardLabel}>Compte connecté :</Text>
            <Text style={styles.infoCardValue}>{userEmail}</Text>
          </View>
        )}

        <View style={styles.instructionsCard}>
          <Text style={styles.instructionsTitle}>📋 Pour devenir administrateur :</Text>
          <Text style={styles.instructionsText}>
            1. Ouvrez le tableau de bord Supabase{'\n'}
            2. Allez dans SQL Editor{'\n'}
            3. Exécutez la requête suivante :{'\n'}
          </Text>
          <View style={styles.codeBlock}>
            <Text style={styles.codeText}>
              UPDATE profiles{'\n'}
              SET role = &apos;admin&apos;{'\n'}
              WHERE user_id = ({'\n'}
              {'  '}SELECT id FROM auth.users{'\n'}
              {'  '}WHERE email = &apos;{userEmail || 'votre-email'}&apos;{'\n'}
              );
            </Text>
          </View>
          <Text style={styles.instructionsText}>
            {'\n'}4. Déconnectez-vous et reconnectez-vous{'\n'}
            5. Revenez sur cette page
          </Text>
        </View>

        <Button
          text="← Retour au profil"
          onPress={() => router.back()}
          style={{ marginTop: 20 }}
        />
      </SafeAreaView>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Vérification des permissions...</Text>
      </SafeAreaView>
    );
  }

  if (!isAdmin) {
    return renderAccessDenied();
  }

  const filters: { key: typeof filterStatus; label: string; count: number }[] = [
    { key: 'all', label: 'Tous', count: verifications.length },
    { key: 'pending', label: 'En attente', count: verifications.filter(v => v.verification_status === 'pending').length },
    { key: 'approved', label: 'Approuvés', count: verifications.filter(v => v.verification_status === 'approved').length },
    { key: 'rejected', label: 'Rejetés', count: verifications.filter(v => v.verification_status === 'rejected').length },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Icon name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Validation KYC</Text>
        <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh}>
          <Icon name="refresh" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{verifications.filter(v => v.verification_status === 'pending').length}</Text>
          <Text style={styles.statLabel}>En attente</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: colors.success }]}>
            {verifications.filter(v => v.verification_status === 'approved').length}
          </Text>
          <Text style={styles.statLabel}>Approuvés</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: colors.error }]}>
            {verifications.filter(v => v.verification_status === 'rejected').length}
          </Text>
          <Text style={styles.statLabel}>Rejetés</Text>
        </View>
      </View>

      <View style={styles.filterContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterContent}
        >
          {filters.map((filter) => (
            <TouchableOpacity
              key={filter.key}
              style={[
                styles.filterButton,
                filterStatus === filter.key && styles.filterButtonActive,
              ]}
              onPress={() => setFilterStatus(filter.key)}
            >
              <Icon 
                name={filter.key === 'all' ? 'list' : filter.key === 'pending' ? 'time' : filter.key === 'approved' ? 'checkmark-circle' : 'close-circle'} 
                size={16} 
                color={filterStatus === filter.key ? colors.white : colors.textSecondary} 
              />
              <Text style={[
                styles.filterButtonText,
                filterStatus === filter.key && styles.filterButtonTextActive,
              ]}>
                {filter.label} ({filter.count})
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {filteredVerifications.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Icon name="document-text" size={64} color={colors.textSecondary} />
            <Text style={styles.emptyTitle}>Aucune vérification</Text>
            <Text style={styles.emptyText}>
              {filterStatus === 'all'
                ? 'Aucune demande de vérification pour le moment'
                : `Aucune vérification ${getStatusLabel(filterStatus).toLowerCase()}`}
            </Text>
          </View>
        ) : (
          filteredVerifications.map(renderVerificationCard)
        )}
      </ScrollView>

      {renderDetailSheet()}
      {renderRejectSheet()}

      {/* {{viewerImages.length > 0 && (
        <ImageViewing
          images={viewerImages}
          imageIndex={0}
          visible={isImageViewerVisible}
          onRequestClose={() => setImageViewerVisible(false)}
          FooterComponent={({ imageIndex }) => (
            <View style={styles.imageViewerFooter}>
              <Text style={styles.imageViewerFooterText}>
                {imageIndex + 1} / {viewerImages.length}
              </Text>
            </View>
          )}
        />
      )} } */}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  accessDeniedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: 20,
  },
  accessDeniedTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginTop: 20,
    marginBottom: 10,
  },
  accessDeniedText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  infoCard: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 12,
    padding: 16,
    width: '100%',
    marginBottom: 20,
  },
  infoCardLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 4,
  },
  infoCardValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  instructionsCard: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 12,
    padding: 20,
    width: '100%',
    borderWidth: 2,
    borderColor: colors.primary + '40',
  },
  instructionsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  instructionsText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 22,
  },
  codeBlock: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 12,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  codeText: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: colors.primary,
    lineHeight: 18,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
    textAlign: 'center',
  },
  refreshButton: {
    padding: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 8,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.backgroundAlt,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  filterContainer: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundAlt,
    borderRadius: 12,
    paddingHorizontal: 16,
    marginHorizontal: 20,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    height: 48,
    fontSize: 16,
    color: colors.text,
    marginLeft: 10,
  },
  filterContent: {
    gap: 8,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.backgroundAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  filterButtonTextActive: {
    color: colors.white,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 100, // Espace pour le contenu en bas
    gap: 12,
  },
  card: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
  },
  cardHeaderInfo: {
    flex: 1,
  },
  cardName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  cardEmail: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardInfo: {
    gap: 6,
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    fontSize: 14,
    color: colors.text,
  },
  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 8,
  },
  photoPreviewContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  photoPreviewItem: {
    flex: 1,
    alignItems: 'center',
  },
  photoPreview: {
    width: '100%',
    height: 80,
    borderRadius: 8,
    marginBottom: 6,
  },
  photoPreviewLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  photoPlaceholder: {
    backgroundColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoPlaceholderText: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  photoDetailPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  detailContainer: {
    flex: 1,
    padding: 20,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  detailTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  detailSection: {
    marginBottom: 24,
  },
  detailSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  detailInfoCard: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  detailInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailInfoLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  detailInfoValue: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },
  photoDetailContainer: {
    marginBottom: 16,
  },
  photoDetailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  photoDetail: {
    width: '100%',
    height: 300,
    borderRadius: 12,
  },
  rejectionReasonCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: colors.error + '20',
    borderRadius: 12,
    padding: 16,
  },
  rejectionReasonText: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  rejectContainer: {
    padding: 20,
  },
  rejectTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  rejectSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 24,
    lineHeight: 20,
  },
  formGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  textArea: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 120,
  },
  documentsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  documentItem: {
    width: (Dimensions.get('window').width - 40 - 24) / 3, // 3 items per row with gap
    alignItems: 'center',
  },
  documentImage: {
    width: '100%',
    height: 100,
    borderRadius: 8,
    backgroundColor: colors.border,
  },
  documentLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 6,
    textAlign: 'center',
  },
  imageViewerFooter: {
    height: 80,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
