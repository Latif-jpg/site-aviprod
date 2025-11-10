
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { colors } from '../styles/commonStyles';
import Icon from './Icon';
import Button from './Button';
import { supabase } from '../config'; // Import supabase directly

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
  const [interlocutorName, setInterlocutorName] = useState(sellerName);
  const scrollViewRef = useRef<ScrollView>(null);

  const loadMessages = useCallback(async () => {
    try { // Supabase est déjà importé depuis config

      const { data, error } = await supabase
        .from('marketplace_messages')
        .select('*')
        .eq('product_id', productId)
        .in('sender_id', [currentUserId, sellerId])
        .in('receiver_id', [currentUserId, sellerId])
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Transform data to match our Message interface
      const transformedMessages: Message[] = (data || []).map(msg => ({
        id: msg.id.toString(),
        senderId: msg.sender_id,
        text: msg.message,
        timestamp: msg.created_at,
        isBlocked: msg.is_blocked || false,
      }));

      setMessages(transformedMessages);

      // Scroll to bottom after loading
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error: any) {
      console.error('Error loading messages:', error);
    }
  }, [productId, sellerId, currentUserId]);

  useEffect(() => {
    // Load messages from Supabase
    console.log('Loading chat messages for product:', productId);
    loadMessages();

    // --- AJOUT : S'abonner aux nouveaux messages en temps réel ---
    const setupSubscription = async () => {
      // Supabase est déjà importé depuis config

      const channel = supabase.channel(`chat:${productId}:${currentUserId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'marketplace_messages',
            // Écouter uniquement les messages pour cette conversation et destinés à l'utilisateur actuel
            filter: `product_id=eq.${productId} and receiver_id=eq.${currentUserId} and sender_id=eq.${sellerId}`
          },
          (payload) => {
            console.log('💌 Nouveau message reçu en temps réel!', payload.new);
            const newMessage: Message = {
              id: payload.new.id.toString(),
              senderId: payload.new.sender_id,
              text: payload.new.message,
              timestamp: payload.new.created_at,
              isBlocked: payload.new.is_blocked || false,
            };
            setMessages(prevMessages => [...prevMessages, newMessage]);
            markMessagesAsRead(); // <-- CORRECTION : Marquer comme lu dès la réception
          }
        )
        .subscribe();

      // Nettoyer l'abonnement quand le composant est démonté
      return () => {
        supabase.removeChannel(channel);
      };
    };

    // Fetch seller name if it's generic
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

    // Mark messages as read when chat opens
    markMessagesAsRead();
  }, [loadMessages]);

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

  const containsSpam = (text: string): boolean => {
    const spamPatterns = [
      /\d{10,}/,  // Phone numbers (10+ digits)
      /\d{2,}[-.\s]\d{2,}[-.\s]\d{2,}/,  // Formatted phone numbers
      /@/,  // Email addresses
      /whatsapp/i,
      /telegram/i,
      /facebook/i,
      /instagram/i,
      /appel/i,
      /contact/i,
    ];

    return spamPatterns.some(pattern => pattern.test(text));
  };

  const sanitizeMessage = (text: string): string => {
    // Remove phone numbers
    let sanitized = text.replace(/\d{10,}/g, '[NUMÉRO MASQUÉ]');
    sanitized = sanitized.replace(/\d{2,}[-.\s]\d{2,}[-.\s]\d{2,}/g, '[NUMÉRO MASQUÉ]');
    
    // Remove email addresses
    sanitized = sanitized.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL MASQUÉ]');
    
    return sanitized;
  };

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

    const isSpam = containsSpam(trimmedText);

    if (isSpam) {
      Alert.alert(
        'Contenu Bloqué 🚫',
        'Votre message contient des informations de contact personnelles (numéro de téléphone, email, etc.). Pour votre sécurité et celle des autres utilisateurs, ces informations sont automatiquement masquées.\n\nUtilisez le chat pour discuter des produits et services.',
        [
          { text: 'Annuler', style: 'cancel' },
          {
            text: 'Envoyer Quand Même',
            onPress: () => {
              const sanitized = sanitizeMessage(trimmedText);
              sendMessage(sanitized, true);
            }
          }
        ]
      );
      return;
    }

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
