import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, Dimensions, Image, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, commonStyles } from '../styles/commonStyles';
import Icon from './Icon';
import { supabase, ensureSupabaseInitialized, getMarketplaceImageUrl } from '../config'; // Import supabase directly
import { router } from 'expo-router';
import Toast from 'react-native-toast-message';

const { width } = Dimensions.get('window');

interface DeliveryStats {
  total_deliveries: number;
  active_deliveries: number;
  completed_today: number;
  total_earnings: number;
  avg_rating: number;
}

interface RecentDelivery {
  id: string;
  order_id: string;
  status: string;
  driver_earning: number;
  created_at: string;
  customer_location: string;
  items_count: number;
  // Extended properties for full seller dashboard
  total_amount?: number;
  items_summary?: {
    product_name: string;
    image?: string;
    quantity: number;
  }[];
  buyer_name?: string;
  delivery_fee?: number;
  grand_total?: number;
}

export default function DeliveryDashboard() {
  const [stats, setStats] = useState<DeliveryStats | null>(null);
  const [recentDeliveries, setRecentDeliveries] = useState<RecentDelivery[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState<'customer' | 'driver' | 'seller' | null>(null);
  const [availableRoles, setAvailableRoles] = useState<string[]>([]);
  const [showRoleSelector, setShowRoleSelector] = useState(false);
  // Ajout de l'état pour les badges
  const [badgeCounts, setBadgeCounts] = useState({
    pending: 0,
    processing: 0,
    rejected: 0
  });

  // Seller Management State
  const [selectedOrder, setSelectedOrder] = useState<RecentDelivery | null>(null);
  const [isConfirmModalVisible, setIsConfirmModalVisible] = useState(false);
  const [pickupInfo, setPickupInfo] = useState({
    address: '',
    phone: '',
    orderToConfirm: null as RecentDelivery | null,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRejectModalVisible, setIsRejectModalVisible] = useState(false);
  const [rejectionInfo, setRejectionInfo] = useState({
    reason: '',
    orderToReject: null as RecentDelivery | null,
  });

  useEffect(() => {
    // --- CORRECTION : Utiliser onAuthStateChange pour une gestion fiable de la session ---
    // S'abonner aux changements d'état d'authentification.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN') {
        // Cet événement se déclenche lorsque la session est chargée (y compris depuis le cache).
        if (session?.user) {
          loadDashboardData(session.user.id); // On passe l'ID de l'utilisateur
        } else {
          // Si aucune session n'est trouvée, on refuse l'accès.
          Alert.alert('Accès refusé', 'Vous devez être connecté pour accéder à cet espace.', [
            { text: 'Retour', style: 'cancel', onPress: () => router.back() }
          ]);
          setIsLoading(false);
        }
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const loadDashboardData = async (userId: string) => {
    try {
      setIsLoading(true); // S'assurer que le chargement est activé

      // Check all available roles for this user
      const roles: string[] = [];

      // Check if driver - only if approved
      try {
        const { data: driverData, error: driverError } = await supabase
          .from('livreur_verifications')
          .select('id, verification_status')
          .eq('user_id', userId) // Utiliser l'ID passé en paramètre
          .eq('verification_status', 'approved')
          .limit(1)
          .maybeSingle();

        if (driverError) {
          console.error('Error checking driver status:', driverError);
        }

        if (!driverData) {
          Alert.alert(
            'Inscription requise',
            'Vous devez vous inscrire en tant que livreur pour accéder à cette fonctionnalité.'
          );
        }
        console.log('Driver check result:', { driverData, driverError, userId: userId });

        if (driverData && !driverError) {
          roles.push('driver');
          console.log('Driver role added to available roles');
        }
      } catch (error) {
        console.error('Error checking driver status:', error);
      }

      // Check if seller
      const { data: products } = await supabase
        .from('marketplace_products')
        .select('id')
        .eq('seller_id', userId) // Utiliser l'ID passé en paramètre
        .limit(1);

      if (products && products.length > 0) {
        roles.push('seller');
      }

      // Check if customer (has orders)
      const { data: orders } = await supabase
        .from('orders')
        .select('id')
        .eq('buyer_id', userId) // Utiliser l'ID passé en paramètre
        .limit(1);

      if (orders && orders.length > 0) {
        roles.push('customer');
      }

      setAvailableRoles(roles);

      // Toujours afficher le sélecteur de rôle en premier (comme demandé)
      setShowRoleSelector(true);

    } catch (error: any) {
      console.error('❌ Error loading dashboard:', error);
      Alert.alert('Erreur', 'Impossible de charger le tableau de bord');
    } finally {
      setIsLoading(false);
    }
  };

  const loadRoleDashboard = async (role: 'customer' | 'driver' | 'seller', userId: string) => {
    switch (role) {
      case 'driver':
        await loadDriverDashboard(userId);
        break;
      case 'seller':
        await loadSellerDashboard(userId);
        break;
      case 'customer':
        await loadCustomerDashboard(userId);
        break;
    }
  };

  const selectRole = async (role: 'customer' | 'driver' | 'seller') => {
    setUserRole(role);
    setShowRoleSelector(false);

    const supabase = await ensureSupabaseInitialized();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      await loadRoleDashboard(role, user.id);
    }
  };

  const loadDriverDashboard = async (userId: string) => {
    try {
      const supabase = await ensureSupabaseInitialized();

      // 1. Récupérer l'ID du livreur depuis la table de vérification
      const { data: driverVerification, error: driverError } = await supabase
        .from('livreur_verifications')
        .select('id')
        .eq('user_id', userId)
        .eq('verification_status', 'approved')
        .limit(1) // S'assurer de ne récupérer qu'une seule entrée au maximum
        .maybeSingle(); // Gérer le cas où aucune entrée n'est trouvée, ou une seule

      if (driverError || !driverVerification) {
        console.error('Driver not found or not approved:', driverError);
        Alert.alert(
          'Accès refusé',
          'Votre profil de livreur n\'est pas trouvé ou n\'a pas encore été approuvé.',
          [{ text: 'Retour', style: 'cancel', onPress: () => router.back() }]
        );
        setIsLoading(false); // Arrêter le chargement
        return; // Arrêter l'exécution de la fonction
      }

      // Get driver stats
      const { data: driverStats } = await supabase
        .from('driver_stats')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      setStats(driverStats);

      // Get recent deliveries
      const { data: deliveries } = await supabase
        .from('deliveries')
        .select(`
          id,
          order_id,
          status,
          created_at,
          order:orders(
            total_price,
            delivery_address
          )
        `)
        .eq('driver_id', driverVerification.id) // Utiliser l'ID du livreur correct
        .order('created_at', { ascending: false })
        .limit(5);

      const formattedDeliveries = deliveries?.map(d => ({
        id: d.id,
        order_id: d.order_id,
        status: d.status,
        total_amount: d.order?.total_price || 0,
        created_at: d.created_at,
        customer_location: d.order?.delivery_address?.city || 'Non spécifié',
        items_count: 1 // Simplified
      })) || [];

      setRecentDeliveries(formattedDeliveries);

    } catch (error: any) {
      console.error('❌ Error loading driver dashboard:', error);
    }
  };

  const loadCustomerDashboard = async (userId: string) => {
    try {
      const supabase = await ensureSupabaseInitialized();

      // Get customer delivery stats
      const { data: orders } = await supabase
        .from('orders')
        .select(`
          id,
          total_price,
          status,
          created_at,
          delivery:deliveries(status)
        `)
        .eq('buyer_id', userId);

      const totalDeliveries = orders?.length || 0;
      const activeDeliveries = orders?.filter(o => o.delivery?.status && ['accepted', 'picked_up', 'in_transit'].includes(o.delivery.status)).length || 0;
      const completedToday = orders?.filter(o =>
        o.delivery?.status === 'delivered' &&
        new Date(o.created_at).toDateString() === new Date().toDateString()
      ).length || 0;

      setStats({
        total_deliveries: totalDeliveries,
        active_deliveries: activeDeliveries,
        completed_today: completedToday,
        total_earnings: 0, // Customers don't earn
        avg_rating: 0
      });

      // Get recent deliveries
      const recentOrders = orders?.filter(o => o.delivery).slice(0, 5) || [];
      const formattedDeliveries = recentOrders.map(o => ({
        id: o.delivery?.id || o.id,
        order_id: o.id,
        status: o.delivery?.status || 'pending',
        total_amount: o.total_price,
        created_at: o.created_at,
        customer_location: 'Votre adresse',
        items_count: 1 // Simplified
      }));

      setRecentDeliveries(formattedDeliveries);

    } catch (error: any) {
      console.error('❌ Error loading customer dashboard:', error);
    }
  };

  const loadSellerDashboard = async (userId: string) => {
    try {
      const supabase = await ensureSupabaseInitialized();

      // Get seller delivery stats (orders from seller's products)
      // Utilisation de jointures avancées pour récupérer toutes les infos nécessaires à l'affichage enrichi
      const { data: orders, error } = await supabase
        .from('orders')
        .select(`
          id,
          buyer_id,
          total_price,
          delivery_fee,
          status,
          created_at,
          buyer_profile:profiles!orders_buyer_id_fkey (full_name),
          order_items (
            quantity,
            product:marketplace_products (name, image)
          ),
          delivery:deliveries(id, status)
        `)
        .eq('seller_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching orders:', error);
        throw error;
      }

      console.log('📦 Loaded Orders:', JSON.stringify(orders?.map(o => ({ id: o.id, buyer: o.buyer_profile })), null, 2));

      const totalDeliveries = orders?.length || 0;

      const pendingCount = orders?.filter(o => o.status === 'pending').length || 0;
      const processingCount = orders?.filter(o =>
        ['confirmed', 'preparing', 'ready'].includes(o.status) ||
        (o.delivery && ['accepted', 'picked_up', 'in_transit'].includes(o.delivery.status))
      ).length || 0;
      const completedToday = orders?.filter(o =>
        (o.status === 'delivered' || o.delivery?.status === 'delivered') &&
        new Date(o.created_at).toDateString() === new Date().toDateString()
      ).length || 0;

      setBadgeCounts({
        pending: pendingCount,
        processing: processingCount,
        rejected: orders?.filter(o => o.status === 'cancelled').length || 0
      });

      setStats({
        total_deliveries: totalDeliveries,
        active_deliveries: processingCount,
        completed_today: completedToday,
        total_earnings: 0,
        avg_rating: 0
      });

      // Transformation complète des données pour l'affichage enrichi
      const fullOrdersData: SellerOrder[] = orders?.map((o: any) => ({
        id: o.delivery?.id || o.id,
        order_id: o.id,
        status: o.delivery?.status || o.status, // Priorité au statut livraison
        created_at: o.created_at,

        // Extended Data
        total_amount: o.total_price,
        delivery_fee: o.delivery_fee,
        grand_total: (o.total_price || 0) + (o.delivery_fee || 0),
        buyer_name: o.buyer_profile?.full_name || 'Client',
        customer_location: 'Client', // Placeholder, idealement l'adresse de livraison
        items_count: o.order_items?.length || 0,

        items_summary: (o.order_items || []).map((item: any) => ({
          product_name: item.product?.name || 'Produit',
          image: item.product?.image,
          quantity: item.quantity || 1,
        })),
        driver_earning: 0, // Not relevant for seller view directly
      })) || [];

      setRecentDeliveries(fullOrdersData);

    } catch (error: any) {
      console.error('❌ Error loading seller dashboard:', error);
      Alert.alert('Erreur', 'Impossible de charger les commandes.');
    }
  };

  // ------------------------------------------------------------------
  // SELLER ORDER MANAGEMENT LOGIC (Ported from seller-orders.tsx)
  // ------------------------------------------------------------------

  const handleConfirmOrderClick = (order: SellerOrder) => {
    setPickupInfo({ address: '', phone: '', orderToConfirm: order });
    setIsConfirmModalVisible(true);
  };

  const handleRejectOrderClick = (order: SellerOrder) => {
    setRejectionInfo({ reason: '', orderToReject: order });
    setIsRejectModalVisible(true);
  };

  const confirmOrderWithPickupInfo = async (orderId: string, pickupInfo: any) => {
    const supabase = await ensureSupabaseInitialized();

    // Validation UUID simple
    if (!orderId || !/^[0-9a-f-]{36}$/i.test(orderId)) {
      throw new Error('ID de commande invalide.');
    }

    const { data, error } = await supabase
      .rpc('confirm_order_with_pickup_info', {
        p_order_id: orderId,
        p_pickup_address: pickupInfo?.address ? {
          address: pickupInfo.address,
          city: null,
          notes: null
        } : null,
        p_pickup_phone: pickupInfo?.phone || null
      });

    if (error) throw error;
    return data;
  };

  const handleConfirmSubmit = async () => {
    if (!pickupInfo.orderToConfirm || !pickupInfo.address.trim() || !pickupInfo.phone.trim()) {
      Toast.show({ type: 'error', text1: 'Champs requis', text2: 'Adresse et téléphone sont obligatoires.' });
      return;
    }

    setIsSubmitting(true);
    try {
      await confirmOrderWithPickupInfo(pickupInfo.orderToConfirm.order_id, {
        address: pickupInfo.address,
        phone: pickupInfo.phone
      });

      // Notification logic (simplified)
      const supabase = await ensureSupabaseInitialized();
      const { error: notifError } = await supabase
        .from('notifications')
        .insert({
          // We need buyer_id here, but we don't have it easily in RecentDelivery without another fetch or prop.
          // For now we rely on trigger or assume the RPC handles status updates which triggers other things.
          // Wait, safe implementation:
          user_id: (await supabase.from('orders').select('buyer_id').eq('id', pickupInfo.orderToConfirm.order_id).single()).data?.buyer_id,
          type: 'order_confirmed',
          title: 'Commande confirmée ! 🎉',
          message: `Votre commande #${pickupInfo.orderToConfirm.order_id.slice(-6)} a été confirmée.`,
          data: { order_id: pickupInfo.orderToConfirm.order_id, action: 'pay_order' }
        });

      Toast.show({ type: 'success', text1: 'Succès', text2: 'Commande confirmée !' });
      setIsConfirmModalVisible(false);
      // Reload dashboard using current user ID
      const { data: { user } } = await supabase.auth.getUser();
      if (user) loadSellerDashboard(user.id);

    } catch (error: any) {
      console.error('❌ Error confirming order:', error);
      Toast.show({ type: 'error', text1: 'Erreur', text2: error.message || 'Échec confirmation.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const rejectOrderWithReason = async () => {
    if (!rejectionInfo.orderToReject || !rejectionInfo.reason.trim()) {
      Toast.show({ type: 'error', text1: 'Motif requis', text2: 'Veuillez indiquer un motif.' });
      return;
    }

    setIsSubmitting(true);
    try {
      const supabase = await ensureSupabaseInitialized();
      const { error } = await supabase
        .from('orders')
        .update({
          status: 'cancelled',
          rejection_reason: rejectionInfo.reason,
        })
        .eq('id', rejectionInfo.orderToReject.order_id);

      if (error) throw error;

      Toast.show({ type: 'success', text1: 'Commande rejetée', text2: 'Commande annulée.' });
      setIsRejectModalVisible(false);

      const { data: { user } } = await supabase.auth.getUser();
      if (user) loadSellerDashboard(user.id);

    } catch (error: any) {
      console.error('❌ Error rejecting order:', error);
      Toast.show({ type: 'error', text1: 'Erreur', text2: 'Échec annulation.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const supabase = await ensureSupabaseInitialized();
      const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', orderId);
      if (error) throw error;
      Toast.show({ type: 'success', text1: 'Statut mis à jour', text2: `Commande ${newStatus}` });

      const { data: { user } } = await supabase.auth.getUser();
      if (user) loadSellerDashboard(user.id);
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Erreur', text2: 'Mise à jour échouée' });
    }
  };


  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return colors.warning;
      case 'accepted': return colors.primary;
      case 'picked_up': return colors.accent;
      case 'in_transit': return colors.accent;
      case 'delivered': return colors.success;
      case 'cancelled': return colors.error;
      default: return colors.textSecondary;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'En attente';
      case 'accepted': return 'Acceptée';
      case 'picked_up': return 'Récupérée';
      case 'in_transit': return 'En livraison';
      case 'delivered': return 'Livrée';
      case 'cancelled': return 'Annulée';
      default: return status;
    }
  };

  const getRoleTitle = () => {
    switch (userRole) {
      case 'driver': return 'Tableau de Bord Livreur';
      case 'customer': return 'Mes Achats & Livraisons';
      case 'seller': return 'Mes Ventes & Livraisons';
      default: return 'Tableau de Bord Livraison';
    }
  };

  const getRoleIcon = () => {
    switch (userRole) {
      case 'driver': return 'car';
      case 'customer': return 'bag';
      case 'seller': return 'storefront';
      default: return 'cube';
    }
  };

  const renderStatsCards = () => {
    if (!stats) return null;

    const statCards = [];

    if (userRole === 'driver') {
      statCards.push(
        { title: 'Total Livraisons', value: stats.total_deliveries, icon: 'car', color: colors.primary },
        { title: 'Aujourd\'hui', value: stats.completed_today, icon: 'checkmark-circle', color: colors.success },
        { title: 'Gains Totaux', value: `${stats.total_earnings?.toLocaleString() || 0} CFA`, icon: 'cash', color: colors.warning },
        { title: 'Note Moyenne', value: stats.avg_rating?.toFixed(1) || '0.0', icon: 'star', color: colors.accent }
      );
    } else if (userRole === 'customer') {
      statCards.push(
        { title: 'Total Commandes', value: stats.total_deliveries, icon: 'bag', color: colors.primary },
        { title: 'En Cours', value: stats.active_deliveries, icon: 'time', color: colors.warning },
        { title: 'Livrées Aujourd\'hui', value: stats.completed_today, icon: 'checkmark-circle', color: colors.success }
      );
    } else if (userRole === 'seller') {
      statCards.push(
        { title: 'Produits Vendus', value: stats.total_deliveries, icon: 'storefront', color: colors.primary },
        { title: 'En Livraison', value: stats.active_deliveries, icon: 'car', color: colors.warning },
        { title: 'Livrées Aujourd\'hui', value: stats.completed_today, icon: 'checkmark-circle', color: colors.success }
      );
    }

    return (
      <View style={styles.statsContainer}>
        {statCards.map((card, index) => (
          <View key={index} style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: card.color + '20' }]}>
              <Icon name={card.icon as any} size={24} color={card.color} />
            </View>
            <Text style={styles.statValue}>{card.value}</Text>
            <Text style={styles.statLabel}>{card.title}</Text>
          </View>
        ))}
      </View>
    );
  };

  const renderRecentDeliveries = () => {
    // ------------------------------------------------------------------
    // SPECIFIC SELLER RENDER (Cards with Actions)
    // ------------------------------------------------------------------
    if (userRole === 'seller') {
      return (
        <View style={styles.recentSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Commandes & Actions</Text>
            <TouchableOpacity onPress={() => router.push('/seller-orders')}>
              <Text style={styles.seeAllText}>Voir tout historique</Text>
            </TouchableOpacity>
          </View>

          {recentDeliveries.length === 0 ? (
            <View style={styles.emptyState}>
              <Icon name="bag" size={48} color={colors.textSecondary} />
              <Text style={styles.emptyStateText}>Aucune commande pour le moment</Text>
            </View>
          ) : (
            recentDeliveries.map(delivery => (
              <View key={delivery.id} style={styles.sellerOrderCard}>
                {/* HEADER CARD */}
                <View style={styles.orderHeader}>
                  {delivery.items_summary?.[0]?.image && (
                    <Image
                      source={{ uri: getMarketplaceImageUrl(delivery.items_summary[0].image) }}
                      style={styles.productImage}
                    />
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.orderId}>#{delivery.order_id.slice(-8)}</Text>
                    <Text style={styles.buyerName}>{delivery.buyer_name || 'Client'}</Text>
                    <Text style={styles.orderDate}>
                      {new Date(delivery.created_at).toLocaleDateString()} • {new Date(delivery.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(delivery.status) + '20' }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(delivery.status) }]}>
                      {getStatusText(delivery.status)}
                    </Text>
                  </View>
                </View>

                {/* DETAILS */}
                <View style={styles.sellerOrderDetails}>
                  <Text style={styles.orderAmount}>{delivery.grand_total?.toLocaleString() || delivery.total_amount.toLocaleString()} CFA</Text>
                  <Text style={styles.itemsCount}>{delivery.items_count} article(s)</Text>
                </View>

                {/* ACTIONS */}
                {delivery.status === 'pending' && (
                  <View style={styles.actionButtonsContainer}>
                    <TouchableOpacity style={[styles.compactActionBtn, { backgroundColor: colors.error + '20' }]} onPress={() => handleRejectOrderClick(delivery)}>
                      <Icon name="close" size={18} color={colors.error} />
                      <Text style={[styles.compactActionBtnText, { color: colors.error }]}>Rejeter</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.compactActionBtn, { backgroundColor: colors.primary }]} onPress={() => handleConfirmOrderClick(delivery)}>
                      <Icon name="checkmark" size={18} color={colors.white} />
                      <Text style={[styles.compactActionBtnText, { color: colors.white }]}>Accepter</Text>
                    </TouchableOpacity>
                  </View>
                )}
                {delivery.status === 'confirmed' && (
                  <TouchableOpacity style={[styles.fullWidthActionBtn, { backgroundColor: colors.warning }]} onPress={() => updateOrderStatus(delivery.order_id, 'preparing')}>
                    <Text style={styles.fullWidthActionBtnText}>Commencer préparation</Text>
                  </TouchableOpacity>
                )}
                {delivery.status === 'preparing' && (
                  <TouchableOpacity style={[styles.fullWidthActionBtn, { backgroundColor: colors.accent }]} onPress={() => updateOrderStatus(delivery.order_id, 'ready')}>
                    <Text style={styles.fullWidthActionBtnText}>Marquer comme prêt</Text>
                  </TouchableOpacity>
                )}

              </View>
            ))
          )}
        </View>
      );
    }

    // ------------------------------------------------------------------
    // STANDARD RENDER (Driver / Customer)
    // ------------------------------------------------------------------
    return (
      <View style={styles.recentSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Livraisons Récentes</Text>
          <TouchableOpacity onPress={() => {
            if (userRole === 'driver') {
              // Direct navigation to driver app for approved drivers
              router.push('/delivery-driver');
            } else {
              router.push('/order-tracking');
            }
          }}>
            <Text style={styles.seeAllText}>Voir tout</Text>
          </TouchableOpacity>
        </View>

        {recentDeliveries.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="bag" size={48} color={colors.textSecondary} />
            <Text style={styles.emptyStateText}>Aucune livraison récente</Text>
          </View>
        ) : (
          recentDeliveries.map(delivery => (
            <View key={delivery.id} style={styles.deliveryCard}>
              <View style={styles.deliveryHeader}>
                <Text style={styles.deliveryId}>#{delivery.id.slice(-8)}</Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(delivery.status) + '20' }]}>
                  <Text style={[styles.statusText, { color: getStatusColor(delivery.status) }]}>
                    {getStatusText(delivery.status)}
                  </Text>
                </View>
              </View>

              <View style={styles.deliveryDetails}>
                <Text style={styles.deliveryAmount}>{delivery.total_amount.toLocaleString()} CFA</Text>
                <Text style={styles.deliveryLocation}>{delivery.customer_location}</Text>
              </View>

              <Text style={styles.deliveryDate}>
                {new Date(delivery.created_at).toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </Text>
            </View>
          ))
        )}
      </View>
    );
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
            Infos pour le livreur (Adresse de retrait & Contact)
          </Text>
          <TextInput
            style={styles.input}
            placeholder="Adresse de retrait du colis"
            value={pickupInfo.address}
            onChangeText={(text) => setPickupInfo(prev => ({ ...prev, address: text }))}
          />
          <TextInput
            style={styles.input}
            placeholder="Numéro de téléphone"
            value={pickupInfo.phone}
            onChangeText={(text) => setPickupInfo(prev => ({ ...prev, phone: text }))}
            keyboardType="phone-pad"
          />
          <TouchableOpacity
            style={[styles.fullWidthActionBtn, { backgroundColor: colors.primary, marginBottom: 10 }]}
            onPress={handleConfirmSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.fullWidthActionBtnText}>Confirmer</Text>
            )}
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
            Pourquoi annulez-vous cette commande ?
          </Text>
          <TextInput
            style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
            placeholder="Motif (ex: Rupture de stock)"
            value={rejectionInfo.reason}
            onChangeText={(text) => setRejectionInfo(prev => ({ ...prev, reason: text }))}
            multiline
          />
          <TouchableOpacity
            style={[styles.fullWidthActionBtn, { backgroundColor: colors.error, marginBottom: 10 }]}
            onPress={rejectOrderWithReason}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.fullWidthActionBtnText}>Confirmer Rejet</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelButton} onPress={() => setIsRejectModalVisible(false)}>
            <Text style={styles.cancelButtonText}>Retour</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const renderRoleSelector = () => {
    if (!showRoleSelector) return null;

    const allRoleOptions = [
      { key: 'customer', title: 'Client', subtitle: 'Suivre mes achats et livraisons', icon: 'bag', color: colors.primary },
      { key: 'seller', title: 'Vendeur', subtitle: 'Gérer mes ventes et produits', icon: 'storefront', color: colors.success },
      { key: 'driver', title: 'Livreur', subtitle: 'Gérer mes livraisons', icon: 'car', color: colors.warning },
    ];

    // Show all roles, but highlight available ones
    const roleOptions = allRoleOptions.map(option => ({
      ...option,
      available: availableRoles.includes(option.key),
      subtitle: availableRoles.includes(option.key)
        ? option.subtitle
        : `${option.subtitle} (Non disponible)`
    }));

    return (
      <View style={styles.roleSelectorContainer}>
        <Text style={styles.roleSelectorTitle}>Choisissez votre rôle</Text>
        <Text style={styles.roleSelectorSubtitle}>
          Vous pouvez avoir plusieurs rôles sur Aviprod
        </Text>

        <View style={styles.roleOptions}>
          {roleOptions.map((option) => (
            <TouchableOpacity
              key={option.key}
              style={[
                styles.roleOption,
                {
                  borderColor: option.available ? option.color : colors.border,
                  opacity: option.available ? 1 : 0.6
                }
              ]}
              onPress={() => {
                if (option.available) {
                  selectRole(option.key as 'customer' | 'driver' | 'seller');
                } else {
                  // Si le rôle n'est pas disponible, vérifier de quel rôle il s'agit
                  if (option.key === 'driver') {
                    // Si l'utilisateur clique sur "Livreur" sans être approuvé
                    const checkPendingDriver = async () => {
                      const supabase = await ensureSupabaseInitialized();
                      const { data: { user } } = await supabase.auth.getUser();
                      if (user) {
                        const { data: pendingDriver } = await supabase
                          .from('livreur_verifications')
                          .select('verification_status')
                          .eq('user_id', user.id)
                          .single();

                        if (pendingDriver) {
                          if (pendingDriver.verification_status === 'pending') {
                            Alert.alert(
                              'Demande en cours',
                              'Votre demande est en cours de validation. Vous serez notifié une fois approuvée.',
                              [{ text: 'OK' }]
                            );
                          } else if (pendingDriver.verification_status === 'rejected') {
                            Alert.alert(
                              'Demande rejetée',
                              'Votre précédente demande a été rejetée. Souhaitez-vous en faire une nouvelle ?',
                              [
                                { text: 'Annuler', style: 'cancel' },
                                { text: 'Nouvelle demande', onPress: () => router.push('/driver-registration') }
                              ]
                            );
                          }
                        } else {
                          // Si aucune demande n'a jamais été faite
                          router.push('/driver-registration');
                        }
                      }
                    };
                    checkPendingDriver();
                  } else {
                    // Pour les autres rôles non disponibles (client, vendeur)
                    Alert.alert(
                      'Rôle non disponible',
                      `Pour activer le rôle '${option.title}', vous devez d'abord ${option.key === 'customer' ? 'passer une commande' : 'ajouter un produit sur le marché'}.`
                    );
                  }
                }
              }}
            >
              <View style={[
                styles.roleIcon,
                {
                  backgroundColor: option.available
                    ? option.color + '20'
                    : colors.border + '40'
                }
              ]}>
                <Icon
                  name={option.icon as any}
                  size={32}
                  color={option.available ? option.color : colors.textSecondary}
                />
              </View>
              <View style={styles.roleInfo}>
                <Text style={[
                  styles.roleTitle,
                  { color: option.available ? colors.text : colors.textSecondary }
                ]}>
                  {option.title}
                </Text>
                <Text style={[
                  styles.roleSubtitle,
                  { color: option.available ? colors.textSecondary : colors.textSecondary + '80' }
                ]}>
                  {option.subtitle}
                </Text>
              </View>
              <Icon
                name="chevron-forward"
                size={24}
                color={option.available ? option.color : colors.textSecondary}
              />
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  const renderRoleSwitcher = () => {
    if (!userRole || availableRoles.length <= 1 || showRoleSelector) return null;

    return (
      <View style={styles.roleSwitcher}>
        <Text style={styles.roleSwitcherLabel}>Rôle actuel:</Text>
        <TouchableOpacity
          style={styles.roleSwitcherButton}
          onPress={() => setShowRoleSelector(true)}
        >
          <Text style={styles.roleSwitcherText}>
            {userRole === 'customer' ? 'Client' :
              userRole === 'seller' ? 'Vendeur' :
                userRole === 'driver' ? 'Livreur' : 'Choisir'}
          </Text>
          <Icon name="chevron-down" size={16} color={colors.primary} />
        </TouchableOpacity>
      </View>
    );
  };

  const renderQuickActions = () => {
    const actions = [];

    if (userRole === 'driver') {
      actions.push(
        {
          title: 'Commande / Livraison', icon: 'car', action: () => {
            // Direct navigation to driver app for approved drivers
            router.push('/delivery-driver');
          }, color: colors.primary
        },
        {
          title: 'Historique',
          icon: 'time',
          action: () => router.push({ pathname: '/order-tracking', params: { mode: 'driver' } }),
          color: colors.accent
        }
      );
    } else if (userRole === 'customer') {
      actions.push(
        { title: 'Produits commandés', icon: 'bag', action: () => router.push('/order-tracking'), color: colors.primary },
        { title: 'Suivi livraison', icon: 'eye', action: () => router.push('/order-tracking'), color: colors.accent }
      );
    } else if (userRole === 'seller') {
      actions.push(
        {
          title: 'Commandes reçues',
          icon: 'storefront',
          action: () => router.push('/seller-orders'),
          color: colors.primary,
          badge: badgeCounts.pending // Badge pour les commandes en attente
        },
        {
          title: 'Suivi livraisons',
          icon: 'car',
          action: () => router.push('/seller-orders'),
          color: colors.success,
          badge: badgeCounts.processing // Badge pour les commandes en cours/livraison
        }
      );
    } else if (userRole === 'admin') { // Ajout pour le rôle admin
      actions.push(
        { title: 'Vérification Vendeur', icon: 'shield-checkmark', action: () => router.push('/(admin)/kyc-verifications'), color: colors.primary },
        { title: 'Vérification Livreur', icon: 'car', action: () => router.push('/(admin)/driver-verifications'), color: colors.success }
      );
    }

    return (
      <View style={styles.actionsSection}>
        <Text style={styles.sectionTitle}>Actions Rapides</Text>
        <View style={styles.actionsContainer}>
          {actions.map((action, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.actionButton, { backgroundColor: action.color }]}
              onPress={action.action}
            >
              <Icon name={action.icon as any} size={24} color={colors.white} />
              <Text style={styles.actionButtonText}>{action.title}</Text>

              {/* Badge Conditionnel */}
              {(action as any).badge > 0 && (
                <View style={styles.actionBadge}>
                  <Text style={styles.actionBadgeText}>
                    {(action as any).badge > 99 ? '99+' : (action as any).badge}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={commonStyles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Chargement du tableau de bord...</Text>
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
        <View style={styles.headerContent}>
          <Icon name={getRoleIcon() as any} size={28} color={colors.primary} />
          <Text style={styles.headerTitle}>{getRoleTitle()}</Text>
        </View>
      </View>

      {renderRoleSwitcher()}

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {renderRoleSelector()}

          {!showRoleSelector && (
            <>
              {renderStatsCards()}
              {renderQuickActions()}
              {renderRecentDeliveries()}
              {/* <GoogleAdBanner /> */}
            </>
          )}
        </View>
      </ScrollView>
      {renderConfirmModal()}
      {renderRejectModal()}
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
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  actionBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: colors.error,
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.white,
    zIndex: 10,
    paddingHorizontal: 6,
  },
  actionBadgeText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    minWidth: (width - 40 - 12) / 2,
    backgroundColor: colors.backgroundAlt,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  actionsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 12,
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
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.white,
  },
  recentSection: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  deliveryCard: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  // STYLES SPECIFIQUES VENDEUR
  sellerOrderCard: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16, // Plus d'espace
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  orderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12
  },
  productImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: colors.border,
  },
  orderId: { fontSize: 14, color: colors.textSecondary },
  buyerName: { fontSize: 16, fontWeight: '700', color: colors.text },
  orderDate: { fontSize: 12, color: colors.textSecondary },
  sellerOrderDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border
  },
  orderAmount: { fontSize: 18, fontWeight: '700', color: colors.primary },
  itemsCount: { fontSize: 14, color: colors.textSecondary },
  actionButtonsContainer: {
    flexDirection: 'row',
    gap: 12
  },
  compactActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6
  },
  compactActionBtnText: {
    fontSize: 14,
    fontWeight: '600'
  },
  fullWidthActionBtn: {
    width: '100%',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center'
  },
  fullWidthActionBtnText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 16
  },
  // MODAL STYLES
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    backgroundColor: colors.background,
    borderRadius: 16,
    padding: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center'
  },
  modalSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
    color: colors.text
  },
  cancelButton: {
    marginTop: 12,
    alignItems: 'center',
    padding: 10
  },
  cancelButtonText: {
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: '500'
  },
  deliveryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  deliveryId: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  deliveryDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  deliveryAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.success,
  },
  deliveryLocation: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  deliveryDate: {
    fontSize: 12,
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
  roleSelectorContainer: {
    backgroundColor: colors.backgroundAlt,
    margin: 20,
    marginTop: 0,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  roleSelectorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  roleSelectorSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  roleOptions: {
    gap: 16,
  },
  roleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
  },
  roleIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  roleInfo: {
    flex: 1,
  },
  roleTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  roleSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  roleSwitcher: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: colors.primary + '10',
    borderBottomWidth: 1,
    borderBottomColor: colors.primary + '20',
  },
  roleSwitcherLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginRight: 8,
  },
  roleSwitcherButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  roleSwitcherText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
    marginRight: 4,
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