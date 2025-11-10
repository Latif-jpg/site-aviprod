import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, FlatList, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, commonStyles } from '../styles/commonStyles';
import Icon from '../components/Icon';
import { router, useFocusEffect } from 'expo-router';
import { useNotifications, Notification } from '../hooks/useNotifications';

export default function NotificationsScreen() {
  const {
    notifications,
    unreadCount,
    loading,
    fetchNotifications,
    markAsRead,
    markAllAsRead
  } = useNotifications();

  const handleNotificationPress = async (notification: Notification) => {
    // ✅ Marquer comme lu immédiatement
    if (!notification.read) {
      await markAsRead(notification.id);
    }

    // Redirection selon le type
    if (notification.data?.action === 'view_seller_orders') {
      router.push('/seller-orders');
    } else if (notification.data?.order_id) {
      router.push('/order-tracking');
    } else if (notification.data?.delivery_id) {
      router.push('/delivery-driver');
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'new_order': return 'cart';
      case 'order_confirmed': return 'checkmark-circle';
      case 'payment_received': return 'cash';
      case 'driver_en_route': return 'car';
      case 'delivery_in_progress': return 'navigate';
      case 'delivery_completed': return 'checkmark-circle';
      case 'package_picked_up': return 'cube';
      default: return 'notifications';
    }
  };

  const getNotificationColor = (type: string, isRead: boolean) => {
    // ✅ Changer la couleur si non lu
    if (!isRead) {
      return colors.primary;
    }

    switch (type) {
      case 'new_order': return colors.accent;
      case 'order_confirmed': return colors.primary;
      case 'payment_received': return colors.success;
      case 'driver_en_route': return colors.accent;
      case 'delivery_in_progress': return colors.warning;
      case 'delivery_completed': return colors.success;
      default: return colors.textSecondary;
    }
  };

  const renderNotification = ({ item: notification }: { item: Notification }) => (
    <TouchableOpacity
      style={[
        styles.notificationCard,
        !notification.read && styles.unreadNotification
      ]}
      onPress={() => handleNotificationPress(notification)}
    >
      <View style={[
        styles.notificationIcon,
        !notification.read && styles.unreadIcon
      ]}>
        <Icon
          name={getNotificationIcon(notification.type) as any}
          size={24}
          color={getNotificationColor(notification.type, notification.read)}
        />
      </View>

      <View style={styles.notificationContent}>
        <Text style={[
          styles.notificationTitle,
          !notification.read && styles.unreadTitle
        ]}>
          {notification.message}
        </Text>
        <Text style={styles.notificationDate}>
          {new Date(notification.created_at).toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
          })}
        </Text>
      </View>

      {!notification.read && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );

  if (loading && notifications.length === 0) {
    return (
      <SafeAreaView style={commonStyles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Chargement des notifications...</Text>
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
        <Text style={styles.headerTitle}>Notifications</Text>
        <TouchableOpacity onPress={markAllAsRead} disabled={unreadCount === 0}>
          <Text style={[styles.markAllButton, unreadCount === 0 && styles.markAllButtonDisabled]}>
            Tout lu
          </Text>
        </TouchableOpacity>
      </View>

      {notifications.length === 0 ? (
        <View style={styles.emptyState}>
          <Icon name="notifications" size={48} color={colors.textSecondary} />
          <Text style={styles.emptyStateText}>Aucune notification</Text>
          <Text style={styles.emptyStateSubtext}>
            Vous serez notifié des nouvelles commandes et mises à jour
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderNotification}
          keyExtractor={(item) => item.id}
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={fetchNotifications}
              tintColor={colors.primary}
            />
          }
        />
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
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
  },
  markAllButton: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  markAllButtonDisabled: {
    color: colors.textSecondary,
    opacity: 0.6,
  },
  headerBadge: {
    backgroundColor: colors.primary,
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
  },
  content: {
    padding: 20,
  },
  notificationCard: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  unreadNotification: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  unreadIcon: {
    backgroundColor: colors.primary + '20',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  unreadTitle: {
    fontWeight: '700',
    color: colors.text,
  },
  notificationMessage: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 8,
  },
  notificationDate: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginTop: 8,
  },
  emptyState: {
    padding: 40,
    flex: 1,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
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