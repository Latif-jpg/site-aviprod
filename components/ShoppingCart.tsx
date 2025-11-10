import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, Image, Modal, TextInput } from 'react-native';
import { colors, commonStyles } from '../styles/commonStyles';
import Icon from './Icon';
import Button from './Button'; // Importation correcte
import { supabase } from '../config'; // Import supabase directly
import { useAuth } from '../hooks/useAuth';
import { useDataCollector } from '../src/hooks/useDataCollector';

interface CartItem {
  id: string;
  product_id: string;
  quantity: number;
  product: {
    name: string;
    price: number;
    image: string;
    seller_id: string;
  };
}

interface ShoppingCartProps {
  onClose: () => void;
  onCheckout: () => void;
}

type DeliveryOption = 'pickup' | 'delivery' | 'expedition';

export default function ShoppingCart({ onClose, onCheckout }: ShoppingCartProps) {
  const { user, loading: authLoading } = useAuth();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [deliveryFee, setDeliveryFee] = useState(0);

  const [deliveryOption, setDeliveryOption] = useState<DeliveryOption>('pickup');
  const [isAddressModalVisible, setIsAddressModalVisible] = useState(false);
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const { trackAction } = useDataCollector();

  useEffect(() => {
    if (!authLoading) {
      loadCart();
    }
  }, [user, authLoading]);

  const loadCart = async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('shopping_cart')
        .select(`id, product_id, quantity, product:marketplace_products(name, price, image, seller_id)`)
        .eq('user_id', user.id);

      if (error) throw error;
      setCartItems(data as any || []);
    } catch (error) {
      console.error('Error loading cart:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateQuantity = async (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) {
      removeItem(itemId);
      return;
    }
    try {
      const { error } = await supabase.from('shopping_cart').update({ quantity: newQuantity }).eq('id', itemId);
      if (error) throw error;
      setCartItems(prev => prev.map(item => item.id === itemId ? { ...item, quantity: newQuantity } : item));
    } catch (error) {
      console.error('Error updating quantity:', error);
      Alert.alert('Erreur', 'Impossible de mettre à jour la quantité');
    }
  };

  const removeItem = async (itemId: string) => {
    try {
      const { error } = await supabase.from('shopping_cart').delete().eq('id', itemId);
      if (error) throw error;
      setCartItems(prev => prev.filter(item => item.id !== itemId));
      Alert.alert('Succès', 'Article retiré du panier');
    } catch (error) {
      console.error('Error removing item:', error);
      Alert.alert('Erreur', 'Impossible de retirer l\'article');
    }
  };

  // Fonction pour calculer dynamiquement les frais de livraison
  const calculateDeliveryFee = async (neighborhood: string) => {
    if (deliveryOption === 'pickup') {
      setDeliveryFee(0);
      return 0;
    }
    try {
      const { data, error } = await supabase.rpc('get_delivery_fee', { neighborhood_name: neighborhood });
      if (error) throw error;
      setDeliveryFee(data);
      return data;
    } catch (error) {
      console.error("Error calculating delivery fee:", error);
      const defaultFee = 2500; // Fallback fee
      setDeliveryFee(defaultFee);
      return defaultFee;
    }
  };

  const handleCheckout = async (deliveryDetails: { address: string, phone: string, city: string } | null) => {
    if (cartItems.length === 0) {
      Alert.alert('Panier Vide', 'Ajoutez des articles avant de passer commande');
      return;
    }
    if (!user) {
      Alert.alert('Non connecté', 'Vous devez être connecté pour passer une commande.');
      return;
    }

    setIsProcessing(true);

    try {
      // Utiliser une fonction RPC pour créer les commandes et les notifications de manière atomique
      for (const item of cartItems) {
        const { error: rpcError } = await supabase.rpc('create_order_with_notification', {
          p_buyer_id: user.id,
          p_seller_id: item.product.seller_id,
          p_product_id: item.product_id,
          p_quantity: item.quantity,
          p_total_price: item.product.price * item.quantity,
          p_delivery_fee: deliveryFee,
          p_delivery_requested: deliveryOption !== 'pickup',
          p_delivery_address: deliveryDetails ? {
            address: deliveryDetails.address,
            city: deliveryDetails.city,
            phone: deliveryDetails.phone,
            coordinates: [-1.5197, 12.3714] // Coordonnées par défaut
          } : null,
          // Notification details
          p_notification_type: 'new_order',
          p_notification_title: 'Nouvelle commande reçue',
          p_notification_message: `Vous avez une nouvelle commande pour ${item.quantity} x ${item.product.name}.`,
          p_notification_data: {
            action: 'view_seller_orders'
          }
        });

        if (rpcError) {
          console.error(`❌ Erreur RPC pour le produit ${item.product_id}:`, rpcError);
          // On peut choisir de continuer ou d'arrêter tout le processus
          throw new Error(`Impossible de créer la commande pour ${item.product.name}.`);
        }
        console.log(`✅ Commande et notification créées pour le produit ${item.product_id}`);
      }

      const { error: clearError } = await supabase.from('shopping_cart').delete().eq('user_id', user.id);
      if (clearError) throw clearError;

      // TRACKER LE PASSAGE DE COMMANDE
      const totalAmount = cartItems.reduce((sum, item) => sum + (item.product.price * item.quantity), 0) + deliveryFee;
      trackAction('order_placed', {
        order_id: 'new_order', // Sera mis à jour avec l'ID réel
        total_amount: totalAmount,
        items_count: cartItems.length,
        delivery_option: deliveryOption,
        delivery_fee: deliveryFee,
        seller_ids: [...new Set(cartItems.map(item => item.product.seller_id))]
      });

      Alert.alert('✅ Commande Passée', 'Votre commande a été enregistrée avec succès.', [
        { text: 'OK', onPress: onCheckout }
      ]);
    } catch (error) {
      console.error('❌ Error processing checkout:', error);
      Alert.alert('Erreur', 'Impossible de passer la commande');
    } finally {
      setIsProcessing(false);
    }
  };

  const initiateCheckout = () => {
    // Si c'est un retrait, pas besoin d'adresse
    if (deliveryOption === 'pickup') {
      handleCheckout(null);
      return;
    }

    // Pour la livraison ou l'expédition, toujours demander l'adresse
    setIsAddressModalVisible(true);
  };

  const renderAddressModal = () => (
    <Modal
      transparent={true}
      animationType="slide"
      visible={isAddressModalVisible}
      onRequestClose={() => setIsAddressModalVisible(false)}
    >
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setIsAddressModalVisible(false)} />
      <View style={styles.modalContentWrapper}>
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>Adresse de Livraison</Text>
          <TextInput style={styles.input} placeholder="Ville (ex: Ouagadougou)" value={city} onChangeText={setCity} />
          <TextInput 
            style={styles.input} 
            placeholder="Quartier/Secteur (ex: Karpala, Saaba)" 
            value={address} 
            onChangeText={(text) => {
              setAddress(text);
              // Recalculer les frais de livraison à chaque changement de quartier
              calculateDeliveryFee(text);
            }} 
          />
          <TextInput style={styles.input} placeholder="Téléphone joignable" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
          <View style={styles.modalActions}>
            <Button title="Annuler" onPress={() => setIsAddressModalVisible(false)} style={{backgroundColor: colors.error}} />
            <Button title="Valider" onPress={() => {
              if (!city || !address || !phone) {
                Alert.alert("Champs requis", "Veuillez remplir tous les champs pour la livraison.");
                return;
              }
              setIsAddressModalVisible(false);
              // Passer directement la commande avec les détails saisis
              handleCheckout({
                address: address,
                phone: phone,
                city: city
              });
            }} />
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderDeliveryOption = (option: DeliveryOption, title: string, subtitle: string) => (
    <TouchableOpacity style={styles.deliveryOptionRow} onPress={() => setDeliveryOption(option)}>
      <View style={[styles.radio, {justifyContent: 'center', alignItems: 'center'}]}>
        {deliveryOption === option && <View style={styles.radioSelected} />}
      </View>
      <View>
        <Text style={styles.deliveryOptionTitle}>{title}</Text>
        <Text style={styles.deliveryOptionSubtitle}>{subtitle}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderPriceBreakdown = () => {
    const subtotal = cartItems.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
    const total = subtotal + deliveryFee;

    return (
      <View style={styles.priceBreakdown}>
        <View style={styles.priceRow}>
          <Text style={styles.priceLabel}>Sous-total</Text>
          <Text style={styles.priceValue}>{subtotal.toLocaleString()} CFA</Text>
        </View>
        {deliveryOption !== 'pickup' && (
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Livraison</Text>
            <Text style={styles.priceValue}>{deliveryFee.toLocaleString()} CFA</Text>
          </View>
        )}
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>{total.toLocaleString()} CFA</Text>
        </View>
      </View>
    );
  }

  if (isLoading || authLoading) {
    return <View style={styles.loadingContainer}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Mon Panier</Text>
        <TouchableOpacity onPress={onClose}><Icon name="close" size={24} color={colors.text} /></TouchableOpacity>
      </View>

      {!user ? (
        <View style={styles.emptyState}>
          <Icon name="shield-checkmark" size={64} color={colors.textSecondary} />
          <Text style={styles.emptyStateText}>Veuillez vous connecter</Text>
        </View>
      ) : cartItems.length === 0 ? (
        <View style={styles.emptyState}>
          <Icon name="cart" size={64} color={colors.textSecondary} />
          <Text style={styles.emptyStateText}>Votre panier est vide</Text>
        </View>
      ) : (
        <>
          <ScrollView style={styles.itemsList}>
            {cartItems.map((item) => (
              <View key={item.id} style={styles.cartItem}>
                <Image source={{ uri: item.product.image }} style={styles.itemImage} />
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName} numberOfLines={2}>{item.product.name}</Text>
                  <Text style={styles.itemPrice}>{item.product.price.toLocaleString()} CFA</Text>
                  <View style={styles.quantityControls}>
                    <TouchableOpacity style={styles.quantityButton} onPress={() => updateQuantity(item.id, item.quantity - 1)}><Icon name="close" size={20} color={colors.text} /></TouchableOpacity>
                    <Text style={styles.quantity}>{item.quantity}</Text>
                    <TouchableOpacity style={styles.quantityButton} onPress={() => updateQuantity(item.id, item.quantity + 1)}><Icon name="add" size={20} color={colors.text} /></TouchableOpacity>
                  </View>
                </View>
                <TouchableOpacity style={styles.removeButton} onPress={() => removeItem(item.id)}><Icon name="trash" size={20} color={colors.error} /></TouchableOpacity>
              </View>
            ))}
          </ScrollView>

          <View style={styles.footer}>
            <View style={styles.deliveryOptionsContainer}>
              {renderDeliveryOption('pickup', 'Retrait sur place', 'Pas de frais supplémentaires')}
              {renderDeliveryOption('delivery', 'Livraison (même ville)', `À partir de 1000 CFA`)}
              {renderDeliveryOption('expedition', 'Expédition (autre ville)', `2000 CFA`)}
            </View>

            {renderPriceBreakdown()}

            <Button
              title={isProcessing ? 'Traitement...' : 'Passer Commande'}
              onPress={initiateCheckout}
              disabled={isProcessing}
            />
          </View>
        </>
      )}
      {renderAddressModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: colors.border },
  title: { fontSize: 24, fontWeight: '700', color: colors.text },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyStateText: { fontSize: 18, fontWeight: '600', color: colors.text, marginTop: 16 },
  itemsList: { paddingHorizontal: 16 },
  cartItem: { flexDirection: 'row', backgroundColor: colors.backgroundAlt, borderRadius: 12, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: colors.border },
  itemImage: { width: 80, height: 80, borderRadius: 8, backgroundColor: colors.border },
  itemInfo: { flex: 1, marginLeft: 12, justifyContent: 'space-between' },
  itemName: { fontSize: 16, fontWeight: '600', color: colors.text },
  itemPrice: { fontSize: 14, fontWeight: '700', color: colors.primary },
  quantityControls: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  quantityButton: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  quantity: { fontSize: 16, fontWeight: '600', color: colors.text, minWidth: 30, textAlign: 'center' },
  removeButton: { padding: 8, alignSelf: 'flex-start' },
  footer: { padding: 20, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.backgroundAlt },
  deliveryOptionsContainer: { marginBottom: 16, gap: 12 },
  deliveryOptionRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  radio: { height: 24, width: 24, borderRadius: 12, borderWidth: 2, borderColor: colors.primary },
  radioSelected: { height: 12, width: 12, borderRadius: 6, backgroundColor: colors.primary },
  deliveryOptionTitle: { fontSize: 16, fontWeight: '600', color: colors.text },
  deliveryOptionSubtitle: { fontSize: 12, color: colors.textSecondary },
  modalOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)' },
  modalContentWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: { width: '90%', backgroundColor: colors.backgroundAlt, borderRadius: 12, padding: 20 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: 20, textAlign: 'center' },
  input: { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 12, fontSize: 16, marginBottom: 12, color: colors.text },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10, gap: 10 },
  priceBreakdown: { marginBottom: 20, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 16, marginTop: 16 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  priceLabel: { fontSize: 16, color: colors.textSecondary },
  priceValue: { fontSize: 16, fontWeight: '600', color: colors.text },
  totalRow: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8, marginTop: 4 },
  totalLabel: { fontSize: 20, fontWeight: 'bold', color: colors.text },
  totalValue: { fontSize: 20, fontWeight: 'bold', color: colors.primary },
});