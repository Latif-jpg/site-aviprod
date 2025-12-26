import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, ActivityIndicator, TouchableOpacity, TextInput, ScrollView } from 'react-native';
// import * as Clipboard from 'expo-clipboard'; // Commenté car non utilisé
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { colors, commonStyles } from '../styles/commonStyles';
import Icon from '../components/Icon';
import { supabase, ensureSupabaseInitialized } from '../config';

interface Order {
  id: string;
  total_price: number;
  status: string;
  delivery_requested: boolean;
  buyer_id: string;
  seller_id: string;
  product_id: string;
  quantity: number;
  product: {
    name: string;
    price: number;
  };
  buyer: {
    full_name: string;
  };
  seller: {
    full_name: string;
  };
}

const PENDING_PAYMENT_STORAGE_KEY = '@pending_payment_info';

export default function OrderPaymentScreen() {
  const { orderId, itemType, itemId, amount, planName } = useLocalSearchParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [transactionRef, setTransactionRef] = useState('');
  const [paymentNumber, setPaymentNumber] = useState('');
  const [paymentType, setPaymentType] = useState<'order' | 'subscription' | 'avicoins'>('order');


  useEffect(() => {
    // Déterminer le type de paiement
    if (itemType === 'abonnement') {
      setPaymentType('subscription');
    } else if (itemType === 'avicoin') {
      setPaymentType('avicoins');
    } else {
      setPaymentType('order');
    }

    const initializePayment = async () => {
      const currentPaymentId = (orderId || itemId) as string;

      // Essayer de restaurer une session de paiement en cours
      try {
        const pendingPaymentJSON = await AsyncStorage.getItem(PENDING_PAYMENT_STORAGE_KEY);
        if (pendingPaymentJSON) {
          const pendingPayment = JSON.parse(pendingPaymentJSON);
          // Restaurer uniquement si l'ID correspond à la session actuelle
          if (pendingPayment.order.id === currentPaymentId) {
            console.log('🔄 Restauration de la session de paiement...');
            setOrder(pendingPayment.order);
            setPaymentType(pendingPayment.paymentType);
            setTransactionRef(pendingPayment.transactionRef);
            setPaymentNumber(pendingPayment.paymentNumber || '');
            setLoading(false);
            return; // Arrêter ici si la restauration a réussi
          }
        }
      } catch (e) {
        console.error("Échec de la restauration de la session de paiement", e);
      }

      // Si aucune session n'est restaurée, charger normalement
      if (orderId) {
        loadOrderDetails(orderId as string);
      } else if (itemId && amount) {
        // Pour les abonnements/avicoins, créer un objet de paiement virtuel
        let itemQuantity = 1;
        let itemName = planName as string || (itemType === 'avicoin' ? 'Avicoins' : 'Abonnement');

        if (itemType === 'avicoin' && planName) {
          // Extrait le nombre de pièces du nom du plan (ex: "50 Avicoins" -> 50)
          const quantityMatch = (planName as string).match(/\d+/);
          if (quantityMatch) {
            itemQuantity = parseInt(quantityMatch[0], 10);
          }
        }

        setOrder({
          id: itemId as string,
          total_price: parseInt(amount as string),
          status: 'pending',
          quantity: itemQuantity,
          product: {
            name: itemName,
            price: parseInt(amount as string)
          },
          buyer: { full_name: 'Vous' },
          seller: { full_name: 'Aviprod' }
        } as Order);
        setLoading(false);
      }
    };

    initializePayment();
  }, [orderId, itemType, itemId, amount, planName]);

  // Sauvegarder l'état dans AsyncStorage à chaque changement
  useEffect(() => {
    if (order) {
      const dataToSave = { order, paymentType, transactionRef, paymentNumber };
      AsyncStorage.setItem(PENDING_PAYMENT_STORAGE_KEY, JSON.stringify(dataToSave));
    }
  }, [order, paymentType, transactionRef, paymentNumber]);

  const loadOrderDetails = async (id: string) => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          buyer:profiles!buyer_id(full_name),
          seller:profiles!seller_id(full_name)
        `)
        .eq('id', id)
        .single();

      // Charger les détails du produit séparément
      let productData = null;
      if (data?.product_id) {
        const { data: product, error: productError } = await supabase
          .from('marketplace_products')
          .select('name, price')
          .eq('id', data.product_id)
          .single();

        if (!productError && product) {
          productData = product;
        }
      }

      if (error) throw error;

      if (data) {
        // Combiner les données de la commande avec les détails du produit
        const orderWithProduct = {
          ...data,
          product: productData ? {
            name: productData.name,
            price: productData.price
          } : {
            name: 'Produit',
            price: data.total_price / (data.quantity || 1)
          }
        } as Order;

        setOrder(orderWithProduct);
      } else {
        Alert.alert('Erreur', 'Commande non trouvée');
        router.back();
      }
    } catch (error: any) {
      console.error('Erreur chargement commande:', error);
      Alert.alert('Erreur', 'Impossible de charger les détails de la commande');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitProof = async () => {
    if (!transactionRef.trim()) {
      Alert.alert('Erreur', 'Veuillez saisir l\'ID de la transaction Orange Money.');
      return;
    }
    if (!paymentNumber.trim()) {
      Alert.alert('Erreur', 'Veuillez saisir le numéro de téléphone de paiement.');
      return;
    }
    if (!order) return;

    setIsSubmitting(true);
    try {
      const supabase = await ensureSupabaseInitialized();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        Alert.alert('Erreur', 'Session expirée. Veuillez vous reconnecter.');
        setIsSubmitting(false);
        return;
      }

      // Construire l'objet de base pour la preuve de paiement
      const baseProofData = {
        user_id: user.id,
        amount: order.total_price,
        payment_number: paymentNumber.trim(),
        transaction_reference: transactionRef.trim(),
        payment_method: 'Orange Money',
        status: 'pending',
        // Rendre les notes plus claires
        notes: paymentType === 'avicoins'
          ? `Achat de ${order.quantity} Avicoins (Plan: ${order.product.name}, ID: ${order.id})`
          : paymentType === 'subscription' ? `Abonnement ${order.product.name} (ID: ${order.id})` : `Paiement pour ${paymentType}: ${order.product.name}`,
        quantity: order.quantity, // Ajout de la quantité (nombre d'Avicoins)
        payment_type: paymentType // Ajout du type de paiement ('order', 'subscription', 'avicoins')
      };

      // Construire dynamiquement l'objet de preuve pour n'inclure que la clé d'ID pertinente.
      // Cela évite les erreurs si une colonne (ex: avicoins_plan_id) n'existe pas encore dans la DB.
      const proofData: any = { ...baseProofData };
      if (paymentType === 'order') {
        proofData.order_id = order.id; // La colonne 'order_id' existe bien.
      } else if (paymentType === 'subscription') {
        proofData.reference_id = order.id; // Utiliser 'reference_id' pour les abonnements.
      } else if (paymentType === 'avicoins') {
        // CORRECTION CRITIQUE : Assurer que l'ID du pack est toujours envoyé.
        // C'est cette information qui permet au trigger de créditer les Avicoins.
        proofData.reference_id = order.id;
      }

      // --- LOG DE VÉRIFICATION DEMANDÉ ---
      // Ce log permet de vérifier que l'ID du pack Avicoins (reference_id) est bien présent
      // avant l'insertion dans la base de données.
      if (paymentType === 'avicoins') {
        console.log('✅ [VÉRIFICATION AVICOINS] L\'ID du pack Avicoins est prêt à être envoyé:', proofData.reference_id);
      }

      // --- AJOUT D'UN LOG DE DÉBOGAGE ---
      console.log('[LOG ETAPE 3/4] Données prêtes à être insérées dans payment_proofs:', JSON.stringify(proofData, null, 2));

      const { error: proofError } = await supabase
        .from('payment_proofs')
        .insert([proofData]);

      // --- CORRECTION : Mettre à jour le statut de la commande à "paid" ---
      if (paymentType === 'order' && !proofError) {
        const { error: orderUpdateError } = await supabase
          .from('orders')
          .update({ status: 'paid' })
          .eq('id', order.id);
        if (orderUpdateError) throw orderUpdateError;
      }

      // --- LOG DE L'ERREUR SUBASE ---
      if (proofError) {
        console.error('❌ Supabase error during payment proof submission:', proofError);
        console.log(`[LOG ETAPE 4/4 - ÉCHEC] La soumission a échoué. Erreur: ${proofError.message}`);
        Alert.alert('Erreur', `Impossible de soumettre la preuve de paiement. Veuillez réessayer. Détails: ${proofError.message}`);
      }


      if (proofError) throw proofError;

      console.log('[LOG ETAPE 4/4 - SUCCÈS] La preuve de paiement a été insérée avec succès dans la base de données.');
      // Nettoyer la session de paiement après soumission
      await AsyncStorage.removeItem(PENDING_PAYMENT_STORAGE_KEY);

      const successMessage = paymentType === 'order'
        ? 'Votre preuve de paiement a été soumise. Nous la vérifierons dans les plus brefs délais. Vous serez notifié une fois la commande confirmée.'
        : paymentType === 'subscription'
        ? 'Votre preuve de paiement d\'abonnement a été soumise. Nous l\'activerons après vérification.'
        : 'Votre preuve de paiement d\'avicoins a été soumise. Ils seront crédités après vérification.';

      const redirectRoute = paymentType === 'order' ? '/order-tracking' : '/profile';

      Alert.alert(
        'Preuve Soumise ✅',
        successMessage,
        [{ text: 'OK', onPress: () => {
            router.replace(redirectRoute as any);
        }}]
      );

    } catch (error: any) {
      Alert.alert('Erreur', 'Impossible de soumettre la preuve de paiement. Veuillez réessayer.');
    } finally {
      setIsSubmitting(false);
    }
  };
  if (loading) {
    return (
      <SafeAreaView style={commonStyles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Chargement de la commande...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!order) {
    return (
      <SafeAreaView style={commonStyles.container}>
        <View style={styles.errorContainer}>
          <Icon name="alert-circle" size={48} color={colors.error} />
          <Text style={styles.errorText}>Commande non trouvée</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={commonStyles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={async () => {
            // Nettoyer la session en quittant
            await AsyncStorage.removeItem(PENDING_PAYMENT_STORAGE_KEY);
            router.back();
          }} 
          style={styles.backButton}>
          <Icon name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {paymentType === 'order' ? 'Paiement de commande' :
           paymentType === 'subscription' ? 'Paiement d\'abonnement' :
           'Achat d\'avicoins'}
        </Text>
      </View>

      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.spacer} />
        <View style={styles.orderCard}>
          <View style={styles.orderHeader}>
            <Text style={styles.orderTitle}>
              {paymentType === 'order' ? `Commande #${order.id.slice(-8)}` :
               paymentType === 'subscription' ? `Abonnement ${order.product?.name}` :
               `Achat ${order.product?.name}`}
            </Text>
            <View style={[styles.statusBadge, { backgroundColor: colors.primary + '20' }]}>
              <Text style={[styles.statusText, { color: colors.primary }]}>
                {paymentType === 'order' ? 'Prête pour livraison' :
                 paymentType === 'subscription' ? 'À activer' :
                 'À créditer'}
              </Text>
            </View>
          </View>

          {paymentType === 'order' && (
            <View style={styles.orderDetails}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Produit :</Text>
                <Text style={styles.detailValue}>{order.product?.name || 'Produit'}</Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Quantité:</Text>
                <Text style={styles.detailValue}>{order.quantity}</Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Vendeur :</Text>
                <Text style={styles.detailValue}>{order.seller?.full_name || 'Vendeur'}</Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Livraison :</Text>
                <Text style={styles.detailValue}>
                  {order.delivery_requested ? 'Demandée' : 'Non demandée'}
                </Text>
              </View>
            </View>
          )}

          <View style={styles.priceSection}>
            <Text style={styles.priceLabel}>
              {paymentType === 'order' ? 'Montant total' :
               paymentType === 'subscription' ? 'Prix de l\'abonnement' :
               'Montant à payer'}
            </Text>
            <Text style={styles.priceAmount}>{order.total_price.toLocaleString()} CFA</Text>
          </View>
        </View>

        <View style={styles.paymentInstructions}>
          <Text style={styles.instructionsTitle}>Instructions de Paiement</Text>
          <View style={styles.instructionItem}>
            <Text style={styles.instructionNumber}>1.</Text>
            <Text style={styles.instructionText}>
              Composez le code USSD suivant sur votre téléphone :
            </Text>
          </View>
          {/* --- MODIFICATION : Remplacer le bouton par du texte sélectionnable --- */}
          {/* Ceci évite d'utiliser `expo-clipboard` et permet une mise à jour OTA. */}
          {/* L'utilisateur peut faire un appui long sur le texte pour le copier. */}
          <View style={styles.ussdCode}>
            <Text style={styles.ussdText} selectable={true}>
              *144*2*1*56508709*{order.total_price.toString()}#
            </Text>
            <Text style={styles.ussdSubtext}>
              (Appuyez longuement sur le code pour le copier)
            </Text>
          </View>

          <View style={styles.instructionItem}>
            <Text style={styles.instructionNumber}>2.</Text>
            <Text style={styles.instructionText}>
              <Text style={{ fontWeight: 'bold' }}>Très important :</Text> Incluez le message suivant dans votre transfert :
            </Text>
          </View>
          {/* --- MODIFICATION : Message de référence dynamique --- */}
          <View style={styles.referenceBox}>
            <Text style={styles.referenceText} selectable={true}>
              {(() => {
                // Génère la date et l'heure actuelles au format français
                const now = new Date();
                const formattedDate = now.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
                const formattedTime = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

                // Construit le détail du paiement
                let paymentDetail = '';
                if (paymentType === 'order') {
                  paymentDetail = `Cmd #${order.id.slice(-6)}`;
                } else if (paymentType === 'subscription') {
                  paymentDetail = `Abo ${planName}`;
                } else if (paymentType === 'avicoins') {
                  paymentDetail = `Achat ${planName}`;
                }

                return `Aviprod - ${paymentDetail} - ${formattedDate} ${formattedTime}`;
              })()}
            </Text>
          </View>

          <View style={styles.instructionItem}>
            <Text style={styles.instructionNumber}>4.</Text>
            <Text style={styles.instructionText}>
              Après le paiement, saisissez l'ID de la transaction reçu par SMS et validez.
            </Text>
          </View>
        </View>

        <View style={styles.bottomContainer}>
          <TextInput
            style={styles.input}
            placeholder="Numéro de téléphone de paiement"
            value={paymentNumber}
            onChangeText={setPaymentNumber}
            keyboardType="phone-pad"
          />
          <TextInput
            style={styles.input}
            placeholder="ID de la transaction Orange Money"
            value={transactionRef}
            onChangeText={setTransactionRef}
          />
          <TouchableOpacity
            style={[styles.payButton, isSubmitting && { opacity: 0.7 }]}
            onPress={handleSubmitProof}
            disabled={isSubmitting}
          >
            <Icon name="checkmark-circle" size={24} color={colors.white} />
            <Text style={styles.payButtonText}>{isSubmitting ? 'Soumission...' : 'J\'ai payé, soumettre la preuve'}</Text>
          </TouchableOpacity>
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
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
  },  
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    backgroundColor: colors.background,
  },
  spacer: {
    height: 20, // Petit espace en haut
  },
  bottomContainer: {
    padding: 20,
    backgroundColor: colors.background,
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.error,
    marginTop: 16,
  },
  orderCard: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  orderTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  orderDetails: {
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border + '30',
  },
  detailLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  priceSection: {
    backgroundColor: colors.primary + '10',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  priceAmount: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.primary,
  },
  paymentInstructions: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  instructionsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  instructionItem: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  instructionNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.primary,
    marginRight: 8,
  },
  instructionText: {
    fontSize: 14,
    color: colors.text,
    flex: 1,
    lineHeight: 20,
  },
  omNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.orange,
    textAlign: 'center',
    marginVertical: 8,
    backgroundColor: colors.orange + '20',
    padding: 8,
    borderRadius: 8,
  },
  referenceBox: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 12,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  referenceText: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: colors.text,
    textAlign: 'center',
  },
  ussdCode: {
    backgroundColor: colors.primary + '10',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
  },
  ussdText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
    fontFamily: 'monospace',
    textAlign: 'center',
  },
  ussdSubtext: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  payButton: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    marginBottom: 16,
  },
  payButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.white,
  },
  input: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },
});
