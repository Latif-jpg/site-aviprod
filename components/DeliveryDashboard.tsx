import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, commonStyles } from '../styles/commonStyles';
import Icon from './Icon';
import { ensureSupabaseInitialized } from '../app/integrations/supabase/client';
import { router } from 'expo-router';

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
}

export default function DeliveryDashboard() {
  const [stats, setStats] = useState<DeliveryStats | null>(null);
  const [recentDeliveries, setRecentDeliveries] = useState<RecentDelivery[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState<'customer' | 'driver' | 'seller' | null>(null);
  const [availableRoles, setAvailableRoles] = useState<string[]>([]);
  const [showRoleSelector, setShowRoleSelector] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      const supabase = await ensureSupabaseInitialized();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        Alert.alert('Erreur', 'Vous devez être connecté');
        return;
      }

      // Check all available roles for this user
      const roles: string[] = [];

      // Check if driver - only if approved
      try {
        const { data: driverData, error: driverError } = await supabase
          .from('livreur_verifications')
          .select('id, verification_status')
          .eq('user_id', user.id)
          .eq('verification_status', 'approved')
          .limit(1)
          .maybeSingle();

        console.log('Driver check result:', { driverData, driverError, userId: user.id });

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
        .eq('seller_id', user.id)
        .limit(1);

      if (products && products.length > 0) {
        roles.push('seller');
      }

      // Check if customer (has orders)
      const { data: orders } = await supabase
        .from('orders')
        .select('id')
        .eq('buyer_id', user.id)
        .limit(1);

      if (orders && orders.length > 0) {
        roles.push('customer');
      }

      setAvailableRoles(roles);

      // Always show role selector first (as requested)
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
        .single();

      if (driverError || !driverVerification) throw new Error('Driver not found or not approved.');

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
            total_amount,
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
        total_amount: d.order?.total_amount || 0,
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
          total_amount,
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
        total_amount: o.total_amount,
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
      const { data: orders } = await supabase
        .from('orders')
        .select(`
          id,
          total_amount,
          status,
          created_at,
          delivery:deliveries(status)
        `)
        .eq('seller_id', userId);

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
        total_earnings: 0, // Sellers earn from sales, not deliveries
        avg_rating: 0
      });

      // Get recent deliveries for seller's orders
      const recentDeliveriesData: RecentDelivery[] = orders?.filter(o => o.delivery).slice(0, 5).map(o => ({
        id: o.delivery?.id || o.id,
        order_id: o.id,
        status: o.delivery?.status || 'pending',
        total_amount: o.total_amount,
        created_at: o.created_at,
        customer_location: 'Client',
        items_count: 1
      })) || [];

      setRecentDeliveries(recentDeliveriesData);

    } catch (error: any) {
      console.error('❌ Error loading seller dashboard:', error);
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

  const renderRecentDeliveries = () => (
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
                  if (option.key === 'driver') {
                    // Check if user has a pending driver verification
                    const checkPendingDriver = async () => {
                      const supabase = await ensureSupabaseInitialized();
                      const { data: { user } } = await supabase.auth.getUser();
                      if (user) {
                        const { data: pendingDriver } = await supabase
                          .from('livreur_verifications')
                          .select('id, verification_status')
                          .eq('user_id', user.id)
                          .single();

                        if (pendingDriver) {
                          if (pendingDriver.verification_status === 'pending') {
                            Alert.alert(
                              'Demande en attente',
                              'Votre demande de livreur est en cours de validation par l\'administrateur. Vous serez notifié une fois approuvé.',
                              [{ text: 'OK' }]
                            );
                          } else if (pendingDriver.verification_status === 'rejected') {
                            Alert.alert(
                              'Demande rejetée',
                              'Votre demande de livreur a été rejetée. Vous pouvez soumettre une nouvelle demande.',
                              [
                                { text: 'Annuler', style: 'cancel' },
                                { text: 'Nouvelle demande', onPress: () => router.push('/driver-registration') }
                              ]
                            );
                          }
                        } else {
                          router.push('/driver-registration');
                        }
                      }
                    };
                    checkPendingDriver();
                  } else {
                    Alert.alert(
                      'Rôle non disponible',
                      `Vous n'avez pas encore d'activité en tant que ${option.title.toLowerCase()}. Commencez par ${option.key === 'customer' ? 'faire un achat' : 'ajouter un produit'}.`
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
    if (!userRole || availableRoles.length <= 1) return null;

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
        { title: 'Commande / Livraison', icon: 'car', action: () => {
          // Direct navigation to driver app for approved drivers
          router.push('/delivery-driver');
        }, color: colors.primary },
        { 
          title: 'Historique', 
          icon: 'time', 
          action: () => router.push({ pathname: '/order-tracking', params: { mode: 'driver' } }), 
          color: colors.accent }
      );
    } else if (userRole === 'customer') {
      actions.push(
        { title: 'Produits commandés', icon: 'bag', action: () => router.push('/order-tracking'), color: colors.primary },
        { title: 'Suivi livraison', icon: 'eye', action: () => router.push('/order-tracking'), color: colors.accent }
      );
    } else if (userRole === 'seller') {
      actions.push(
        { title: 'Commandes reçues', icon: 'storefront', action: () => router.push('/seller-orders'), color: colors.primary },
        { title: 'Suivi livraisons', icon: 'car', action: () => router.push('/seller-orders'), color: colors.success }
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
          {renderStatsCards()}
          {renderQuickActions()}
          {renderRecentDeliveries()}
        </View>
      </ScrollView>
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