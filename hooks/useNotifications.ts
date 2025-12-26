import { useState, useEffect, useCallback } from 'react';
import { ensureSupabaseInitialized } from '../config';
import { useAuth } from './useAuth';
import { useDataCollector } from '../src/hooks/useDataCollector';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  data: any;
  read: boolean;
  created_at: string;
  user_id: string;
}

export const useNotifications = () => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { trackAction } = useDataCollector();

  // Helper pour mapper les données brutes
  const mapNotification = (data: any): Notification => ({
    id: data.id,
    type: data.type || 'info',
    title: data.title || data.type || 'Notification',
    message: data.message || '',
    data: data.data || {},
    read: data.read || false,
    created_at: data.created_at || new Date().toISOString(),
    user_id: data.user_id,
  });

  const fetchUnreadCount = useCallback(async () => {
    if (!user) {
      setUnreadCount(0);
      return;
    }

    try {
      const supabase = await ensureSupabaseInitialized();
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('read', false);

      if (error) {
        console.error('Error fetching unread count:', error);
        return;
      }

      console.log('📊 Unread count:', count);
      setUnreadCount(count || 0);
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  }, [user]);

  const fetchNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const supabase = await ensureSupabaseInitialized();
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      const mappedNotifications = (data || []).map(mapNotification);

      console.log('📬 Loaded notifications:', mappedNotifications.length);
      setNotifications(mappedNotifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const supabase = await ensureSupabaseInitialized();

      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev =>
        prev.map(notif =>
          notif.id === notificationId ? { ...notif, read: true } : notif
        )
      );

      setUnreadCount(prev => Math.max(0, prev - 1));

      // TRACKER LA LECTURE DE NOTIFICATION
      const notification = notifications.find(n => n.id === notificationId);
      if (notification) {
        trackAction('notification_read', {
          notification_id: notificationId,
          notification_type: notification.type,
          time_since_created: Date.now() - new Date(notification.created_at).getTime()
        });
      }

      console.log('✅ Notification marked as read:', notificationId);
    } catch (error: any) {
      console.error('❌ Error marking notification as read:', error);
    }
  }, [notifications, trackAction]);

  const markAllAsRead = useCallback(async () => {
    if (!user) return;

    const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
    if (unreadIds.length === 0) return;

    try {
      const supabase = await ensureSupabaseInitialized();
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .in('id', unreadIds);

      if (error) throw error;

      setNotifications(prev =>
        prev.map(notif => ({ ...notif, read: true }))
      );
      setUnreadCount(0);

      console.log('✅ All notifications marked as read');
    } catch (error) {
      console.error('❌ Error marking all as read:', error);
    }
  }, [user, notifications]);

  useEffect(() => {
    let channel: RealtimeChannel | null = null;

    if (user) {
      fetchUnreadCount();
      fetchNotifications();

      const setupRealtimeSubscription = async () => {
        try {
          const supabase = await ensureSupabaseInitialized();

          // Utilisation d'un nom de canal unique pour éviter les conflits
          channel = supabase
            .channel(`notifications-global-${user.id}`)
            .on(
              'postgres_changes',
              {
                event: '*', // Écoute TOUS les événements (INSERT, UPDATE, DELETE)
                schema: 'public',
                table: 'notifications',
                filter: `user_id=eq.${user.id}`,
              },
              (payload) => {
                console.log('🔔 Notification Realtime Event:', payload.eventType);

                // Toujours rafraîchir le compteur pour être sûr
                fetchUnreadCount();

                if (payload.eventType === 'INSERT') {
                  const newNotif = mapNotification(payload.new);
                  setNotifications(prev => [newNotif, ...prev]);
                } else if (payload.eventType === 'UPDATE') {
                  const updatedNotif = mapNotification(payload.new);
                  setNotifications(prev =>
                    prev.map(n => n.id === updatedNotif.id ? updatedNotif : n)
                  );
                } else {
                  // Pour DELETE ou autre, on recharge tout pour être sûr
                  fetchNotifications();
                }
              }
            )
            .subscribe((status) => {
              console.log(`📡 Notifications subscription status: ${status}`);
            });

        } catch (error) {
          console.error('Error setting up realtime subscription:', error);
        }
      };

      setupRealtimeSubscription();
    }

    return () => {
      if (channel) {
        console.log('🔌 Unsubscribing from notifications channel');
        ensureSupabaseInitialized().then(supabase => supabase.removeChannel(channel!));
      }
    };
  }, [user, fetchUnreadCount, fetchNotifications]);

  return {
    unreadCount,
    notifications,
    loading,
    fetchUnreadCount,
    fetchNotifications,
    setNotifications,
    markAsRead,
    markAllAsRead,
  };
};