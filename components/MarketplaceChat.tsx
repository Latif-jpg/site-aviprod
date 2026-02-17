import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { colors } from '../styles/commonStyles';
import Icon from './Icon';
import Button from './Button';
import { supabase } from '../config'; // Import supabase directly
import { useProfile } from '../contexts/ProfileContext'; // Importer le hook de profil
import { containsContactInfo, sanitizeText } from '../utils/validators';
import { usePremiumFeature } from '../hooks/usePremiumFeature';
import SmartTunnelModal from './SmartTunnelModal';

interface Message {
  id: string;
  senderId: string;
  text: string;
  timestamp: string;
  isBlocked?: boolean;
}

interface MarketplaceChatProps {
  productId: string;
  productName: string;
  sellerId: string;
  sellerName: string;
  currentUserId: string;
  onClose: () => void;
}

export default function MarketplaceChat({
  productId,
  productName,
  sellerId,
  sellerName,
  currentUserId,
  onClose
}: MarketplaceChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(true); // État de chargement initial
  const [interlocutorName, setInterlocutorName] = useState(sellerName);
  const scrollViewRef = useRef<ScrollView>(null);
  const initializedProductIdRef = useRef<string | null>(null); // Ref pour éviter la double exécution et suivre le produit
  const { profile, refreshProfile, loading: profileLoading } = useProfile(); // Utiliser le contexte de profil
  const { requestAccess, showTunnel, tunnelProps } = usePremiumFeature({
    featureKey: 'marketplace_chat',
    featureName: 'Chat avec un vendeur',
    cost: 10,
  });

  // Déterminer si l'utilisateur actuel est le vendeur
  const isCurrentUserSeller = useMemo(() => currentUserId === sellerId, [currentUserId, sellerId]);

  const markMessagesAsRead = useCallback(async () => {
    try { // Supabase est déjà importé depuis config

      // Mark all unread messages from seller to current user as read
      const { error } = await supabase
        .from('marketplace_messages')
        .update({ read_at: new Date().toISOString() })
        .eq('product_id', productId)
        .eq('sender_id', sellerId)
        .eq('receiver_id', currentUserId)
        .is('read_at', null);

      if (error) {
        console.error('Error marking messages as read:', error);
      } else {
        console.log('Messages marked as read');
      }
    } catch (error: any) {
      console.error('Exception marking messages as read:', error);
    }
  }, [productId, sellerId, currentUserId]);

  const checkAndChargeForNewChat = useCallback(async () => {
    try { // Supabase est déjà importé depuis config

      const { data, error } = await supabase
        .from('marketplace_messages')
        .select('*')
        .eq('product_id', productId)
        .in('sender_id', [currentUserId, sellerId])
        .in('receiver_id', [currentUserId, sellerId])
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Si c'est une nouvelle conversation ET que l'utilisateur n'est pas le vendeur
      if (data.length === 0 && !isCurrentUserSeller) {
        console.log("Nouvelle conversation, vérification de l'accès via PremiumFeature...");

        const access = await requestAccess();
        if (!access.granted) {
          return false; // usePremiumFeature gère déjà l'affichage de l'alerte ou du tunnel
        }

        Alert.alert(
          "Conversation Débloquée",
          "10 Avicoins ont été utilisés pour démarrer cette conversation."
        );
      }

      // Charger les messages existants (s'il y en a)
      if (data.length > 0) {
        const transformedMessages: Message[] = (data || []).map(msg => ({
          id: msg.id.toString(),
          senderId: msg.sender_id,
          text: msg.message,
          timestamp: msg.created_at,
          isBlocked: msg.is_blocked || false,
        }));
        setMessages(transformedMessages);
      }
      return true; // Indique que le chat peut continuer
    } catch (error: any) {
      console.error('Erreur lors du démarrage du chat:', error);
      Alert.alert('Erreur', error.message || "Une erreur est survenue.", [{ text: 'OK', onPress: onClose }]);
      return false;
    }
  }, [productId, sellerId, currentUserId, isCurrentUserSeller, onClose, requestAccess]);

  useEffect(() => {
    // Ce `useEffect` gère l'initialisation complète du chat.
    // Il attend que le profil de l'utilisateur soit chargé avant de faire quoi que ce soit.
    if (profileLoading || !profile) {
      // console.log("Initialisation du chat en attente: le profil n'est pas encore chargé.");
      return; // On attend que le profil soit disponible
    }

    // Utilisation d'une ref pour garantir que l'initialisation ne se lance qu'une seule fois pour ce produit
    if (initializedProductIdRef.current === productId) {
      return;
    }
    initializedProductIdRef.current = productId;

    let channel: any = null;

    const initializeChat = async () => {
      // 1. Vérifier si l'utilisateur peut démarrer le chat et déduire les avicoins si nécessaire.
      // Cette fonction utilise maintenant le `profile` qui est garanti d'être chargé.
      const canProceed = await checkAndChargeForNewChat();

      // Si l'utilisateur ne peut pas continuer (solde insuffisant), on arrête tout ici.
      if (!canProceed) {
        setIsLoading(false);
        return;
      }

      // --- L'utilisateur est autorisé, on continue l'initialisation ---

      // 2. Marquer les messages existants comme lus
      await markMessagesAsRead();

      // 3. S'abonner aux nouveaux messages en temps réel
      const channelName = `chat:${productId}:${currentUserId}`;
      if (!productId || !currentUserId) {
        console.warn('⚠️ [MarketplaceChat] productId ou currentUserId manquant, impossible de créer le canal.');
        setIsLoading(false);
        return;
      }

      channel = supabase.channel(channelName)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'marketplace_messages',
          filter: `product_id=eq.${productId} AND receiver_id=eq.${currentUserId}`
        }, (payload) => {
          console.log('💌 Nouveau message reçu en temps réel!', payload.new);
          const newMessage: Message = {
            id: payload.new.id.toString(),
            senderId: payload.new.sender_id,
            text: payload.new.message,
            timestamp: payload.new.created_at,
            isBlocked: payload.new.is_blocked || false,
          };
          setMessages(prevMessages => [...prevMessages, newMessage]);
          markMessagesAsRead(); // Marquer comme lu dès la réception
        })
        .subscribe();

      // 4. Récupérer le nom du vendeur si nécessaire
      if (sellerName === 'Vendeur' || sellerName === 'Utilisateur' || !sellerName) {
        const fetchSellerName = async () => {
          try { // Supabase est déjà importé depuis config
            const { data, error } = await supabase.from('profiles').select('full_name').eq('user_id', sellerId).single();
            if (error) throw error;
            if (data?.full_name) {
              setInterlocutorName(data.full_name);
            }
          } catch (error) {
            console.error('Could not fetch seller name', error);
          }
        };
        fetchSellerName();
      }

      // 5. Le chargement est terminé, on peut afficher le chat
      setIsLoading(false);
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
    };

    initializeChat();

    // La fonction de nettoyage sera appelée lorsque le composant est démonté
    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [profile, profileLoading, checkAndChargeForNewChat, markMessagesAsRead, productId, currentUserId, sellerId, sellerName]);


  const handleSendMessage = async () => {
    const trimmedText = inputText.trim();

    if (!trimmedText) {
      Alert.alert('Message Vide', 'Veuillez entrer un message avant d\'envoyer.');
      return;
    }

    if (trimmedText.length < 2) {
      Alert.alert('Message Trop Court', 'Votre message doit contenir au moins 2 caractères.');
      return;
    }

    if (trimmedText.length > 500) {
      Alert.alert('Message Trop Long', 'Votre message ne peut pas dépasser 500 caractères.');
      return;
    }

    /* 
    DÉSACTIVÉ : Autoriser l'envoi de numéros de téléphone et infos de contact
    const isSpam = containsContactInfo(trimmedText);

    if (isSpam) {
      Alert.alert(
        'Contenu Bloqué 🚫',
        'Votre message contient des informations de contact personnelles (numéro de téléphone, email, etc.). Pour votre sécurité et celle des autres utilisateurs, ces informations sont automatiquement masquées.\n\nUtilisez le chat pour discuter des produits et services.',
        [
          { text: 'Annuler', style: 'cancel' },
          {
            text: 'Envoyer Quand Même',
            onPress: () => {
              const sanitized = sanitizeText(trimmedText);
              sendMessage(sanitized, true);
            }
          }
        ]
      );
      return;
    }
    */

    sendMessage(trimmedText, false);
  };

  const sendMessage = async (text: string, wasBlocked: boolean) => {
    setIsSending(true);

    try {
      const newMessage: Message = {
        id: Date.now().toString(),
        senderId: currentUserId,
        text,
        timestamp: new Date().toISOString(),
        isBlocked: wasBlocked,
      };

      console.log('Sending message:', newMessage);

      // Send message to Supabase
      // Supabase est déjà importé depuis config

      const { error } = await supabase.from('marketplace_messages').insert({
        product_id: productId,
        sender_id: currentUserId,
        receiver_id: sellerId,
        message: text,
        is_blocked: wasBlocked,
        read_at: null,
      });

      if (error) throw error;

      setMessages(prev => [...prev, newMessage]);
      setInputText('');

      // Scroll to bottom
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);

      if (wasBlocked) {
        Alert.alert(
          'Message Envoyé',
          'Votre message a été envoyé avec les informations sensibles masquées.'
        );
      }
    } catch (error: any) {
      console.error('Error sending message:', error);
      Alert.alert(
        'Erreur d\'Envoi',
        'Impossible d\'envoyer le message. Veuillez vérifier votre connexion internet et réessayer.',
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Réessayer', onPress: () => sendMessage(text, wasBlocked) }
        ]
      );
    } finally {
      setIsSending(false);
    }
  };

  const reportUser = () => {
    Alert.alert(
      'Signaler l\'Utilisateur',
      'Pourquoi souhaitez-vous signaler cet utilisateur?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Spam',
          onPress: () => {
            console.log('Reporting user for spam');
            Alert.alert('Signalement Envoyé', 'Merci pour votre signalement. Notre équipe va examiner ce compte.');
          }
        },
        {
          text: 'Contenu Inapproprié',
          onPress: () => {
            console.log('Reporting user for inappropriate content');
            Alert.alert('Signalement Envoyé', 'Merci pour votre signalement. Notre équipe va examiner ce compte.');
          }
        },
        {
          text: 'Arnaque',
          onPress: () => {
            console.log('Reporting user for scam');
            Alert.alert('Signalement Envoyé', 'Merci pour votre signalement. Notre équipe va examiner ce compte.');
          }
        }
      ]
    );
  };

  const blockUser = () => {
    Alert.alert(
      'Bloquer l\'Utilisateur',
      `Êtes-vous sûr de vouloir bloquer ${sellerName}? Vous ne pourrez plus recevoir de messages de cet utilisateur.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Bloquer',
          style: 'destructive',
          onPress: () => {
            console.log('Blocking user:', sellerId);
            Alert.alert('Utilisateur Bloqué', `${sellerName} a été bloqué avec succès.`);
            onClose();
          }
        }
      ]
    );
  };

  const renderMessage = (message: Message) => {
    const isOwnMessage = message.senderId === currentUserId;

    return (
      <View
        key={message.id}
        style={[
          styles.messageContainer,
          isOwnMessage ? styles.ownMessage : styles.otherMessage
        ]}
      >
        <View style={[
          styles.messageBubble,
          isOwnMessage ? styles.ownMessageBubble : styles.otherMessageBubble
        ]}>
          {message.isBlocked && (
            <View style={styles.blockedBadge}>
              <Icon name="shield-checkmark" size={12} color={colors.warning} />
              <Text style={styles.blockedText}>Contenu filtré</Text>
            </View>
          )}
          <Text style={[
            styles.messageText,
            isOwnMessage ? styles.ownMessageText : styles.otherMessageText
          ]}>
            {message.text}
          </Text>
          <Text style={[
            styles.messageTime,
            isOwnMessage ? styles.ownMessageTime : styles.otherMessageTime
          ]}>
            {new Date(message.timestamp).toLocaleTimeString('fr-FR', {
              hour: '2-digit',
              minute: '2-digit'
            })}
          </Text>
        </View>
      </View>
    );
  };

  // Affiche un écran de chargement pendant la vérification initiale
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Vérification en cours...</Text>
      </View>
    );
  }
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>{productName}</Text>
        </View>
        <TouchableOpacity onPress={reportUser} style={styles.moreButton}>
          <Icon name="ellipsis-vertical" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      <SmartTunnelModal {...tunnelProps} />

      <View style={styles.warningBanner}>
        <Icon name="shield-checkmark" size={20} color={colors.warning} />
        <Text style={styles.warningText}>
          Ne partagez jamais vos informations personnelles (numéro, email, etc.)
        </Text>
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
      >
        {messages.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="chatbubbles-outline" size={64} color={colors.textSecondary} />
            <Text style={styles.emptyStateText}>Aucun message</Text>
            <Text style={styles.emptyStateSubtext}>
              Commencez la conversation à propos de {productName}
            </Text>
          </View>
        ) : (
          messages.map(renderMessage)
        )}
      </ScrollView>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Écrivez votre message..."
          placeholderTextColor={colors.textSecondary}
          multiline
          maxLength={500}
          editable={!isSending}
        />
        <TouchableOpacity
          style={[styles.sendButton, (!inputText.trim() || isSending) && styles.sendButtonDisabled]}
          onPress={handleSendMessage}
          disabled={!inputText.trim() || isSending}
        >
          <Icon
            name={isSending ? "hourglass" : "send"}
            size={24}
            color={(!inputText.trim() || isSending) ? colors.textSecondary : colors.backgroundAlt}
          />
        </TouchableOpacity>
      </View>

      <View style={styles.actionsBar}>
        <TouchableOpacity onPress={blockUser} style={styles.actionButton}>
          <Icon name="ban" size={16} color={colors.error} />
          <Text style={styles.actionButtonText}>Bloquer</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={reportUser} style={styles.actionButton}>
          <Icon name="flag" size={16} color={colors.warning} />
          <Text style={styles.actionButtonText}>Signaler</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
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
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.backgroundAlt,
  },
  backButton: {
    padding: 4,
    marginRight: 12,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  moreButton: {
    padding: 4,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: colors.warning + '20',
    borderBottomWidth: 1,
    borderBottomColor: colors.warning + '40',
  },
  warningText: {
    flex: 1,
    fontSize: 12,
    color: colors.warning,
    fontWeight: '500',
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    flexGrow: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  messageContainer: {
    marginBottom: 12,
  },
  ownMessage: {
    alignItems: 'flex-end',
  },
  otherMessage: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
  },
  ownMessageBubble: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  otherMessageBubble: {
    backgroundColor: colors.backgroundAlt,
    borderBottomLeftRadius: 4,
  },
  blockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  blockedText: {
    fontSize: 10,
    color: colors.warning,
    fontWeight: '500',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  ownMessageText: {
    color: colors.backgroundAlt,
  },
  otherMessageText: {
    color: colors.text,
  },
  messageTime: {
    fontSize: 11,
    marginTop: 4,
  },
  ownMessageTime: {
    color: colors.backgroundAlt + 'CC',
  },
  otherMessageTime: {
    color: colors.textSecondary,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.backgroundAlt,
    gap: 8,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.background,
    maxHeight: 100,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: colors.border,
  },
  actionsBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.backgroundAlt,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  actionButtonText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
});