import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity, Image, ActivityIndicator, RefreshControl, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ensureSupabaseInitialized } from '../integrations/supabase/client';
import { colors, commonStyles } from '../../styles/commonStyles';
import Icon from '../../components/Icon';
import Button from '../../components/Button';

type Verification = {
  id: string;
  user_id: string;
  full_name: string;
  phone_number: string;
  location: string;
  email: string;
  verification_status: 'pending' | 'approved' | 'rejected';
  submitted_at: string;
  profile_photo_url: string;
  id_document_url: string;
  selfie_with_id_url: string;
  vehicle_photo_url: string;
  insurance_document_url: string;
};

export default function DriverVerificationsAdmin() {
  const [verifications, setVerifications] = useState<Verification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedVerification, setSelectedVerification] = useState<Verification | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);

  const fetchVerifications = useCallback(async () => {
    try {
      const supabase = await ensureSupabaseInitialized();
      const { data, error } = await supabase
        .from('admin_driver_verifications_view')
        .select('*')
        .order('submitted_at', { ascending: false });

      if (error) throw error;

      // Construire les URL publiques pour les images
      const verificationsWithUrls = data.map(v => {
        const getPublicUrl = (path: string | null) => {
          if (!path) return null;
          return supabase.storage.from('deliver_kyc').getPublicUrl(path).data.publicUrl;
        };

        return {
          ...v,
          profile_photo_url: getPublicUrl(v.profile_photo_url),
          id_document_url: getPublicUrl(v.id_document_url),
          selfie_with_id_url: getPublicUrl(v.selfie_with_id_url),
          vehicle_photo_url: getPublicUrl(v.vehicle_photo_url),
          insurance_document_url: getPublicUrl(v.insurance_document_url),
        };
      });

      console.log('🖼️ Vérifications avec URL publiques construites:', JSON.stringify(verificationsWithUrls, null, 2));

      setVerifications(verificationsWithUrls);
    } catch (error: any) {
      console.error('❌ Error fetching driver verifications:', error);
      Alert.alert('Erreur', 'Impossible de charger les vérifications des livreurs.');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchVerifications();
  }, [fetchVerifications]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchVerifications();
  };

  const handleUpdateStatus = async (verification: Verification, newStatus: 'approved' | 'rejected') => {
    try {
      const supabase = await ensureSupabaseInitialized();
      
      // 1. Mettre à jour le statut de la vérification
      const { error: updateError } = await supabase
        .from('livreur_verifications')
        .update({
          verification_status: newStatus,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', verification.id);

      if (updateError) throw updateError;

      // 2. Si approuvé, créer ou mettre à jour l'entrée dans delivery_drivers
      if (newStatus === 'approved') {
        const { error: upsertError } = await supabase
          .from('delivery_drivers')
          .upsert({
            user_id: verification.user_id,
            verification_status: 'approved',
            is_active: true,
          }, {
            onConflict: 'user_id', // La contrainte unique est sur user_id
          });

        if (upsertError) {
          throw upsertError;
        }
      }

      Alert.alert('Succès', `La demande a été ${newStatus === 'approved' ? 'approuvée' : 'rejetée'}.`);
      setIsModalVisible(false);
      onRefresh();
    } catch (error: any) {
      console.error("❌ Erreur lors de la mise à jour du statut du livreur:", error);
      Alert.alert('Erreur', `Impossible de mettre à jour le statut: ${error.message}`);
    }
  };

  const openDetailsModal = (verification: Verification) => {
    setSelectedVerification(verification);
    setIsModalVisible(true);
  };

  const renderImage = (url: string | null, title: string) => (
    <View style={styles.imageContainer}>
      <Text style={styles.imageTitle}>{title}</Text>
      {url ? (
        <Image source={{ uri: url }} style={styles.image} resizeMode="contain" />
      ) : (
        <View style={styles.imagePlaceholder}>
          <Icon name="image-outline" size={48} color={colors.textSecondary} />
          <Text style={styles.imagePlaceholderText}>Non fournie</Text>
        </View>
      )}
    </View>
  );

  const renderVerificationCard = (item: Verification) => (
    <TouchableOpacity key={item.id} style={styles.card} onPress={() => openDetailsModal(item)}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{item.full_name}</Text>
        <Text style={styles.cardStatus(item.verification_status)}>{item.verification_status}</Text>
      </View>
      <Text style={styles.cardInfo}>{item.phone_number} - {item.location}</Text>
      <View style={styles.photoRow}>
        <Image source={{ uri: item.profile_photo_url }} style={styles.thumbnail} />
        <Image source={{ uri: item.id_document_url }} style={styles.thumbnail} />
        <Image source={{ uri: item.selfie_with_id_url }} style={styles.thumbnail} />
      </View>
      <Text style={styles.cardDate}>Soumis le: {new Date(item.submitted_at).toLocaleDateString('fr-FR')}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={commonStyles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Icon name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Vérifications Livreurs</Text>
      </View>

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 50 }} size="large" color={colors.primary} />
      ) : (
        <ScrollView
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {verifications.length === 0 ? (
            <Text style={styles.emptyText}>Aucune demande de vérification trouvée.</Text>
          ) : (
            verifications.map(renderVerificationCard)
          )}
        </ScrollView>
      )}

      {selectedVerification && (
        <Modal
          visible={isModalVisible}
          animationType="slide"
          onRequestClose={() => setIsModalVisible(false)}
        >
          <SafeAreaView style={commonStyles.container}>
            <ScrollView style={styles.modalContent}>
              <Text style={styles.modalTitle}>{selectedVerification.full_name}</Text>
              <Text style={styles.modalInfo}>Email: {selectedVerification.email}</Text>
              <Text style={styles.modalInfo}>Téléphone: {selectedVerification.phone_number}</Text>
              <Text style={styles.modalInfo}>Adresse: {selectedVerification.location}</Text>

              {renderImage(selectedVerification.profile_photo_url, 'Photo de profil')}
              {renderImage(selectedVerification.id_document_url, 'Pièce d\'identité')}
              {renderImage(selectedVerification.selfie_with_id_url, 'Selfie avec pièce')}
              {renderImage(selectedVerification.vehicle_photo_url, 'Photo du véhicule')}
              {renderImage(selectedVerification.insurance_document_url, 'Assurance / Permis')}

              <View style={styles.modalActions}>
                <Button
                  title="✅ Approuver"
                  onPress={() => handleUpdateStatus(selectedVerification, 'approved')}
                  variant="success"
                />
                <Button
                  title="❌ Rejeter"
                  onPress={() => handleUpdateStatus(selectedVerification, 'rejected')}
                  variant="danger"
                />
                <Button
                  title="Fermer"
                  onPress={() => setIsModalVisible(false)}
                  variant="secondary"
                />
              </View>
            </ScrollView>
          </SafeAreaView>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, gap: 16, borderBottomWidth: 1, borderColor: colors.border },
  headerTitle: { fontSize: 20, fontWeight: '700', color: colors.text },
  emptyText: { textAlign: 'center', marginTop: 50, color: colors.textSecondary },
  card: {
    backgroundColor: colors.backgroundAlt,
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 18, fontWeight: '600', color: colors.text },
  cardStatus: (status: string) => ({
    fontSize: 12,
    fontWeight: 'bold',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    overflow: 'hidden',
    color: status === 'approved' ? colors.success : status === 'rejected' ? colors.error : colors.warning,
    backgroundColor: status === 'approved' ? colors.success + '20' : status === 'rejected' ? colors.error + '20' : colors.warning + '20',
  }),
  cardInfo: { color: colors.textSecondary, marginVertical: 8 },
  cardDate: { fontSize: 12, color: colors.textSecondary, marginTop: 8, textAlign: 'right' },
  photoRow: { flexDirection: 'row', gap: 8, justifyContent: 'center', marginVertical: 8 },
  thumbnail: { width: 80, height: 60, borderRadius: 8, backgroundColor: colors.border },
  modalContent: { padding: 20 },
  modalTitle: { fontSize: 24, fontWeight: 'bold', marginBottom: 16, textAlign: 'center' },
  modalInfo: { fontSize: 16, marginBottom: 8 },
  imageContainer: { marginVertical: 16, alignItems: 'center' },
  imageTitle: { fontSize: 18, fontWeight: '600', marginBottom: 8 },
  image: { width: '100%', height: 250, borderRadius: 12, backgroundColor: colors.border },
  imagePlaceholder: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    backgroundColor: colors.backgroundAlt,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholderText: { color: colors.textSecondary, marginTop: 8 },
  modalActions: { gap: 12, marginTop: 32, marginBottom: 50 },
});