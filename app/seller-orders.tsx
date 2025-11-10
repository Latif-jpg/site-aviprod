import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, Image, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, commonStyles } from '../styles/commonStyles';
import Icon from '../components/Icon'; // Importation correcte
import { supabase } from '../config'; // Import supabase directly
import { router } from 'expo-router';
import Toast from 'react-native-toast-message';

interface SellerOrder {
  order_id: string;
  status: string;
  created_at: string;
  items_total: number;
  delivery_fee: number;
  grand_total: number;
  buyer_name: string;
  buyer_avatar_url?: string;
  items_summary: {
    product_name: string;
    image?: string;
  }[];
}

export default function SellerOrders() {
  const [orders, setOrders] = useState<SellerOrder[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<SellerOrder | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConfirmModalVisible, setIsConfirmModalVisible] = useState(false);
  const [pickupInfo, setPickupInfo] = useState({
    address: '',
    phone: '',
    orderToConfirm: null as SellerOrder | null,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRejectModalVisible, setIsRejectModalVisible] = useState(false);
  const [rejectionInfo, setRejectionInfo] = useState({
    reason: '',
    orderToReject: null as SellerOrder | null,
  });

  useEffect(() => {
    loadSellerOrders();
  }, []);

  // Debugging useEffect
  useEffect(() => {
      console.log('📦 Current orders:', orders);
      console.log('🎯 Selected order for confirmation:', selectedOrder);
      console.log('🆔 Selected order ID:', selectedOrder?.order_id); // Note: changed to order_id as per SellerOrder interface
  }, [orders, selectedOrder]);

  const loadSellerOrders = async () => {
    try {
      setIsLoading(true); // Keep loading state
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        Toast.show({ type: 'error', text1: 'Erreur', text2: 'Vous devez être connecté' });
        return;
      }

      // Utilise la nouvelle vue 'seller_orders_view'
      const { data, error } = await supabase
        .from('seller_orders_view')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setOrders(data as SellerOrder[]);
    } catch (error: any) {
      console.error('❌ Error loading seller orders:', error);
      Toast.show({ type: 'error', text1: 'Erreur', text2: 'Impossible de charger les commandes' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmOrderClick = (order: SellerOrder) => {
    setPickupInfo({ address: '', phone: '', orderToConfirm: order });
    setIsConfirmModalVisible(true);
  };

const confirmOrderWithPickupInfo = async (orderId: string, pickupInfo: any) => {
    const supabase = await ensureSupabaseInitialized(); // Ensure supabase is initialized here
    console.log('🔍 DEBUG - confirmOrderWithPickupInfo called with:');
    console.log('orderId:', orderId, 'type:', typeof orderId);
    
    // --- CORRECTION : Validation renforcée de l'ID de la commande ---
    if (!orderId || typeof orderId !== 'string') {
        console.error('❌ ERREUR CRITIQUE: orderId est undefined ou invalide:', orderId);
        throw new Error('ID de commande manquant. Veuillez réessayer ou contacter le support.');
    }

    // --- CORRECTION : Validation que c'est un UUID valide ---
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(orderId)) {
        console.error('❌ ERREUR: orderId nest pas un UUID valide:', orderId);
        throw new Error('Format de commande invalide.');
    }
    
    try {
        console.log('✅ OrderId valide, confirmation en cours...');
        
        const { data, error } = await supabase
            .rpc('confirm_order_with_pickup_info', {
                p_order_id: orderId,
                p_pickup_address: pickupInfo?.address ? {
                    address: pickupInfo.address,
                    city: pickupInfo.city,
                    notes: pickupInfo.notes
                } : null,
                p_pickup_phone: pickupInfo?.phone || null
            });
            
        if (error) {
            console.error('❌ Erreur Supabase:', error);
            throw error;
        }
        
        console.log('✅ Commande confirmée avec succès:', data);
        return data;
        
    } catch (error) {
        console.error('❌ Erreur critique lors de la confirmation:', error);
        throw error;
    }
};

  const handleRejectOrderClick = (order: SellerOrder) => {
    setRejectionInfo({
      reason: '',
      orderToReject: order,
    });
    setIsRejectModalVisible(true);
  };

  const rejectOrderWithReason = async () => {
    if (!rejectionInfo.orderToReject || !rejectionInfo.reason.trim()) {
      Toast.show({ type: 'error', text1: 'Motif requis', text2: 'Veuillez fournir un motif pour le rejet.' });
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('orders')
        .update({
          status: 'cancelled',
          rejection_reason: rejectionInfo.reason,
        })
        .eq('id', rejectionInfo.orderToReject.order_id);

      if (error) throw error;

      Toast.show({ type: 'success', text1: 'Commande rejetée', text2: 'La commande a été annulée et le client notifié.' });
      setIsRejectModalVisible(false);
      loadSellerOrders();
      setSelectedOrder(null);
    } catch (error: any) {
      console.error('❌ Error rejecting order:', error);
      Toast.show({ type: 'error', text1: 'Erreur', text2: 'Impossible de rejeter la commande.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', orderId);
      if (error) throw error;

      Toast.show({ type: 'success', text1: 'Succès', text2: `Commande marquée comme ${newStatus}` });
      loadSellerOrders(); // Refresh
      setSelectedOrder(prev => prev ? { ...prev, status: newStatus } : null);
    } catch (error: any) {
      console.error('❌ Error updating order status:', error);
      Toast.show({ type: 'error', text1: 'Erreur', text2: 'Impossible de mettre à jour le statut' });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return colors.warning;
      case 'confirmed': return colors.primary;
      case 'preparing': return colors.warning;
      case 'ready': return colors.accent;
      case 'delivered': return colors.success;
      case 'cancelled': return colors.error;
      default: return colors.textSecondary;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'En attente';
      case 'confirmed': return 'Confirmée';
      case 'preparing': return 'En préparation';
      case 'ready': return 'Prête';
      case 'delivered': return 'Livrée';
      case 'cancelled': return 'Annulée';
      default: return status;
    }
  };

  const renderOrderCard = (order: SellerOrder) => (
    <TouchableOpacity key={order.order_id || Math.random()} style={styles.orderCard} onPress={() => setSelectedOrder(order)}>
      <View style={styles.orderHeader}>
        {order.items_summary?.[0]?.image && (
          <Image source={{ uri: order.items_summary[0].image }} style={styles.productImage} />
        )}
        <View style={styles.orderInfo}>
          <Text style={styles.orderId}>Commande #{order.order_id ? order.order_id.slice(-8) : 'N/A'}</Text>
          <Text style={styles.buyerName}>{order.buyer_name || 'Client inconnu'}</Text>
          <Text style={styles.orderDate}>{new Date(order.created_at).toLocaleDateString('fr-FR')}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) + '20' }]}>
          <Text style={[styles.statusText, { color: getStatusColor(order.status) }]}>{getStatusText(order.status)}</Text>
        </View>
      </View>
  
      <View style={styles.orderDetails}>
        <View>
          <Text style={styles.orderAmount}>{order.grand_total?.toLocaleString() || '0'} CFA</Text>
          <Text style={styles.priceBreakdown}>Produits: {order.items_total?.toLocaleString()} + Livraison: {order.delivery_fee?.toLocaleString()}</Text>
        </View>
        {order.items_summary?.length > 0 && (
            <Text style={styles.orderItems}>{order.items_summary.length} article{order.items_summary.length > 1 ? 's' : ''}</Text>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderOrderDetail = () => {
    if (!selectedOrder) return null;

    return (
      <View style={styles.orderDetailContainer}>
        <View style={styles.detailHeader}>
          <TouchableOpacity style={styles.closeButton} onPress={() => setSelectedOrder(null)}>
            <Icon name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.detailTitle}>Détails de la commande</Text>
        </View>

        <ScrollView>
          <View style={styles.detailSection}>
            <Text style={styles.sectionTitle}>Récapitulatif</Text>
            <View style={styles.detailRow}><Text style={styles.detailLabel}>Client</Text><Text style={styles.detailValue}>{selectedOrder.buyer_name || 'Client inconnu'}</Text></View>
            <View style={styles.detailRow}><Text style={styles.detailLabel}>Date</Text><Text style={styles.detailValue}>{new Date(selectedOrder.created_at).toLocaleString('fr-FR')}</Text></View>
            <View style={styles.detailRow}><Text style={styles.detailLabel}>Total produits</Text><Text style={styles.detailValue}>{selectedOrder.items_total?.toLocaleString() || '0'} CFA</Text></View>
            <View style={styles.detailRow}><Text style={styles.detailLabel}>Frais de livraison</Text><Text style={styles.detailValue}>{selectedOrder.delivery_fee?.toLocaleString() || '0'} CFA</Text></View>
            <View style={[styles.detailRow, styles.totalRow]}><Text style={[styles.detailLabel, styles.totalLabel]}>Total Général</Text><Text style={[styles.detailValue, styles.totalValue]}>{selectedOrder.grand_total?.toLocaleString() || '0'} CFA</Text></View>
          </View>

          <View style={styles.detailSection}>
            <Text style={styles.sectionTitle}>Articles commandés</Text>
            {selectedOrder.items_summary?.length > 0 ? (
              selectedOrder.items_summary.map((item: any, index: number) => (
                <View key={index} style={styles.itemRow}>
                  {item.image && <Image source={{ uri: item.image}} style={styles.productImage} />}
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName}>{item.product_name}</Text>
                  </View>
                </View>
              ))
            ) : (
              <Text style={styles.noItemsText}>Détail de l'article non disponible.</Text>
            )}
          </View>

          {/* La vue ne contient pas l'adresse, ce bloc peut être réactivé si besoin en ajoutant le champ à la vue */}
          {/* {selectedOrder.delivery_address && (
            <View style={styles.detailSection}>
              <Text style={styles.sectionTitle}>Adresse de livraison</Text>
              ...
            </View>
          )} */}

          <View style={styles.detailSection}>
            <Text style={styles.sectionTitle}>Gérer la commande</Text>
            {selectedOrder.status === 'pending' && (
              <View style={styles.actionButtonsContainer}>
                <TouchableOpacity style={[styles.actionButton, styles.rejectButton]} onPress={() => handleRejectOrderClick(selectedOrder)}>
                  <Icon name="close-circle" size={20} color={colors.white} />
                  <Text style={styles.actionButtonText}>Rejeter</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionButton, styles.acceptButton]} onPress={() => handleConfirmOrderClick(selectedOrder)}>
                  <Icon name="checkmark-circle" size={20} color={colors.white} />
                  <Text style={styles.actionButtonText}>Accepter</Text>
                </TouchableOpacity>
              </View>
            )}
            {selectedOrder.status === 'confirmed' && (
              <TouchableOpacity style={[styles.actionButton, {backgroundColor: colors.warning}]} onPress={() => updateOrderStatus(selectedOrder.order_id, 'preparing')} >
                <Icon name="cube" size={20} color={colors.white} />
                <Text style={styles.actionButtonText}>Commencer la préparation</Text>
              </TouchableOpacity>
            )}
            {selectedOrder.status === 'preparing' && (
              <TouchableOpacity style={[styles.actionButton, {backgroundColor: colors.success}]} onPress={() => updateOrderStatus(selectedOrder.order_id, 'ready')} >
                <Icon name="checkmark-circle" size={20} color={colors.white} />
                <Text style={styles.actionButtonText}>Marquer comme prête</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </View>
    );
  };

  const handleConfirmSubmit = async () => {
    if (!pickupInfo.orderToConfirm || !pickupInfo.address.trim() || !pickupInfo.phone.trim()) {
        Toast.show({ type: 'error', text1: 'Champs requis', text2: 'Veuillez saisir une adresse et un téléphone.' });
        return;
    }

    setIsSubmitting(true);
    try {
        // User's logging
        console.log('🔄 Avant confirmation - order:', pickupInfo.orderToConfirm);
        console.log('🔄 order.id:', pickupInfo.orderToConfirm?.order_id);
        console.log('🔄 order.id type:', typeof pickupInfo.orderToConfirm?.order_id);

        await confirmOrderWithPickupInfo(pickupInfo.orderToConfirm.order_id, {
            address: pickupInfo.address,
            phone: pickupInfo.phone,
            city: null, // Pass null for now, as it's not in the current state
            notes: null // Pass null for now, as it's not in the current state
        });

        Toast.show({ type: 'success', text1: 'Succès', text2: 'Commande confirmée avec succès!' });
        setIsConfirmModalVisible(false);
        loadSellerOrders();
        setSelectedOrder(null);
    } catch (error: any) {
        console.error('❌ Error confirming order with pickup info:', error);
        Toast.show({ type: 'error', text1: 'Erreur', text2: error.message || 'Impossible de confirmer la commande.' });
    } finally {
        setIsSubmitting(false);
    }
};

  const renderConfirmModal = () => (
    <Modal
      transparent={true}
      visible={isConfirmModalVisible}
      animationType="slide"
      onRequestClose={() => setIsConfirmModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>Confirmer la Commande</Text>
          <Text style={styles.modalSubtitle}>
            Veuillez saisir l'adresse de retrait et votre numéro pour le livreur.
          </Text>
          <TextInput
            style={styles.input}
            placeholder="Adresse de retrait du colis"
            value={pickupInfo.address}
            onChangeText={(text) => setPickupInfo(prev => ({ ...prev, address: text }))}
          />
          <TextInput
            style={styles.input}
            placeholder="Numéro de téléphone joignable"
            value={pickupInfo.phone}
            onChangeText={(text) => setPickupInfo(prev => ({ ...prev, phone: text }))}
            keyboardType="phone-pad"
          />
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.primary, width: '100%' }]}
            onPress={handleConfirmSubmit}
            disabled={isSubmitting}
          >
            <Text style={styles.actionButtonText}>{isSubmitting ? 'Confirmation...' : 'Confirmer et Envoyer'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelButton} onPress={() => setIsConfirmModalVisible(false)}>
            <Text style={styles.cancelButtonText}>Annuler</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const renderRejectModal = () => (
    <Modal
      transparent={true}
      visible={isRejectModalVisible}
      animationType="slide"
      onRequestClose={() => setIsRejectModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>Rejeter la Commande</Text>
          <Text style={styles.modalSubtitle}>
            Veuillez indiquer au client pourquoi vous annulez sa commande.
          </Text>
          <TextInput
            style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
            placeholder="Motif du rejet (ex: produit en rupture de stock, hors de la zone de livraison...)"
            value={rejectionInfo.reason}
            onChangeText={(text) => setRejectionInfo(prev => ({ ...prev, reason: text }))}
            multiline
          />
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.error, width: '100%' }]}
            onPress={rejectOrderWithReason}
            disabled={isSubmitting}
          >
            <Text style={styles.actionButtonText}>{isSubmitting ? 'Annulation...' : 'Confirmer le Rejet'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelButton} onPress={() => setIsRejectModalVisible(false)}>
            <Text style={styles.cancelButtonText}>Retour</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  if (isLoading) {
    return <SafeAreaView style={commonStyles.container}><View style={styles.loadingContainer}><ActivityIndicator size="large" color={colors.primary} /><Text style={styles.loadingText}>Chargement des ventes...</Text></View></SafeAreaView>;
  }

  return (
    <SafeAreaView style={commonStyles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}><Icon name="arrow-back" size={24} color={colors.text} /></TouchableOpacity>
        <Text style={styles.headerTitle}>Mes Ventes</Text>
      </View>

      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          {orders.length === 0 ? (
            <View style={styles.emptyState}>
              <Icon name="bag" size={48} color={colors.textSecondary} />
              <Text style={styles.emptyStateText}>Aucune vente pour le moment</Text>
              <Text style={styles.emptyStateSubtext}>Vos ventes apparaîtront ici.</Text>
            </View>
          ) : (
            orders.map(renderOrderCard)
          )}
        </View>
      </ScrollView>

      {selectedOrder && renderOrderDetail()}
      {renderConfirmModal()}
      {renderRejectModal()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  backButton: { marginRight: 16 },
  headerTitle: { fontSize: 24, fontWeight: '700', color: colors.text },
  scrollView: { flex: 1 },
  content: { padding: 20 },
  orderCard: { backgroundColor: colors.backgroundAlt, borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.border },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  orderInfo: { flex: 1 },
  orderId: { fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 4 },
  buyerName: { fontSize: 14, color: colors.primary, fontWeight: '500', marginBottom: 2 },
  orderDate: { fontSize: 14, color: colors.textSecondary },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  statusText: { fontSize: 12, fontWeight: '600' },
  orderDetails: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', borderTopWidth: 1, borderTopColor: colors.border, marginTop: 12, paddingTop: 12 },
  orderAmount: { fontSize: 18, fontWeight: '700', color: colors.success },
  orderItems: { fontSize: 14, color: colors.textSecondary, flexShrink: 1, textAlign: 'right' },
  priceBreakdown: { fontSize: 12, color: colors.textSecondary, fontStyle: 'italic' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyStateText: { fontSize: 18, fontWeight: '600', color: colors.text, marginTop: 16, marginBottom: 8 },
  emptyStateSubtext: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  orderDetailContainer: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.background, zIndex: 10 },
  detailHeader: { flexDirection: 'row', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: colors.border },
  closeButton: { marginRight: 16 },
  detailTitle: { fontSize: 20, fontWeight: '700', color: colors.text },
  detailSection: { padding: 20, borderBottomWidth: 1, borderBottomColor: colors.border },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  detailLabel: { fontSize: 16, color: colors.textSecondary },
  detailValue: { fontSize: 16, fontWeight: '600', color: colors.text },
  totalRow: { borderTopWidth: 1, borderTopColor: colors.border, marginTop: 8, paddingTop: 12 },
  totalLabel: { fontSize: 18, fontWeight: '700' },
  totalValue: { fontSize: 22, fontWeight: '700', color: colors.success },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 16 },
  actionButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 12, gap: 8, marginBottom: 12 },
  actionButtonText: { fontSize: 16, fontWeight: '600', color: colors.white },
  actionButtonsContainer: { flexDirection: 'row', gap: 12 },
  acceptButton: { flex: 1, backgroundColor: colors.primary },
  rejectButton: { flex: 1, backgroundColor: colors.error },
  noItemsText: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', padding: 20 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 16, color: colors.textSecondary },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 4 },
  itemQuantity: { fontSize: 14, color: colors.textSecondary },
  itemPrice: { fontSize: 16, fontWeight: '600', color: colors.success },
  productImage: { width: 50, height: 50, borderRadius: 8, marginRight: 12, backgroundColor: colors.border },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  modalContainer: {
    width: '90%',
    backgroundColor: colors.background,
    borderRadius: 16,
    padding: 20,
  },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
  },
  cancelButton: {
    marginTop: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: colors.textSecondary,
    fontSize: 16,
  },
});
