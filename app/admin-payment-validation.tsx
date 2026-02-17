import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../styles/commonStyles';
import Icon from '../components/Icon';
import Button from '../components/Button';
import { router } from 'expo-router';
import { ensureSupabaseInitialized } from '../config';
import SimpleBottomSheet from '../components/BottomSheet';
import { useAuth } from '../hooks/useAuth'; // Importer le hook d'authentification

interface PaymentProof {
  id: string;
  user_id: string;
  transaction_id: string; // transaction_reference
  payment_method: string;
  status: string; // 'pending', 'approved', 'rejected'
  created_at: string; // submitted_at
  payment_type?: string; // 'subscription', 'avicoins', 'order'
  reference_type?: string; // Legacy fallback
  reference_id: string | null; // ID du plan
  order_id?: string; // ID de la commande (si type order)
  // Joined data
  buyer_name: string;
  buyer_phone?: string;
  buyer_phone_full?: string; // Téléphone du profil acheteur
  seller_name?: string;      // Nom du vendeur (pour les commandes)
  seller_phone?: string;     // Téléphone du vendeur (pour les commandes)
  amount: number; // order_total
  quantity?: number; // Nombre d'articles (ex: Avicoins)
}

export default function AdminPaymentValidationScreen() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [proofs, setProofs] = useState<PaymentProof[]>([]);
  const [selectedProof, setSelectedProof] = useState<PaymentProof | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [tabCounts, setTabCounts] = useState({ pending: 0, approved: 0, rejected: 0 });

  const loadProofs = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const supabase = await ensureSupabaseInitialized();

      // Charger les comptes pour tous les statuts
      const { data: countsData, error: countsError } = await supabase
        .from('payment_proofs')
        .select('status')
        .in('status', ['pending', 'approved', 'rejected']);

      if (!countsError && countsData) {
        const counts = countsData.reduce((acc: { pending: number; approved: number; rejected: number }, item) => {
          if (item.status in acc) {
            acc[item.status as keyof typeof acc] = (acc[item.status as keyof typeof acc] || 0) + 1;
          }
          return acc;
        }, { pending: 0, approved: 0, rejected: 0 });
        setTabCounts(counts);
      }

      const { data, error } = await supabase.rpc('get_pending_payment_proofs_by_status', {
        p_status: activeTab
      });

      if (error) throw error;

      const initialProofs = (data || []) as PaymentProof[];
      if (initialProofs.length === 0) {
        setProofs([]);
        return;
      }

      // --- CORRECTION CRITIQUE (Step 1) : Récupérer les IDs manquants (order_id, payment_type) ---
      const proofIds = initialProofs.map(pItem => pItem.id);
      let correctedProofs = initialProofs;

      if (proofIds.length > 0) {
        const { data: rawProofs, error: rawProofsError } = await supabase
          .from('payment_proofs')
          .select('id, order_id, reference_id, payment_type') // reference_type retiré
          .in('id', proofIds);

        if (!rawProofsError && rawProofs) {
          console.log('DEBUG: rawProofs fetched:', rawProofs.length);
          const rawMap = new Map(rawProofs.map(rp => [rp.id, rp]));

          correctedProofs = initialProofs.map(pItem => {
            const raw = rawMap.get(pItem.id);
            if (raw) {
              // Normalisation du type de paiement (Gestion Cas 1, 2, 3 de l'utilisateur)
              let nType = raw.payment_type;
              if (nType === 1 || nType === '1') nType = 'avicoins';
              else if (nType === 2 || nType === '2') nType = 'subscription';
              else if (nType === 3 || nType === '3') nType = 'order';

              const updated = {
                ...pItem,
                order_id: raw.order_id,
                payment_type: nType || pItem.payment_type || pItem.reference_type,
                reference_id: raw.reference_id || pItem.reference_id
              };
              // Si reference_id est vide pour une commande, on utilise order_id comme fallback pour reference_id aussi pour l'affichage
              if (updated.payment_type === 'order' && !updated.reference_id && updated.order_id) {
                updated.reference_id = updated.order_id;
              }
              return updated;
            }
            return pItem;
          });
        } else {
          console.log('DEBUG: Error fetching raw proofs or empty', rawProofsError);
        }
      }

      // --- ENRICHISSEMENT DES DONNÉES (Pour les Commandes) ---
      const orderIds = correctedProofs
        .filter(pItem => (pItem.payment_type === 'order' || pItem.reference_type === 'order'))
        .map(pItem => pItem.order_id || pItem.reference_id)
        .filter((id): id is string => !!id);

      console.log('DEBUG: orderIds valid for enrichment:', orderIds);

      let finalProofs = correctedProofs;

      if (orderIds.length > 0) {
        const { data: ordersRaw, error: ordersError } = await supabase
          .from('orders')
          .select('id, seller_id, buyer_id')
          .in('id', orderIds);

        console.log('DEBUG: ordersRaw fetched count:', ordersRaw?.length, 'IDs found:', ordersRaw?.map((o: any) => o.id));

        if (!ordersError && ordersRaw) {
          const profileIds = new Set<string>();
          ordersRaw.forEach((o: any) => {
            if (o.seller_id) profileIds.add(o.seller_id);
            if (o.buyer_id) profileIds.add(o.buyer_id);
          });

          console.log('DEBUG: unique profileIds to fetch:', profileIds.size);

          if (profileIds.size > 0) {
            const { data: profiles, error: profilesError } = await supabase
              .from('profiles')
              .select('user_id, full_name, phone_number')
              .in('user_id', Array.from(profileIds));

            console.log('DEBUG: profiles fetched count:', profiles?.length, 'UserIDs:', profiles?.map((profile: any) => profile.user_id));

            if (!profilesError && profiles) {
              const profilesMap = new Map(profiles.map((profile: any) => [profile.user_id, profile]));
              const ordersMap = new Map(ordersRaw.map((o: any) => [o.id, o]));

              finalProofs = correctedProofs.map(pItem => {
                const targetId = pItem.order_id || pItem.reference_id;
                const type = pItem.payment_type || pItem.reference_type;
                if (type === 'order' && targetId && ordersMap.has(targetId)) {
                  const orderFromMap = ordersMap.get(targetId)!; // Use non-null assertion as we've checked with .has()
                  const seller = profilesMap.get(orderFromMap.seller_id);
                  const buyer = profilesMap.get(orderFromMap.buyer_id);

                  console.log('DEBUG: Enrichment for order', targetId, 'Seller found:', !!seller, 'Buyer found:', !!buyer);
                  if (seller) console.log('DEBUG: Seller name found:', seller.full_name);

                  return {
                    ...pItem,
                    seller_name: seller?.full_name,
                    seller_phone: seller?.phone_number,
                    buyer_phone_full: buyer?.phone_number
                  };
                }
                if (type === 'order') console.log('DEBUG: Enrichment skipped for order', targetId, 'Exists in map:', ordersMap.has(targetId));
                return pItem;
              });
            }
          }
        }
      }

      console.log('DEBUG: Final proofs count:', finalProofs.length, 'Enriched samples:', finalProofs.filter(pItem => pItem.seller_name).length);
      setProofs(finalProofs);
    } catch (error: any) {
      console.error('DEBUG: Erreur globale loadProofs:', error);
      Alert.alert('Erreur', `Erreur chargement: ${error.message}`);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [user, activeTab]);

  useEffect(() => {
    loadProofs();
  }, [loadProofs]); // Se redéclenche si la fonction loadProofs change (donc si 'user' change)

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadProofs();
  };

  const handleUpdateProof = async (proofId: string, newStatus: 'approved' | 'rejected') => {
    if (!selectedProof) return;

    const actionText = newStatus === 'approved' ? 'approuver' : 'rejeter';
    Alert.alert(
      `Confirmer l'action`,
      `Êtes-vous sûr de vouloir ${actionText} ce paiement ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: `Oui, ${actionText}`,
          onPress: async () => {
            setIsProcessing(true);
            try {
              const supabase = await ensureSupabaseInitialized();

              // Utiliser l'utilisateur du hook useAuth, déjà disponible
              if (!user) {
                throw new Error("Session administrateur expirée. Veuillez vous reconnecter.");
              }

              // --- CORRECTION : Appeler la fonction de validation centralisée ---
              console.log(`🚀 Appel de update_payment_proof_status avec proof_id: ${proofId}, status: ${newStatus}`);
              const { error: updateError } = await supabase.rpc('update_payment_proof_status', {
                p_proof_id: proofId,
                p_new_status: newStatus,
                p_admin_id: user.id // Utiliser l'ID de l'utilisateur admin actuel
              });

              if (updateError) throw updateError;

              Alert.alert('Succès', `Le paiement a été ${actionText} avec succès.`);

              // Dans tous les cas, on rafraîchit l'interface
              setSelectedProof(null);
              loadProofs();
            } catch (error: any) {
              Alert.alert('Erreur', `Impossible de mettre à jour le paiement: ${error.message}`);
            } finally {
              setIsProcessing(false);
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('fr-FR');
  };

  const renderProofCard = (proof: PaymentProof) => {
    const getStatusColor = (status: string) => {
      switch (status) {
        case 'pending': return colors.warning;
        case 'approved': return colors.success;
        case 'rejected': return colors.error;
        default: return colors.primary;
      }
    };

    const getStatusText = (status: string) => {
      switch (status) {
        case 'pending': return 'En attente';
        case 'approved': return 'Validé';
        case 'rejected': return 'Rejeté';
        default: return status;
      }
    };

    return (
      <TouchableOpacity
        key={proof.id}
        style={[styles.card, activeTab === 'pending' && { borderLeftWidth: 4, borderLeftColor: getStatusColor(proof.status) }]}
        onPress={() => activeTab === 'pending' ? setSelectedProof(proof) : null}
        disabled={activeTab !== 'pending'}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderInfo}>
            <Text style={styles.cardName}>{proof.buyer_name}</Text>
            <Text style={styles.cardSubText} numberOfLines={1}>
              {(proof.payment_type === 'order' || proof.reference_type === 'order') ? `Commande #${(proof.reference_id || proof.order_id)?.slice(-6)}` :
                (proof.payment_type === 'subscription' || proof.reference_type === 'subscription') ? `Abonnement (Plan ID: ${proof.reference_id?.slice(-6)})` :
                  'Achat avicoins'}
            </Text>
          </View>
          <View style={styles.statusContainer}>
            <Text style={[styles.cardAmount, { color: getStatusColor(proof.status) }]}>
              {proof.amount.toLocaleString()} CFA
            </Text>
            <Text style={[styles.statusBadge, { backgroundColor: getStatusColor(proof.status) + '20', color: getStatusColor(proof.status) }]}>
              {getStatusText(proof.status)}
            </Text>
          </View>
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.infoLabel}>ID Transaction (OM):</Text>
          <Text style={styles.infoValue}>{proof.transaction_id}</Text>
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.infoLabel}>
            {proof.status === 'approved' ? 'Validé le:' :
              proof.status === 'rejected' ? 'Rejeté le:' :
                'Soumis le:'}
          </Text>
          <Text style={styles.infoValue}>{formatDate(proof.created_at)}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderDetailSheet = () => {
    if (!selectedProof) return null;

    return (
      <SimpleBottomSheet isVisible={!!selectedProof} onClose={() => setSelectedProof(null)}>
        <ScrollView style={styles.detailContainer} showsVerticalScrollIndicator={false}>
          <Text style={styles.detailTitle}>Vérifier le Paiement</Text>

          <View style={styles.detailSection}>
            <Text style={styles.detailLabel}>Client</Text>
            <Text style={styles.detailValue}>{selectedProof.buyer_name}</Text>
          </View>
          <View style={styles.detailSection}>
            <Text style={styles.detailLabel}>Téléphone Client (Paiement)</Text>
            <Text style={styles.detailValue}>{selectedProof.buyer_phone || 'Non fourni'}</Text>
          </View>
          {selectedProof.buyer_phone_full && (
            <View style={styles.detailSection}>
              <Text style={styles.detailLabel}>Téléphone Client (Profil)</Text>
              <Text style={styles.detailValue}>{selectedProof.buyer_phone_full}</Text>
            </View>
          )}

          {/* SECTION VENDEUR (Uniquement pour les commandes) */}
          {(selectedProof.seller_name || selectedProof.seller_phone) && (
            <>
              <View style={[styles.detailSection, { marginTop: 8, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.border }]}>
                <Text style={[styles.detailLabel, { color: colors.primary, fontWeight: '700' }]}>INFORMATION VENDEUR</Text>
              </View>
              {selectedProof.seller_name && (
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Nom Vendeur</Text>
                  <Text style={styles.detailValue}>{selectedProof.seller_name}</Text>
                </View>
              )}
              {selectedProof.seller_phone && (
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Téléphone Vendeur</Text>
                  <Text style={styles.detailValue}>{selectedProof.seller_phone}</Text>
                </View>
              )}
            </>
          )}
          <View style={styles.detailSection}>
            <Text style={styles.detailLabel}>Montant</Text>
            <Text style={styles.detailValue}>{selectedProof.amount.toLocaleString()} CFA</Text>
          </View>
          {(selectedProof.payment_type === 'avicoins' || selectedProof.reference_type === 'avicoins') && selectedProof.quantity && (
            <View style={styles.detailSection}>
              <Text style={styles.detailLabel}>Quantité</Text>
              <Text style={styles.detailValue}>{selectedProof.quantity} Avicoins</Text>
            </View>
          )}
          <View style={styles.detailSection}>
            <Text style={styles.detailLabel}>Objet du paiement</Text>
            <Text style={styles.detailValue}>
              {(selectedProof.payment_type === 'order' || selectedProof.reference_type === 'order') ? `Commande #${(selectedProof.reference_id || selectedProof.order_id)?.slice(-6)}` :
                (selectedProof.payment_type === 'subscription' || selectedProof.reference_type === 'subscription') ? `Abonnement (Plan ID: ${selectedProof.reference_id})` :
                  'Achat avicoins'}
            </Text>
          </View>
          <View style={styles.detailSection}>
            <Text style={styles.detailLabel}>ID Transaction Orange Money</Text>
            <Text style={styles.detailValue}>{selectedProof.transaction_id}</Text>
          </View>
          <View style={styles.detailSection}>
            <Text style={styles.detailLabel}>Date de soumission</Text>
            <Text style={styles.detailValue}>{formatDate(selectedProof.created_at)}</Text>
          </View>

          <View style={styles.instructions}>
            <Icon name="alert-circle" size={24} color={colors.warning} />
            <Text style={styles.instructionsText}>
              Veuillez vérifier manuellement sur votre compte Orange Money si vous avez reçu un paiement correspondant à ces informations avant d'approuver.
            </Text>
          </View>

          <View style={styles.actionButtons}>
            <Button
              text="Rejeter"
              onPress={() => handleUpdateProof(selectedProof.id, 'rejected')}
              disabled={isProcessing}
              style={{ flex: 1, backgroundColor: colors.error, paddingVertical: 16 }}
            />
            <Button
              text="Approuver"
              onPress={() => handleUpdateProof(selectedProof.id, 'approved')}
              disabled={isProcessing}
              style={{ flex: 1, backgroundColor: colors.success, paddingVertical: 16 }}
            />
          </View>
          <View style={{ height: 40 }} />
        </ScrollView>
      </SimpleBottomSheet>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Icon name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Paiements Manuels</Text>
      </View>

      {/* Onglets de statut */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'pending' && styles.tabButtonActive]}
          onPress={() => setActiveTab('pending')}
        >
          <Text style={[styles.tabText, activeTab === 'pending' && styles.tabTextActive]}>
            En attente ({tabCounts.pending})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'approved' && styles.tabButtonActive]}
          onPress={() => setActiveTab('approved')}
        >
          <Text style={[styles.tabText, activeTab === 'approved' && styles.tabTextActive]}>
            Validés ({tabCounts.approved})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'rejected' && styles.tabButtonActive]}
          onPress={() => setActiveTab('rejected')}
        >
          <Text style={[styles.tabText, activeTab === 'rejected' && styles.tabTextActive]}>
            Rejetés ({tabCounts.rejected})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />}
      >
        {proofs.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Icon name="card" size={64} color={colors.textSecondary} />
            <Text style={styles.emptyTitle}>
              {activeTab === 'pending' ? 'Aucun paiement en attente' :
                activeTab === 'approved' ? 'Aucun paiement validé' :
                  'Aucun paiement rejeté'}
            </Text>
            <Text style={styles.emptyText}>
              {activeTab === 'pending' ? 'Les nouvelles soumissions apparaîtront ici.' :
                activeTab === 'approved' ? 'Les paiements validés apparaîtront ici.' :
                  'Les paiements rejetés apparaîtront ici.'}
            </Text>
          </View>
        ) : (
          proofs.map(renderProofCard)
        )}
      </ScrollView>

      {renderDetailSheet()}
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
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
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
    marginLeft: 16,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    flexGrow: 1,
  },
  card: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cardHeaderInfo: {
    flex: 1,
  },
  cardName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  cardSubText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  cardAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
  },
  cardInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  infoLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
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
  },
  detailContainer: {
    padding: 20,
  },
  detailTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 24,
  },
  detailSection: {
    marginBottom: 16,
  },
  detailLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  instructions: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: colors.warning + '20',
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
    marginBottom: 16,
  },
  instructionsText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: colors.text,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.backgroundAlt,
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  tabButtonActive: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.white,
  },
  statusContainer: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    fontSize: 10,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
  },
});
