import { useState, useEffect, useCallback } from 'react';
import { ensureSupabaseInitialized } from '../app/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useDataCollector } from '../src/hooks/useDataCollector';

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

      const mappedNotifications: Notification[] = (data || []).map(notif => ({
        id: notif.id,
        type: notif.type || 'info',
        title: notif.type || 'Notification',
        message: notif.message || '',
        data: notif.data || {},
        read: notif.read || false,
        created_at: notif.created_at || new Date().toISOString(),
        user_id: notif.user_id,
      }));

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
    if (user) {
      fetchUnreadCount();
      fetchNotifications();

      const setupRealtimeSubscription = async () => {
        try {
          const supabase = await ensureSupabaseInitialized();

          const channel = supabase
            .channel('notifications-channel')
            .on(
              'postgres_changes',
              {
                event: 'INSERT',
                schema: 'public',
                table: 'notifications',
                filter: `user_id=eq.${user.id}`,
              },
              (payload) => {
                console.log('🔔 New notification received:', payload.new);

                const newNotif = payload.new as any;
                setNotifications(prev => [{
                  id: newNotif.id,
                  type: newNotif.type || 'info',
                  title: newNotif.type || 'Notification',
                  message: newNotif.message || '',
                  data: newNotif.data || {},
                  read: newNotif.read || false,
                  created_at: newNotif.created_at,
                  user_id: newNotif.user_id,
                }, ...prev]);

                setUnreadCount(prev => prev + 1);
              }
            )
            .on(
              'postgres_changes',
              {
                event: 'UPDATE',
                schema: 'public',
                table: 'notifications',
                filter: `user_id=eq.${user.id}`,
              },
              (payload) => {
                console.log('📝 Notification updated:', payload.new);

                const updatedNotif = payload.new as any;
                setNotifications(prev =>
                  prev.map(notif =>
                    notif.id === updatedNotif.id
                      ? {
                          ...notif,
                          read: updatedNotif.read,
                          message: updatedNotif.message,
                          data: updatedNotif.data,
                        }
                      : notif
                  )
                );

                fetchUnreadCount();
              }
            )
            .subscribe((status) => {
              console.log('📡 Realtime subscription status:', status);
            });

          return () => {
            console.log('🔌 Unsubscribing from notifications channel');
            supabase.removeChannel(channel);
          };
        } catch (error) {
          console.error('Error setting up realtime subscription:', error);
        }
      };

      const cleanup = setupRealtimeSubscription();

      return () => {
        cleanup?.then(cleanupFn => cleanupFn?.());
      };
    }
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