
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Image, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { colors, commonStyles } from '../styles/commonStyles';
import Icon from '../components/Icon';
import SimpleBottomSheet from '../components/BottomSheet'; // --- NOTE : Import inutilisé, peut être retiré ---
import MarketplaceChat from '../components/MarketplaceChat';
import { getMarketplaceImageUrl, supabase } from '../config';
import { useNotifications } from '../components/NotificationContext'; // --- AJOUT ---

interface Conversation {
  id: string;
  product_id: string;
  other_user_id: string;
  product_name: string;
  other_user_name: string;
  product_image: string;
  last_message: string;
  last_message_time: string;
  unread_count: number;
}

export default function MarketplaceMessagesScreen() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [isChatVisible, setIsChatVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const { fetchUnreadMessagesCount } = useNotifications(); // --- AJOUT ---

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadConversations();
    setRefreshing(false);
  }, []);

  // Recharger les conversations quand l'écran est affiché
  const loadConversations = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.replace('/auth');
        return;
      }

      setCurrentUserId(user.id);

      // Étape 1: Récupérer tous les messages
      const { data: messages, error: messagesError } = await supabase
        .from('marketplace_messages')
        .select(`
          id,
          product_id,
          message,
          created_at,
          read_at,
          sender_id,
          receiver_id
        `)
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (messagesError) throw messagesError;

      // Étape 2: Récupérer les informations des produits
      const productIds = [...new Set(messages?.map(msg => msg.product_id) || [])];

      const { data: products, error: productsError } = await supabase
        .from('marketplace_products')
        .select('id, name, image')
        .in('id', productIds);

      if (productsError) throw productsError;

      const productsMap = new Map(products?.map(p => [p.id, p]) || []);

      // Étape 3: Récupérer les informations des utilisateurs
      const otherUserIds = [...new Set(messages?.map(msg =>
        msg.sender_id === user.id ? msg.receiver_id : msg.sender_id
      ) || [])];

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', otherUserIds);

      if (profilesError) throw profilesError;

      const profilesMap = new Map(profiles?.map(p => [p.user_id, p.full_name]) || []);

      // Étape 4: Construire les conversations
      const conversationsMap = new Map<string, Conversation>();

      for (const msg of messages || []) {
        const otherUserId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
        const key = `${msg.product_id}-${otherUserId}`;

        const product = productsMap.get(msg.product_id);
        const otherUserName = profilesMap.get(otherUserId) || 'Utilisateur inconnu';

        let conversation = conversationsMap.get(key); // Récupérer la conversation existante

        if (!conversation) {
          // Si elle n'existe pas, la créer
          conversation = {
            id: key,
            product_id: msg.product_id,
            other_user_id: otherUserId,
            product_name: product?.name || 'Produit',
            other_user_name: otherUserName || 'Utilisateur inconnu',
            product_image: getMarketplaceImageUrl(product?.image),
            last_message: msg.message,
            last_message_time: msg.created_at,
            unread_count: 0,
          };
          conversationsMap.set(key, conversation); // L'ajouter à la map
        }

        // Mettre à jour le dernier message (puisque les messages sont triés du plus récent au plus ancien)
        conversation.last_message = msg.message;
        conversation.last_message_time = msg.created_at;

        // Compter les messages non lus (uniquement ceux où l'utilisateur est le destinataire)
        if (msg.receiver_id === user.id && !msg.read_at) {
          conversation.unread_count++;
        }

        conversationsMap.set(key, conversation);
      }

      setConversations(Array.from(conversationsMap.values()));
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Recharger les conversations quand l'écran est affiché
  useFocusEffect(
    React.useCallback(() => {
      loadConversations();

      // Écouter les changements en temps réel
      const channel = supabase.channel('marketplace_messages_changes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'marketplace_messages' },
          (payload) => {
            console.log('Realtime message received, reloading conversations:', payload);
            loadConversations();
          }
        )
        .subscribe();

      // La fonction de nettoyage est retournée pour être appelée lors du démontage du composant
      return () => {
        console.log('🔌 Unsubscribing from marketplace messages channel.');
        supabase.removeChannel(channel);
      };
    }, []) // Le tableau vide assure que cela ne s'exécute qu'une fois au montage/démontage
  );

  const handleConversationPress = async (conversation: Conversation) => {
    // Sauvegarder le compteur actuel avant de le mettre à zéro
    const previousUnreadCount = conversation.unread_count;

    console.log(`Opening conversation: ${conversation.id}`);
    console.log(`Current user: ${currentUserId}, Other user: ${conversation.other_user_id}`);
    console.log(`Product: ${conversation.product_id}, Unread count: ${previousUnreadCount}`);

    // Marquer comme lus immédiatement dans l'état local
    setConversations(prev => prev.map(c =>
      c.id === conversation.id ? { ...c, unread_count: 0 } : c
    ));

    try {
      // --- SIMPLIFICATION : Mettre à jour directement les messages non lus pour cette conversation ---
      const { error: updateError } = await supabase
        .from('marketplace_messages')
        .update({ read_at: new Date().toISOString() })
        .eq('receiver_id', currentUserId)
        .eq('sender_id', conversation.other_user_id)
        .eq('product_id', conversation.product_id)
        .is('read_at', null);

      if (updateError) {
        console.error('Error marking messages as read:', updateError);
        return;
      }

      // --- NOUVEAU : Rafraîchir le compteur global ---
      fetchUnreadMessagesCount();
    } catch (error) {
      console.error('Error marking messages as read:', error);
      // En cas d'erreur, remettre le compteur à sa valeur précédente
      setConversations(prev => prev.map(c =>
        c.id === conversation.id ? { ...c, unread_count: previousUnreadCount } : c
      ));
    }

    setSelectedConversation(conversation);
    setIsChatVisible(true);
  };

  // Fonction pour marquer une conversation spécifique comme lue
  const markConversationAsRead = useCallback(async (productId: string, otherUserId: string) => {
    if (!currentUserId) return;

    try {
      await supabase
        .from('marketplace_messages')
        .update({ read_at: new Date().toISOString() })
        .eq('product_id', productId)
        .eq('receiver_id', currentUserId)
        .eq('sender_id', otherUserId)
        .is('read_at', null);

      // Mettre à jour l'état local
      const conversationId = `${productId}-${otherUserId}`;
      setConversations(prev => prev.map(c =>
        c.id === conversationId ? { ...c, unread_count: 0 } : c
      ));

      // --- NOUVEAU : Rafraîchir le compteur global ---
      fetchUnreadMessagesCount();
    } catch (error) {
      console.error('Error marking conversation as read:', error);
    }
  }, [currentUserId, fetchUnreadMessagesCount]);

  const markAllAsRead = async () => {
    if (!currentUserId) return;

    try {
      // 1. Mise à jour visuelle immédiate
      setConversations(prev => prev.map(c => ({ ...c, unread_count: 0 })));

      // 2. Mise à jour en base de données avec vérification (.select())
      const { data, error } = await supabase
        .from('marketplace_messages')
        .update({ read_at: new Date().toISOString() })
        .eq('receiver_id', currentUserId)
        .is('read_at', null)
        .select();

      if (error) throw error;

      // 3. Vérification : Si aucune ligne n'a été touchée, c'est que la DB n'a pas changé
      if (data && data.length === 0) {
        console.warn("⚠️ Aucune ligne mise à jour. Vérifiez les permissions RLS.");
        // On recharge pour ne pas mentir à l'utilisateur
        loadConversations();
      } else {
        // Succès confirmé
        console.log(`✅ ${data?.length} messages marqués comme lus.`);
        fetchUnreadMessagesCount();
      }
    } catch (error) {
      console.error('Error marking all messages as read:', error);
      Alert.alert("Erreur", "Impossible de marquer les messages comme lus.");
      loadConversations();
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'À l\'instant';
    if (diffMins < 60) return `Il y a ${diffMins}min`;
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    if (diffDays < 7) return `Il y a ${diffDays}j`;
    return date.toLocaleDateString('fr-FR');
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Chargement des messages...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={commonStyles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Messages</Text>
        <TouchableOpacity onPress={markAllAsRead}>
          <Text style={styles.markAllReadText}>Tout lu</Text>
        </TouchableOpacity>
      </View>

      {conversations.length === 0 ? (
        <View style={styles.emptyState}>
          <Icon name="chatbubbles-outline" size={64} color={colors.textSecondary} />
          <Text style={styles.emptyStateText}>Aucun message</Text>
          <Text style={styles.emptyStateSubtext}>
            Vos conversations avec les vendeurs apparaîtront ici
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
          }
        >
          {conversations.map((conversation) => (
            <TouchableOpacity
              key={conversation.id}
              style={styles.conversationCard}
              onPress={() => handleConversationPress(conversation)}
            >
              {conversation.product_image ? (
                <Image
                  source={{ uri: conversation.product_image }}
                  style={styles.productImage}
                />
              ) : (
                <View style={[styles.productImage, styles.placeholderContainer]}>
                  <Icon name="storefront" size={32} color={colors.textSecondary} />
                </View>
              )}
              <View style={styles.conversationInfo}>
                <Text style={styles.userName} numberOfLines={1}>
                  {conversation.other_user_name}
                </Text>
                <Text style={styles.productName} numberOfLines={1}>
                  {conversation.product_name}
                </Text>
                <Text style={styles.lastMessage} numberOfLines={2}>
                  {conversation.last_message}
                </Text>
                <Text style={styles.timestamp}>
                  {formatTime(conversation.last_message_time)}
                </Text>
              </View>
              {conversation.unread_count > 0 && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadText}>{conversation.unread_count}</Text>
                </View>
              )}
              <Icon name="chevron-forward" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <SimpleBottomSheet
        isVisible={isChatVisible}
        onClose={() => {
          setIsChatVisible(false);
          loadConversations();
          fetchUnreadMessagesCount(); // --- AJOUT ---
        }}
      >
        {selectedConversation && (
          <MarketplaceChat
            productId={selectedConversation.product_id}
            productName={selectedConversation.product_name}
            sellerId={selectedConversation.other_user_id}
            sellerName={selectedConversation.other_user_name}
            currentUserId={currentUserId}
            onClose={() => {
              setIsChatVisible(false);
              loadConversations();
            }}
          />
        )}
      </SimpleBottomSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: colors.textSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
  },
  scrollView: {
    flex: 1,
  },
  conversationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.backgroundAlt,
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: colors.border,
  },
  placeholderContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  conversationInfo: {
    flex: 1,
    marginLeft: 12,
  },
  productName: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
    marginBottom: 4,
  },
  lastMessage: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  timestamp: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  unreadBadge: {
    backgroundColor: colors.error,
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    marginRight: 8,
  },
  unreadText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.white,
  },
  markAllReadText: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: 14,
  },
});
