import React, { createContext, useState, useContext, useEffect, ReactNode, useCallback, useMemo } from 'react';
import { supabase } from '../config';
import { useAuth } from '../hooks/useAuth';
import { router } from 'expo-router';

interface NotificationContextType {
  unreadCount: number;
  unreadMessagesCount: number; // --- NOUVEAU ---
  fetchUnreadCount: () => void;
  fetchUnreadMessagesCount: () => void; // --- NOUVEAU ---
  notifications: Notification[];
  fetchNotifications: () => void;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  setNotifications: React.Dispatch<React.SetStateAction<Notification[]>>;
  user: any;
  loading: boolean;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
  data?: any;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0); // --- NOUVEAU ---
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUnreadMessagesCount = useCallback(async () => {
    console.log('📊 [NotificationContext] Fetching unread messages count...');
    if (!user) {
      setUnreadMessagesCount(0);
      return;
    }
    try {
      const { count, error } = await supabase
        .from('marketplace_messages')
        .select('*', { count: 'exact', head: true })
        .eq('receiver_id', user.id)
        .is('read_at', null);

      if (error) throw error;
      console.log(`📊 [NotificationContext] Unread messages count is: ${count}`);
      setUnreadMessagesCount(count || 0);
    } catch (error) {
      console.error('Error fetching unread messages count:', error);
      setUnreadMessagesCount(0);
    }
  }, [user]);

  const fetchUnreadCount = useCallback(async () => {
    console.log('📊 [NotificationContext] Fetching unread count...');

    if (!user) {
      setUnreadCount(0);
      return;
    }
    try {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('read', false);

      if (error) throw error;
      console.log(`📊 [NotificationContext] Unread count is: ${count}`);
      setUnreadCount(count || 0);
    } catch (error) {
      console.error('Error fetching unread notification count:', error);
      setUnreadCount(0);
    }
  }, [user]);

  const fetchNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev =>
        prev.map(n => (n.id === notificationId ? { ...n, read: true } : n))
      );
      fetchUnreadCount(); // Refresh count
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false);

      if (error) throw error;

      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  useEffect(() => {
    let messagesChannel: any = null;

    if (user) {
      console.log('👤 [NotificationContext] User detected, fetching initial counts.');
      fetchUnreadCount();
      fetchUnreadMessagesCount();
      fetchNotifications();

      // --- NOUVEAU : Abonnement temps réel pour les messages ---
      const channelName = `unread-messages-${user.id}`;
      if (user.id) {
        messagesChannel = supabase
          .channel(channelName)
          .on('postgres_changes',
            { event: '*', schema: 'public', table: 'marketplace_messages', filter: `receiver_id=eq.${user.id}` },
            () => {
              console.log('📩 [NotificationContext] Changement détecté dans les messages, rafraîchissement...');
              fetchUnreadMessagesCount();
            }
          )
          .subscribe();
      } else {
        console.warn('⚠️ [NotificationContext] user.id est vide, impossible de créer le canal de messages.');
      }
    } else {
      console.log('👤 [NotificationContext] No user, resetting counts.');
      setUnreadCount(0);
      setUnreadMessagesCount(0);
      setNotifications([]);
    }

    return () => {
      if (messagesChannel) {
        console.log('🔌 [NotificationContext] Nettoyage de l\'abonnement aux messages.');
        supabase.removeChannel(messagesChannel);
      }
    };
  }, [user, fetchNotifications]);

  const contextValue = useMemo(() => ({
    unreadCount, unreadMessagesCount, fetchUnreadCount, fetchUnreadMessagesCount,
    notifications, fetchNotifications,
    markAsRead, markAllAsRead, setNotifications, user, loading
  }), [unreadCount, unreadMessagesCount, fetchUnreadCount, fetchUnreadMessagesCount, notifications, fetchNotifications, user, loading]);

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};