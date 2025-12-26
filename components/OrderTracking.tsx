import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, TextInput, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, commonStyles } from '../styles/commonStyles';
import Icon from './Icon'; // Importation correcte
import SimpleBottomSheet from './BottomSheet';
import { supabase, getMarketplaceImageUrl } from '../config'; // Importer la fonction pour les images
import { router } from 'expo-router';
import Toast from 'react-native-toast-message';

interface Order {
  id: string;
  seller_id: string;
  total_price: number; // Corresponds to total_price in DB
  status: string;
  created_at: string;
  delivery_address: any;
  quantity: number;
  marketplace_products: {
    name: string;
    image?: string;
  } | null;
  deliveries?: any[];
  delivery_requested?: boolean;
  // Propriétés pour le mode driver
  delivery_id?: string;
  driver_earnings?: number;
  delivery_created_at?: string;
  buyer_name?: string;
}

interface OrderStatus {
  key: string;
  label: string;
  description: string;
  icon: string;
  color: string;
  completed: boolean;
}

interface OrderTrackingProps {
  mode: 'customer' | 'driver';
}

export default function OrderTracking({ mode }: OrderTrackingProps) {
  const [currentOrders, setCurrentOrders] = useState<Order[]>([]);
  const [pastOrders, setPastOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRatingVisible, setIsRatingVisible] = useState(false);
  const [ratingData, setRatingData] = useState({
    productQuality: 5,
    communication: 5,
    deliveryTime: 5,
    serviceQuality: 5,
    reviewText: ''
  });

  const confirmDelivery = async (deliveryId: string) => {
    try {
      const { error } = await supabase.from('deliveries').update({ customer_confirmed: true, customer_confirmation_time: new Date().toISOString() }).eq('id', deliveryId);
      if (error) throw error;
      Toast.show({ type: 'success', text1: 'Confirmation reçue', text2: 'Merci d\'avoir confirmé la réception de votre commande.' });
      loadOrders();
    } catch (error: any) {
      console.error('❌ Error confirming delivery:', error);
      Toast.show({ type: 'error', text1: 'Erreur', text2: 'Impossible de confirmer la réception' });
    }
  };

  const handleRateSeller = (order: Order) => {
    setSelectedOrder(order);
    setIsRatingVisible(true);
  };

  const handleAddLocation = (order: Order) => {
    Toast.show({ type: 'info', text1: 'Fonctionnalité à venir', text2: 'L\'ajout de localisation sera bientôt disponible' });
  };

  const updateDeliveryStatus = async (deliveryId: string, newStatus: string) => {
    try {
      const { error } = await supabase.from('deliveries').update({ status: newStatus }).eq('id', deliveryId);
      if (error) throw error;
      Toast.show({ type: 'success', text1: 'Statut mis à jour', text2: 'Le statut de la livraison a été modifié avec succès.' });
      loadOrders();
    } catch (error: any) {
      console.error('❌ Error updating delivery status:', error);
      Toast.show({ type: 'error', text1: 'Erreur', text2: 'Impossible de mettre à jour le statut de la livraison' });
    }
  };

  const submitSellerRating = async () => {
    try {
      if (!selectedOrder) return;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Toast.show({ type: 'error', text1: 'Erreur', text2: 'Vous devez être connecté' });
        return;
      }
      const overallRating = (ratingData.productQuality + ratingData.communication + ratingData.deliveryTime + ratingData.serviceQuality) / 4;
      const { error } = await supabase.from('seller_ratings').insert({ seller_id: selectedOrder.seller_id, buyer_id: user.id, order_id: selectedOrder.id, product_quality: ratingData.productQuality, communication: ratingData.communication, delivery_time: ratingData.deliveryTime, service_quality: ratingData.serviceQuality, overall_rating: overallRating, review_text: ratingData.reviewText.trim() || null });
      if (error) throw error;
      Toast.show({ type: 'success', text1: 'Merci !', text2: 'Votre avis a été enregistré avec succès.' });
      setIsRatingVisible(false);
      setRatingData({ productQuality: 5, communication: 5, deliveryTime: 5, serviceQuality: 5, reviewText: '' });
    } catch (error: any) {
      console.error('❌ Error submitting rating:', error);
      Toast.show({ type: 'error', text1: 'Erreur', text2: 'Impossible d\'enregistrer votre avis' });
    }
  };

  const renderStarRating = (field: keyof typeof ratingData, label: string) => (
    <View style={styles.ratingRow}>
      <Text style={styles.ratingLabel}>{label}</Text>
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map(star => (
          <TouchableOpacity key={star} onPress={() => setRatingData(prev => ({ ...prev, [field]: star }))}>
            <Icon name="star" size={24} color={star <= (ratingData[field] as number) ? colors.warning : colors.border} />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Toast.show({ type: 'error', text1: 'Erreur', text2: 'Vous devez être connecté' });
        return;
      }

      if (mode === 'driver') {
        // Pour un livreur, utiliser la nouvelle vue optimisée
        // Cette vue est sécurisée par la fonction `get_driver_deliveries_for_current_user`
        const { data, error } = await supabase
          .from('driver_deliveries_view')
          .select('*')
          .order('delivery_created_at', { ascending: false });
        
        if (error) throw error;
        // Pour un livreur, toutes les livraisons sont considérées comme "passées" dans cet écran d'historique.
        // On pourrait ajouter un filtre sur le statut si on voulait séparer "en cours" et "terminées".
        setPastOrders(data || []);
        setCurrentOrders([]);
      } else {
        // Pour un client, utiliser la logique existante
        const { data, error } = await supabase
          .from('orders')
          .select(`*, marketplace_products ( name, image ), deliveries(id, status, driver_id, estimated_delivery_time, customer_confirmed, driver_confirmed)`)
          .eq('buyer_id', user.id)
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        const current = (data || []).filter(order => {
          const delivery = order.deliveries?.[0];
          // Reste "en cours" si le statut de base n'est pas final OU si la livraison est en cours OU si elle est livrée mais pas encore confirmée par le client.
          return !['delivered', 'cancelled'].includes(order.status) || 
                 (delivery && !['delivered', 'cancelled'].includes(delivery.status)) ||
                 (delivery && delivery.status === 'delivered' && !delivery.customer_confirmed);
        });

        const past = (data || []).filter(order => {
          const delivery = order.deliveries?.[0];
          // Passe en "passée" seulement si le statut est final ET (pas de livraison OU livraison confirmée).
          return order.status === 'cancelled' || 
                 (order.status === 'delivered' && (!delivery || delivery.customer_confirmed));
        });

        setCurrentOrders(current as any);
        setPastOrders(past as any);
      }
    } catch (error: any) {
      console.error('❌ Error loading orders:', error);
      Toast.show({ type: 'error', text1: 'Erreur', text2: 'Impossible de charger les commandes' });
    } finally {
      setIsLoading(false);
    }
  };

  const getOrderStatusSteps = (order: Order): OrderStatus[] => {
    const delivery = order.deliveries?.[0];
    const baseSteps: OrderStatus[] = [
      { key: 'pending', label: 'Commande reçue', description: 'Votre commande a été enregistrée', icon: 'checkmark-circle', color: colors.primary, completed: true },
      { key: 'confirmed', label: 'Confirmée', description: 'Commande confirmée par le vendeur', icon: 'checkmark-circle', color: colors.primary, completed: ['confirmed', 'preparing', 'ready', 'delivered'].includes(order.status) },
      { key: 'preparing', label: 'En préparation', description: 'Le vendeur prépare votre commande', icon: 'bag', color: colors.warning, completed: ['preparing', 'ready', 'delivered'].includes(order.status) },
    ];
    const deliverySteps: OrderStatus[] = [];
    if (order.delivery_requested) {
      deliverySteps.push(
        { key: 'ready', label: 'Prête', description: 'Commande prête pour la livraison', icon: 'cube', color: colors.warning, completed: ['ready', 'delivered'].includes(order.status) },
        { key: 'accepted', label: 'Livreur trouvé', description: 'Un livreur a accepté votre commande', icon: 'car', color: colors.accent, completed: delivery ? ['accepted', 'picked_up', 'in_transit', 'delivered'].includes(delivery.status) : false },
        { key: 'picked_up', label: 'Récupérée', description: 'Le livreur a récupéré votre commande', icon: 'car', color: colors.accent, completed: delivery ? ['picked_up', 'in_transit', 'delivered'].includes(delivery.status) : false },
        { key: 'in_transit', label: 'En livraison', description: 'Votre commande est en route', icon: 'navigate', color: colors.accent, completed: delivery ? ['in_transit', 'delivered'].includes(delivery.status) : false },
        { key: 'delivered', label: 'Livrée', description: delivery?.customer_confirmed ? 'Commande livrée et confirmée' : 'Commande livrée - En attente de votre confirmation', icon: delivery?.customer_confirmed ? 'checkmark-circle' : 'time', color: delivery?.customer_confirmed ? colors.success : colors.warning, completed: delivery?.status === 'delivered' && delivery?.customer_confirmed, }
      );
    } else {
      deliverySteps.push({ key: 'ready_pickup', label: 'Prêt pour retrait', description: 'Votre commande est prête à être retirée', icon: 'storefront', color: colors.success, completed: order.status === 'ready' || order.status === 'delivered' });
    }
    return [...baseSteps, ...deliverySteps];
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return colors.warning; case 'confirmed': return colors.primary; case 'preparing': return colors.warning; case 'ready': return colors.accent; case 'delivered': return colors.success; case 'cancelled': return colors.error; default: return colors.textSecondary;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'En attente'; case 'confirmed': return 'Confirmée'; case 'preparing': return 'En préparation'; case 'ready': return 'Prête'; case 'delivered': return 'Livrée'; case 'cancelled': return 'Annulée'; default: return status;
    }
  };

  const renderOrderCard = (order: any, isCurrent: boolean = false) => {
    if (mode === 'driver') {
      // Vue pour l'historique du livreur
      return (
        <TouchableOpacity key={order.delivery_id} style={styles.orderCard} onPress={() => setSelectedOrder(order)}>
          <View style={styles.driverCardHeader}>
            <View>
              <Text style={styles.orderId}>Livraison #{order.delivery_id.slice(-8)}</Text>
              <Text style={styles.orderDate}>{new Date(order.delivery_created_at).toLocaleDateString('fr-FR')}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) + '20' }]}>
              <Text style={[styles.statusText, { color: getStatusColor(order.status) }]}>{getStatusText(order.status)}</Text>
            </View>
          </View>
          <View style={styles.driverCardBody}>
            <View style={styles.driverInfo}>
              <Icon name="person-outline" size={16} color={colors.textSecondary} />
              <Text style={styles.driverInfoText}>Client: {order.buyer_name || 'Inconnu'}</Text>
            </View>
            <View style={styles.driverCommission}>
              <Text style={styles.driverCommissionLabel}>Vos Gains</Text>
              <View style={styles.commissionValueContainer}>
                <Icon name="cash-outline" size={20} color={colors.success} />
                <Text style={styles.driverCommissionValue}>{order.driver_earnings?.toLocaleString() || '0'} CFA</Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      );
    }
    // Vue par défaut pour le client
    return (
      <TouchableOpacity key={order.id} style={styles.orderCard} onPress={() => setSelectedOrder(order)}>
        <View style={styles.cardContent}>
          {order.marketplace_products?.image && supabase && <Image source={{ uri: getMarketplaceImageUrl(order.marketplace_products.image) }} style={styles.productImage} />}
          <View style={styles.cardTextContainer}>
            <View style={styles.orderHeader}>
              <View style={styles.orderInfo}>
                <Text style={styles.orderId}>Commande #{order.id.slice(-8)}</Text>
                <Text style={styles.orderDate}>{new Date(order.created_at).toLocaleDateString('fr-FR')}</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) + '20' }]}>
                <Text style={[styles.statusText, { color: getStatusColor(order.status) }]}>{getStatusText(order.status)}</Text>
              </View>
            </View>
            {/* --- AJOUT : Logique de rattrapage pour le paiement --- */}
            {/* Si la commande est confirmée, on affiche un bouton pour payer, au cas où la notification aurait été manquée. */}
            {isCurrent && order.status === 'pending_payment' && (
              <TouchableOpacity 
                style={styles.payButton}
                onPress={() => router.push({ pathname: '/order-payment', params: { orderId: order.id } })}
              >
                <Text style={styles.payButtonText}>Payer cette commande</Text>
              </TouchableOpacity>
            )}
            <View style={styles.orderDetails}>
              <Text style={styles.orderAmount}>{order.total_price?.toLocaleString() || '0'} CFA</Text>
              <Text style={styles.orderItems}>{order.quantity || 1} article{order.quantity > 1 ? 's' : ''}</Text>
            </View>
            {order.marketplace_products && (
              <View style={styles.orderProducts}>
                <View style={styles.productItem}>
                  <Text style={styles.productName} numberOfLines={1}>{order.quantity} x {order.marketplace_products.name || 'Produit inconnu'}</Text>
                </View>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderOrderDetail = () => {
    if (!selectedOrder) return null;

    if (mode === 'driver') {
      // Vue détaillée pour le livreur avec boutons d'action
      return (
        <View style={styles.orderDetailContainer}>
          <View style={styles.detailHeader}>
            <TouchableOpacity style={styles.closeButton} onPress={() => setSelectedOrder(null)}><Icon name="close" size={24} color={colors.text} /></TouchableOpacity>
            <Text style={styles.detailTitle}>Détails de la livraison</Text>
          </View>
          <View style={styles.orderSummary}>
            <Text style={styles.summaryId}>Livraison #{selectedOrder.delivery_id?.slice(-8)}</Text>
            <Text style={styles.summaryAmount}>Gains: {selectedOrder.driver_earnings?.toLocaleString() || '0'} CFA</Text>
            <Text style={styles.summaryDate}>{new Date(selectedOrder.delivery_created_at || '').toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</Text>
          </View>
          <View style={styles.itemsSection}>
            <Text style={styles.sectionTitle}>Informations client</Text>
            <View style={styles.itemRow}>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>Client: {selectedOrder.buyer_name || 'Inconnu'}</Text>
                <Text style={styles.itemQuantity}>Adresse: {selectedOrder.delivery_address ? `${selectedOrder.delivery_address.city}, ${selectedOrder.delivery_address.street}` : 'Non spécifiée'}</Text>
              </View>
            </View>
          </View>
          <View style={styles.deliverySection}>
            <Text style={styles.sectionTitle}>Statut actuel: {getStatusText(selectedOrder.status)}</Text>
          </View>
          {selectedOrder.status === 'ready' && (
            <TouchableOpacity style={styles.acceptButton} onPress={() => updateDeliveryStatus(selectedOrder.delivery_id!, 'accepted')}>
              <Icon name="checkmark-circle" size={20} color={colors.white} />
              <Text style={styles.acceptButtonText}>Accepter la livraison</Text>
            </TouchableOpacity>
          )}
          {selectedOrder.status === 'accepted' && (
            <TouchableOpacity style={styles.pickupButton} onPress={() => updateDeliveryStatus(selectedOrder.delivery_id!, 'picked_up')}>
              <Icon name="bag" size={20} color={colors.white} />
              <Text style={styles.pickupButtonText}>Commande récupérée</Text>
            </TouchableOpacity>
          )}
          {selectedOrder.status === 'picked_up' && (
            <TouchableOpacity style={styles.transitButton} onPress={() => updateDeliveryStatus(selectedOrder.delivery_id!, 'in_transit')}>
              <Icon name="car" size={20} color={colors.white} />
              <Text style={styles.transitButtonText}>Activer en cours</Text>
            </TouchableOpacity>
          )}
          {selectedOrder.status === 'in_transit' && (
            <TouchableOpacity style={styles.deliveredButton} onPress={() => updateDeliveryStatus(selectedOrder.delivery_id!, 'delivered')}>
              <Icon name="checkmark-circle" size={20} color={colors.white} />
              <Text style={styles.deliveredButtonText}>Marquer comme livré</Text>
            </TouchableOpacity>
          )}
        </View>
      );
    }

    // Vue détaillée pour le client (existante)
    const statusSteps = getOrderStatusSteps(selectedOrder);
    return (
      <View style={styles.orderDetailContainer}>
        <View style={styles.detailHeader}>
          <TouchableOpacity style={styles.closeButton} onPress={() => setSelectedOrder(null)}><Icon name="close" size={24} color={colors.text} /></TouchableOpacity>
          <Text style={styles.detailTitle}>Détails de la commande</Text>
        </View>
        <View style={styles.orderSummary}>
          <Text style={styles.summaryId}>Commande #{selectedOrder.id.slice(-8)}</Text>
          <Text style={styles.summaryAmount}>{selectedOrder.total_price?.toLocaleString() || '0'} CFA</Text>
          <Text style={styles.summaryDate}>{new Date(selectedOrder.created_at).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</Text>
        </View>
        <View style={styles.statusTimeline}>
          <Text style={styles.timelineTitle}>Suivi de la commande</Text>
          {statusSteps.map((step, index) => (
            <View key={step.key} style={styles.timelineStep}>
              <View style={styles.timelineLine}>{index < statusSteps.length - 1 && <View style={[styles.timelineConnector, step.completed && styles.timelineConnectorActive]} />}</View>
              <View style={[styles.timelineContent, step.completed && styles.timelineContentActive]}>
                <View style={[styles.stepIcon, { backgroundColor: step.completed ? step.color : colors.border }]}><Icon name={step.icon as any} size={16} color={step.completed ? colors.white : colors.textSecondary} /></View>
                <View style={styles.stepInfo}><Text style={[styles.stepTitle, step.completed && { color: step.color }]}>{step.label}</Text><Text style={styles.stepDescription}>{step.description}</Text></View>
              </View>
            </View>
          ))}
        </View>
        <View style={styles.itemsSection}>
          <Text style={styles.sectionTitle}>Article commandé</Text>
          {selectedOrder.marketplace_products ? (
            <View style={styles.itemRow}>
              {selectedOrder.marketplace_products.image && supabase && <Image source={{ uri: getMarketplaceImageUrl(selectedOrder.marketplace_products.image) }} style={styles.productImage} />}
              <View style={styles.itemInfo}><Text style={styles.itemName}>{selectedOrder.marketplace_products.name}</Text><Text style={styles.itemQuantity}>Quantité : {selectedOrder.quantity}</Text></View>
              <Text style={styles.itemPrice}>{selectedOrder.total_price?.toLocaleString() || '0'} CFA</Text>
            </View>
          ) : (
            <Text style={styles.noItemsText}>Détail de l\'article non disponible.</Text>
          )}
        </View>
        {selectedOrder.delivery_address && (
          <View style={styles.deliverySection}>
            <Text style={styles.sectionTitle}>Adresse de livraison</Text>
            <View style={styles.addressInfo}><Icon name="location" size={20} color={colors.orange} /><View style={styles.addressText}><Text style={styles.addressCity}>{selectedOrder.delivery_address.city}</Text><Text style={styles.addressDetails}>{selectedOrder.delivery_address.street}</Text></View></View>
          </View>
        )}
        {selectedOrder.deliveries && selectedOrder.deliveries.length > 0 && selectedOrder.deliveries[0].status === 'delivered' && !selectedOrder.deliveries[0].customer_confirmed && (
          <TouchableOpacity style={styles.confirmButton} onPress={() => confirmDelivery(selectedOrder.deliveries![0].id)}><Icon name="checkmark-circle" size={20} color={colors.white} /><Text style={styles.confirmButtonText}>Confirmer la réception</Text></TouchableOpacity>
        )}
        {selectedOrder.deliveries && selectedOrder.deliveries.length > 0 && selectedOrder.deliveries[0].status === 'delivered' && selectedOrder.deliveries[0].customer_confirmed && (
          <TouchableOpacity style={styles.rateButton} onPress={() => handleRateSeller(selectedOrder)}><Icon name="star" size={20} color={colors.white} /><Text style={styles.rateButtonText}>Noter le vendeur</Text></TouchableOpacity>
        )}
        <TouchableOpacity style={styles.locationButton} onPress={() => handleAddLocation(selectedOrder)}><Icon name="location" size={20} color={colors.white} /><Text style={styles.locationButtonText}>{selectedOrder.delivery_address ? 'Modifier l\'adresse' : 'Ajouter une adresse'}</Text></TouchableOpacity>
        {selectedOrder.status !== 'delivered' && selectedOrder.status !== 'cancelled' && (
          <TouchableOpacity style={styles.contactButton}><Icon name="chatbubble" size={20} color={colors.white} /><Text style={styles.contactButtonText}>Contacter le support</Text></TouchableOpacity>
        )}
      </View>
    );
  };

  if (isLoading) {
    return <SafeAreaView style={commonStyles.container}><View style={styles.loadingContainer}><ActivityIndicator size="large" color={colors.primary} /><Text style={styles.loadingText}>Chargement des commandes...</Text></View></SafeAreaView>;
  }

  return (
    <SafeAreaView style={commonStyles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}><Icon name="arrow-back" size={24} color={colors.text} /></TouchableOpacity><Text style={styles.headerTitle}>{mode === 'driver' ? 'Historique des Livraisons' : 'Mes Commandes'}</Text>
      </View>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {currentOrders.length > 0 && <View style={styles.section}><Text style={styles.sectionTitleNew}>Commandes en cours</Text>{currentOrders.map(order => renderOrderCard(order, true))}</View>}
          {pastOrders.length > 0 && <View style={styles.section}><Text style={styles.sectionTitleNew}>Commandes passées</Text>{pastOrders.map(order => renderOrderCard(order, false))}</View>}
          {currentOrders.length === 0 && pastOrders.length === 0 && (
            <View style={styles.emptyState}><Icon name="bag" size={48} color={colors.textSecondary} /><Text style={styles.emptyStateText}>Aucune commande trouvée</Text><Text style={styles.emptyStateSubtext}>Vos commandes apparaîtront ici une fois que vous aurez passé une commande</Text></View>
          )}
        </View>
      </ScrollView>
      {selectedOrder && renderOrderDetail()}
      <SimpleBottomSheet isVisible={isRatingVisible} onClose={() => setIsRatingVisible(false)}>
        <View style={styles.ratingContainer}>
          <View style={styles.ratingHeader}><TouchableOpacity onPress={() => setIsRatingVisible(false)} style={styles.closeButton}><Icon name="close" size={24} color={colors.text} /></TouchableOpacity><Text style={styles.ratingTitle}>Noter le vendeur</Text></View>
          <ScrollView style={styles.ratingScrollView}>
            <Text style={styles.ratingSubtitle}>Votre avis nous aide à améliorer la qualité du service</Text>
            {renderStarRating('productQuality', 'Qualité du produit')}
            {renderStarRating('communication', 'Communication')}
            {renderStarRating('deliveryTime', 'Délai de livraison')}
            {renderStarRating('serviceQuality', 'Service général')}
            <View style={styles.reviewTextContainer}>
              <Text style={styles.reviewTextLabel}>Commentaire (optionnel)</Text>
              <TextInput style={styles.reviewTextInput} placeholder="Partagez votre expérience..." multiline numberOfLines={4} value={ratingData.reviewText} onChangeText={(text) => setRatingData(prev => ({ ...prev, reviewText: text }))} maxLength={500} />
              <Text style={styles.characterCount}>{ratingData.reviewText.length}/500</Text>
            </View>
          </ScrollView>
          <TouchableOpacity style={styles.submitRatingButton} onPress={submitSellerRating}><Icon name="checkmark-circle" size={20} color={colors.white} /><Text style={styles.submitRatingButtonText}>Publier mon avis</Text></TouchableOpacity>
        </View>
      </SimpleBottomSheet>
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
  cardContent: { flexDirection: 'row' },
  productImage: { width: 60, height: 60, borderRadius: 8, marginRight: 12, backgroundColor: colors.border },
  cardTextContainer: { flex: 1 },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  orderInfo: { flex: 1 },
  orderId: { fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 4 },
  orderDate: { fontSize: 14, color: colors.textSecondary },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  statusText: { fontSize: 12, fontWeight: '600' },
  orderDetails: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  orderAmount: { fontSize: 18, fontWeight: '700', color: colors.success },
  orderItems: { fontSize: 14, color: colors.textSecondary },
  orderProducts: { marginTop: 8 },
  productItem: { flexDirection: 'row' },
  productName: { fontSize: 14, color: colors.textSecondary, flex: 1 },
  section: { marginBottom: 24 },
  sectionTitleNew: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 16 },
  emptyState: { padding: 40, alignItems: 'center', justifyContent: 'center', flex: 1 },
  emptyStateText: { fontSize: 18, fontWeight: '600', color: colors.text, marginTop: 16, marginBottom: 8 },
  emptyStateSubtext: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  orderDetailContainer: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.background, zIndex: 10 },
  detailHeader: { flexDirection: 'row', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: colors.border },
  closeButton: { marginRight: 16 },
  detailTitle: { fontSize: 20, fontWeight: '700', color: colors.text },
  orderSummary: { padding: 20 },
  summaryId: { fontSize: 18, fontWeight: '600', color: colors.text, marginBottom: 8 },
  summaryAmount: { fontSize: 24, fontWeight: '700', color: colors.success, marginBottom: 4 },
  summaryDate: { fontSize: 14, color: colors.textSecondary },
  itemsSection: { padding: 20, borderTopWidth: 1, borderTopColor: colors.border, marginTop: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 16 },
  itemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  itemInfo: { flex: 1, marginLeft: 12 },
  itemName: { fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 4 },
  itemQuantity: { fontSize: 14, color: colors.textSecondary },
  itemPrice: { fontSize: 16, fontWeight: '600', color: colors.success },
  noItemsText: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', padding: 20 },
  deliverySection: { padding: 20, paddingTop: 0 },
  addressInfo: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.orange + '20', padding: 16, borderRadius: 8, gap: 12 },
  addressText: { flex: 1 },
  addressCity: { fontSize: 16, fontWeight: '600', color: colors.orange, marginBottom: 2 },
  addressDetails: { fontSize: 14, color: colors.textSecondary },
  contactButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, margin: 20, marginTop: 0, paddingVertical: 16, borderRadius: 12, gap: 8 },
  contactButtonText: { fontSize: 16, fontWeight: '600', color: colors.white },
  confirmButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.success, margin: 20, marginTop: 0, paddingVertical: 16, borderRadius: 12, gap: 8 },
  confirmButtonText: { fontSize: 16, fontWeight: '600', color: colors.white },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 16, color: colors.textSecondary },
  rateButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.warning, margin: 20, marginTop: 0, paddingVertical: 16, borderRadius: 12, gap: 8 },
  rateButtonText: { fontSize: 16, fontWeight: '600', color: colors.white },
  ratingContainer: { flex: 1 },
  ratingHeader: { flexDirection: 'row', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: colors.border },
  ratingTitle: { fontSize: 20, fontWeight: '700', color: colors.text, flex: 1, textAlign: 'center', marginRight: 40 },
  ratingScrollView: { flex: 1, padding: 20 },
  ratingSubtitle: { fontSize: 16, color: colors.textSecondary, textAlign: 'center', marginBottom: 24 },
  ratingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  ratingLabel: { fontSize: 16, fontWeight: '600', color: colors.text, flex: 1 },
  starsContainer: { flexDirection: 'row', gap: 4 },
  reviewTextContainer: { marginTop: 20 },
  reviewTextLabel: { fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 8 },
  reviewTextInput: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 12, fontSize: 16, minHeight: 100, textAlignVertical: 'top', color: colors.text },
  characterCount: { fontSize: 12, color: colors.textSecondary, textAlign: 'right', marginTop: 4 },
  submitRatingButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.success, margin: 20, paddingVertical: 16, borderRadius: 12, gap: 8 },
  submitRatingButtonText: { fontSize: 16, fontWeight: '600', color: colors.white },
  orderProducts: { marginTop: 8, gap: 4 },
  productItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 2 },
  productName: { fontSize: 12, color: colors.textSecondary, flex: 1 },
  productPrice: { fontSize: 12, color: colors.success, fontWeight: '600' },
  moreProducts: { fontSize: 12, color: colors.textSecondary, fontStyle: 'italic', textAlign: 'center', marginTop: 4 },
  acceptButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.success, margin: 20, marginTop: 0, paddingVertical: 16, borderRadius: 12, gap: 8 },
  acceptButtonText: { fontSize: 16, fontWeight: '600', color: colors.white },
  pickupButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.warning, margin: 20, marginTop: 0, paddingVertical: 16, borderRadius: 12, gap: 8 },
  pickupButtonText: { fontSize: 16, fontWeight: '600', color: colors.white },
  transitButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accent, margin: 20, marginTop: 0, paddingVertical: 16, borderRadius: 12, gap: 8 },
  transitButtonText: { fontSize: 16, fontWeight: '600', color: colors.white },
  deliveredButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.success, margin: 20, marginTop: 0, paddingVertical: 16, borderRadius: 12, gap: 8 },
  deliveredButtonText: { fontSize: 16, fontWeight: '600', color: colors.white },
  statusTimeline: { padding: 20, borderTopWidth: 1, borderTopColor: colors.border, marginTop: 20 },
  timelineTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 16 },
  timelineStep: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 },
  timelineLine: { width: 20, alignItems: 'center', marginRight: 12 },
  timelineConnector: { width: 2, height: 20, backgroundColor: colors.border, marginVertical: 4 },
  timelineConnectorActive: { backgroundColor: colors.primary },
  timelineContent: { flex: 1, flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 8, backgroundColor: colors.backgroundAlt },
  timelineContentActive: { backgroundColor: colors.primary + '10', borderWidth: 1, borderColor: colors.primary },
  stepIcon: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  stepInfo: { flex: 1 },
  stepTitle: { fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 4 },
  stepDescription: { fontSize: 14, color: colors.textSecondary },
  locationButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accent, margin: 20, marginTop: 0, paddingVertical: 16, borderRadius: 12, gap: 8 },
  locationButtonText: { fontSize: 16, fontWeight: '600', color: colors.white },
});