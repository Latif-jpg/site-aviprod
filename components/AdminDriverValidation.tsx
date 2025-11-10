import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, Image, Dimensions, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, commonStyles } from '../styles/commonStyles';
import Icon from './Icon'; // Importation correcte
import { supabase } from '../config'; // Import supabase directly
import { router } from 'expo-router';

const { width } = Dimensions.get('window');

interface DriverApplication {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone_number: string;
  date_of_birth: string;
  profile_photo: string;
  id_document: string;
  selfie_with_id: string;
  full_address: string;
  vehicle_type: string;
  license_plate: string;
  vehicle_photo: string;
  insurance_document: string;
  delivery_zones: string[];
  availability: string[];
  accepted_delivery_types: string[];
  payment_method: string;
  payment_account: string;
  payment_proof: string;
  status: string;
  created_at: string;
}

export default function AdminDriverValidation() {
  const [applications, setApplications] = useState<DriverApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedApplication, setSelectedApplication] = useState<DriverApplication | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    loadDriverApplications();
  }, []);

  const loadDriverApplications = async () => {
    try {
      setIsLoading(true); // Keep loading state

      // Load from livreur_verifications where status is pending
      const { data, error } = await supabase
        .from('livreur_verifications')
        .select('*')
        .eq('verification_status', 'pending')
        .order('submitted_at', { ascending: false });

      if (error) throw error;

      // Filter for driver applications by checking if it's a driver verification
      const driverApplications = (data || []).filter(item => {
        return item.vehicle_type || item.delivery_zones; // Driver-specific fields
      });

      if (error) throw error;

      // Transform data to match our interface
      const transformedData = await Promise.all(driverApplications.map(async (item) => {
        try {
          const notes = item.notes ? JSON.parse(item.notes) : {};
          const supabase = await ensureSupabaseInitialized();

          const getPublicUrl = (path: string | null) => {
            if (!path) return null;
            return supabase.storage.from('deliver_kyc').getPublicUrl(path).data?.publicUrl || null;
          };

          return {
            id: item.id,
            user_id: item.user_id,
            full_name: item.full_name,
            email: item.email,
            phone_number: item.phone_number,
            date_of_birth: item.date_of_birth || '',
            profile_photo: getPublicUrl(item.profile_photo_url),
            id_document: getPublicUrl(item.id_document_url),
            selfie_with_id: getPublicUrl(item.selfie_with_id_url),
            full_address: item.full_address,
            vehicle_type: item.vehicle_type || '',
            license_plate: item.license_plate || '',
            vehicle_photo: getPublicUrl(item.vehicle_photo_url),
            insurance_document: getPublicUrl(item.insurance_document_url),
            delivery_zones: item.delivery_zones || [],
            availability: item.availability || [],
            accepted_delivery_types: item.accepted_delivery_types || [],
            payment_method: item.payment_method || '',
            payment_account: item.payment_account || '',
            payment_proof: item.payment_proof_url || '',
            status: 'pending',
            created_at: item.submitted_at,
            notes: item.notes
          };
        } catch (parseError) {
          console.error('Error parsing notes for application:', item.id, parseError);
          return null;
        }
      }));

      setApplications(transformedData.filter(Boolean) as DriverApplication[]);
    } catch (error: any) {
      console.error('Error loading driver applications:', error);
      Alert.alert('Erreur', 'Impossible de charger les demandes');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplicationAction = async (application: DriverApplication, action: 'approve' | 'reject') => {
    try {

      // Update driver verification status first
      const { error: kycError } = await supabase
        .from('livreur_verifications')
        .update({
          verification_status: action === 'approve' ? 'approved' : 'rejected',
          reviewed_at: new Date().toISOString(),
          review_notes: action === 'approve' ? 'Validation automatique - Livreur approuvé' : 'Demande rejetée par l\'administrateur'
        })
        .eq('id', application.id);

      if (kycError) throw kycError;

      // La table 'delivery_drivers' n'est pas utilisée. L'approbation dans 'livreur_verifications' est suffisante.
      Alert.alert(
        'Succès',
        `La demande a été ${action === 'approve' ? 'approuvée' : 'rejetée'} avec succès.`,
        [
          {
            text: 'OK',
            onPress: () => {
              setShowDetails(false);
              setSelectedApplication(null);
              loadDriverApplications(); // Refresh the list
            },
          },
        ]
      );
    } catch (error: any) {
      console.error('Error processing application:', error);
      Alert.alert('Erreur', `Impossible de traiter la demande: ${error.message}`);
    }
  };

  const renderApplicationDetails = () => {
    if (!selectedApplication) return null;

    return (
      <View style={styles.detailsContainer}>
        <View style={styles.detailsHeader}>
          <TouchableOpacity
            onPress={() => {
              setShowDetails(false);
              setSelectedApplication(null);
            }}
            style={styles.backButton}
          >
            <Icon name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.detailsTitle}>Détails de la demande</Text>
        </View>

        <ScrollView style={styles.detailsScrollView}>
          {/* Personal Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Informations Personnelles</Text>
            <View style={styles.infoGrid}>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Nom complet</Text>
                <Text style={styles.infoValue}>{selectedApplication.full_name}</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Email</Text>
                <Text style={styles.infoValue}>{selectedApplication.email}</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Téléphone</Text>
                <Text style={styles.infoValue}>{selectedApplication.phone_number}</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Date de naissance</Text>
                <Text style={styles.infoValue}>{selectedApplication.date_of_birth}</Text>
              </View>
            </View>
          </View>

          {/* Address */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Adresse</Text>
            <Text style={styles.addressText}>{selectedApplication.full_address}</Text>
          </View>

          {/* Vehicle Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Véhicule</Text>
            <View style={styles.vehicleGrid}>
              <View style={styles.vehicleItem}>
                <Text style={styles.vehicleLabel}>Type</Text>
                <Text style={styles.vehicleValue}>
                  {selectedApplication.vehicle_type === 'bike' ? 'Vélo' :
                   selectedApplication.vehicle_type === 'motorcycle' ? 'Moto' : 'Voiture'}
                </Text>
              </View>
              {selectedApplication.license_plate && (
                <View style={styles.vehicleItem}>
                  <Text style={styles.vehicleLabel}>Immatriculation</Text>
                  <Text style={styles.vehicleValue}>{selectedApplication.license_plate}</Text>
                </View>
              )}
            </View>
          </View>

          {/* Delivery Preferences */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Préférences de livraison</Text>
            <View style={styles.preferencesGrid}>
              <View style={styles.preferenceItem}>
                <Text style={styles.preferenceLabel}>Zones</Text>
                <View style={styles.zonesContainer}>
                  {selectedApplication.delivery_zones.map((zone, index) => (
                    <View key={index} style={styles.zoneChip}>
                      <Text style={styles.zoneText}>{zone}</Text>
                    </View>
                  ))}
                </View>
              </View>
              <View style={styles.preferenceItem}>
                <Text style={styles.preferenceLabel}>Disponibilité</Text>
                <View style={styles.availabilityContainer}>
                  {selectedApplication.availability.map((avail, index) => (
                    <View key={index} style={styles.availabilityChip}>
                      <Text style={styles.availabilityText}>
                        {avail === 'day' ? 'Journée' : avail === 'night' ? 'Nuit' : '24h'}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
              <View style={styles.preferenceItem}>
                <Text style={styles.preferenceLabel}>Types acceptés</Text>
                <View style={styles.typesContainer}>
                  {selectedApplication.accepted_delivery_types.map((type, index) => (
                    <View key={index} style={styles.typeChip}>
                      <Text style={styles.typeText}>
                        {type === 'fragile' ? 'Fragile' : type === 'living' ? 'Vivant' : 'Générique'}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          </View>

          {/* Payment Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Informations de paiement</Text>
            <View style={styles.paymentGrid}>
              <View style={styles.paymentItem}>
                <Text style={styles.paymentLabel}>Méthode</Text>
                <Text style={styles.paymentValue}>
                  {selectedApplication.payment_method === 'mobile_money' ? 'Mobile Money' : 'Virement bancaire'}
                </Text>
              </View>
              <View style={styles.paymentItem}>
                <Text style={styles.paymentLabel}>Compte</Text>
                <Text style={styles.paymentValue}>{selectedApplication.payment_account}</Text>
              </View>
            </View>
          </View>

          {/* Documents */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Documents</Text>
            <View style={styles.documentsGrid}>
              <TouchableOpacity style={styles.documentItem}>
                {selectedApplication.profile_photo ? (
                  <Image source={{ uri: selectedApplication.profile_photo }} style={styles.documentImage} />
                ) : (
                  <View style={[styles.documentImage, styles.documentPlaceholder]}><Text style={styles.placeholderText}>Profil</Text></View>
                )}
                <Text style={styles.documentLabel}>Photo profil</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.documentItem}>
                {selectedApplication.id_document ? (
                  <Image source={{ uri: selectedApplication.id_document }} style={styles.documentImage} />
                ) : (
                  <View style={[styles.documentImage, styles.documentPlaceholder]}><Text style={styles.placeholderText}>CNI</Text></View>
                )}
                <Text style={styles.documentLabel}>Carte d'identité</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.documentItem}>
                {selectedApplication.selfie_with_id ? (
                  <Image source={{ uri: selectedApplication.selfie_with_id }} style={styles.documentImage} />
                ) : (
                  <View style={[styles.documentImage, styles.documentPlaceholder]}><Text style={styles.placeholderText}>Selfie</Text></View>
                )}
                <Text style={styles.documentLabel}>Selfie avec ID</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.documentItem}>
                {selectedApplication.vehicle_photo ? (
                  <Image source={{ uri: selectedApplication.vehicle_photo }} style={styles.documentImage} />
                ) : (
                  <View style={[styles.documentImage, styles.documentPlaceholder]}><Text style={styles.placeholderText}>Véhicule</Text></View>
                )}
                <Text style={styles.documentLabel}>Photo véhicule</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.documentItem}>
                {selectedApplication.insurance_document ? (
                  <Image source={{ uri: selectedApplication.insurance_document }} style={styles.documentImage} />
                ) : (
                  <View style={[styles.documentImage, styles.documentPlaceholder]}><Text style={styles.placeholderText}>Assurance</Text></View>
                )}
                <Text style={styles.documentLabel}>Assurance</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.documentItem}>
                {selectedApplication.payment_proof ? (
                  <Image source={{ uri: selectedApplication.payment_proof }} style={styles.documentImage} />
                ) : (
                  <View style={[styles.documentImage, styles.documentPlaceholder]}><Text style={styles.placeholderText}>Paiement</Text></View>
                )}
                <Text style={styles.documentLabel}>Justificatif paiement</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.rejectButton]}
            onPress={() => handleApplicationAction(selectedApplication, 'reject')}
          >
            <Icon name="close-circle" size={20} color={colors.white} />
            <Text style={styles.actionButtonText}>Rejeter</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.approveButton]}
            onPress={() => handleApplicationAction(selectedApplication, 'approve')}
          >
            <Icon name="checkmark-circle" size={20} color={colors.white} />
            <Text style={styles.actionButtonText}>Approuver</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={commonStyles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Chargement des demandes...</Text>
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
        <Text style={styles.headerTitle}>Validation Livreurs</Text>
        <View style={styles.headerBadge}>
          <Text style={styles.headerBadgeText}>{applications.length}</Text>
        </View>
      </View>

      {!showDetails ? (
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.content}>
            <Text style={styles.subtitle}>
              Demandes en attente de validation ({applications.length})
            </Text>

            {applications.length === 0 ? (
              <View style={styles.emptyState}>
                <Icon name="cart" size={48} color={colors.textSecondary} />
                <Text style={styles.emptyStateText}>Aucune demande en attente</Text>
              </View>
            ) : (
              applications.map(renderApplicationCard)
            )}
          </View>
        </ScrollView>
      ) : (
        renderApplicationDetails()
      )}
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
    flex: 1,
  },
  headerBadge: {
    backgroundColor: colors.warning,
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  headerBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.white,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 20,
  },
  applicationCard: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  applicationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  applicantInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  profileImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  applicantName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  applicantEmail: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  applicationMeta: {
    alignItems: 'flex-end',
  },
  applicationDate: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  pendingBadge: {
    backgroundColor: colors.warning,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pendingText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.white,
  },
  applicationDetails: {
    gap: 8,
  },
  vehicleInfo: {
    fontSize: 14,
    color: colors.text,
  },
  zonesInfo: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  phoneInfo: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 12,
  },
  detailsContainer: {
    flex: 1,
  },
  detailsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  detailsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
    textAlign: 'center',
    marginRight: 40,
  },
  detailsScrollView: {
    flex: 1,
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  infoGrid: {
    gap: 12,
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
    textAlign: 'right',
  },
  addressText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  vehicleGrid: {
    gap: 12,
  },
  vehicleItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  vehicleLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  vehicleValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  preferencesGrid: {
    gap: 16,
  },
  preferenceItem: {
    gap: 8,
  },
  preferenceLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  zonesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  zoneChip: {
    backgroundColor: colors.primary + '20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  zoneText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
  },
  availabilityContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  availabilityChip: {
    backgroundColor: colors.accent + '20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  availabilityText: {
    fontSize: 12,
    color: colors.accent,
    fontWeight: '600',
  },
  typesContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  typeChip: {
    backgroundColor: colors.success + '20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  typeText: {
    fontSize: 12,
    color: colors.success,
    fontWeight: '600',
  },
  paymentGrid: {
    gap: 12,
  },
  paymentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paymentLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  paymentValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  documentsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  documentItem: {
    alignItems: 'center',
    width: (width - 40 - 24) / 3,
  },
  documentImage: {
    width: '100%',
    height: 80,
    borderRadius: 8,
    marginBottom: 8,
  },
  documentLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  documentPlaceholder: {
    backgroundColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  rejectButton: {
    backgroundColor: colors.error,
  },
  approveButton: {
    backgroundColor: colors.success,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
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
});