import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, Dimensions, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Platform } from 'react-native';
import { colors, commonStyles } from '../styles/commonStyles';
import Icon from './Icon'; // Importation correcte
import { supabase, ensureSupabaseInitialized } from '../config'; // Import supabase directly
import { router } from 'expo-router';
import { useDataCollector } from '../src/hooks/useDataCollector';

const { width, height } = Dimensions.get('window');

interface Delivery {
  id: string;
  order_id: string;
  status: string;
  pickup_location: any;
  delivery_location: any;
  estimated_delivery_time: string;
  driver_id?: string;
  order: {
    total_price: number;
    buyer_id: string; // Assuming this is correct
    buyer_name?: string | { full_name: string };
    seller_name?: string | { full_name: string };
    items: any[];
  };
}

interface DriverStats {
  total_deliveries: number;
  avg_rating: number;
  total_earnings: number;
  completed_deliveries: number;
}

interface DriverZone {
  id: string;
  name: string;
  coordinates: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  };
}

export default function DeliveryDriverApp() {
  const [isOnline, setIsOnline] = useState(false);
  const [currentDeliveries, setCurrentDeliveries] = useState<Delivery[]>([]);
  const [availableDeliveries, setAvailableDeliveries] = useState<Delivery[]>([]);
  const [driverStats, setDriverStats] = useState<DriverStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [driverZone, setDriverZone] = useState<DriverZone | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null);
  const [currentLocation, setCurrentLocation] = useState({
    latitude: 12.3714, // Ouagadougou coordinates
    longitude: -1.5197,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });
  const [estimatedTime, setEstimatedTime] = useState('');
  const [isTimeModalVisible, setIsTimeModalVisible] = useState(false);
  const { trackAction } = useDataCollector();

  useEffect(() => {
    // La bonne pratique est d'écouter les changements d'état d'authentification
    // pour s'assurer que la session est bien chargée avant de faire des appels.
    const initialize = async () => {
      
      // 1. Vérifier l'état initial
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        loadDriverData(session.user.id);
      } else {
        setIsLoading(false); // Arrêter le chargement si pas de session initiale
        Alert.alert('Accès refusé', 'Session invalide ou expirée. Veuillez vous reconnecter.', [
          { text: 'Retour', style: 'cancel', onPress: () => router.back() }
        ]);
      }

      // 2. S'abonner aux changements futurs (connexion/déconnexion)
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        if (_event === 'SIGNED_OUT') router.replace('/');
      });
      return () => subscription.unsubscribe();
    };

    initialize();
  }, []);

  useEffect(() => {
    if (isOnline) {
      // Only load deliveries if table exists
      loadAvailableDeliveries().catch(error => {
        console.log('Deliveries table not available yet, skipping load');
      });
      const interval = setInterval(() => {
        loadAvailableDeliveries().catch(error => {
          console.log('Deliveries table not available yet, skipping load');
        });
      }, 30000); // Refresh every 30s
      return () => clearInterval(interval);
    }
  }, [isOnline]);

  // Recharger les livraisons en cours périodiquement quand en ligne
  useEffect(() => {
    if (isOnline) {
      const interval = setInterval(() => {
        loadCurrentDeliveries('').catch(error => {
          console.log('Erreur lors du rechargement des livraisons en cours:', error);
        });
      }, 15000); // Refresh every 15s pour les livraisons en cours
      return () => clearInterval(interval);
    }
  }, [isOnline]);

  const loadDriverData = async (userId: string) => {
    try {
      setIsLoading(true); // Keep loading state

      // Check if user is a driver
      const { data: driverData, error } = await supabase // Correction du nom de la table
        .from('livreur_verifications')
        .select('*')
        .eq('user_id', userId)
        .eq('verification_status', 'approved') // Vérifier si la demande est approuvée
        .limit(1)
        .maybeSingle();

      if (error && error.code === 'PGRST116') {
        // User is not a driver yet
        Alert.alert(
          'Accès refusé',
          'Votre demande de livreur n\'a pas encore été approuvée par l\'administrateur. Vous serez notifié une fois la validation effectuée.',
          [
            { text: 'Retour', style: 'cancel', onPress: () => router.back() }
          ]
        );
        return;
      }

      if (error) throw error;

      // Charger le statut en ligne depuis la table des livreurs
      const { data: livreurStatusData } = await supabase.from('livreur_verifications').select('is_online').eq('user_id', userId).single();
      if (livreurStatusData) {
        setIsOnline(livreurStatusData.is_online || false);
      }

      // Load driver stats - using the view that aggregates data from delivery_drivers
      const { data: stats } = await supabase
        .from('driver_stats')
        .select('*')
        .eq('user_id', userId) // Use user_id instead of driver id
        .maybeSingle();

      setDriverStats(stats);

      // Load driver zone - for now, set a default zone based on location
      // In a real app, this would be stored in the driver profile
      setDriverZone({
        id: 'ouagadougou-center',
        name: 'Centre-ville Ouagadougou',
        coordinates: {
          latitude: 12.3714,
          longitude: -1.5197,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }
      });

      await loadCurrentDeliveries(driverData.id);

      // Recharger les livraisons en cours immédiatement après connexion
      setTimeout(() => {
        loadCurrentDeliveries(driverData.id).catch(error => {
          console.log('Erreur lors du premier rechargement des livraisons:', error);
        });
      }, 1000);

    } catch (error: any) {
      console.error('❌ Error loading driver data:', error);
      Alert.alert('Erreur', 'Impossible de charger les données livreur');
    } finally {
      setIsLoading(false);
    }
  };

  const loadCurrentDeliveries = async (driverVerificationId: string) => {
    // Récupérer l'ID correct de delivery_drivers depuis livreur_verifications
    const { data: driverProfile, error: driverError } = await supabase
      .from('delivery_drivers')
      .select('id')
      .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
      .single();

    if (driverError || !driverProfile) {
      console.log('Aucun profil delivery_drivers trouvé, livraisons vides');
      setCurrentDeliveries([]);
      return;
    }

    const { data: currentDeliveriesData, error: deliveriesError } = await supabase
      .from('deliveries')
      .select(`
        *,
        order:orders(
          total_price,
          buyer_id,
          buyer_name:profiles!buyer_id(full_name),
          seller_name:profiles!seller_id(full_name),
          items:order_items(quantity, product:marketplace_products(name))
        )
      `)
      .eq('driver_id', driverProfile.id) // Utiliser l'ID de delivery_drivers
      .in('status', ['accepted', 'picked_up', 'in_transit']);

    if (deliveriesError) throw deliveriesError;

    if (currentDeliveriesData) {
      setCurrentDeliveries(currentDeliveriesData as any);
    }
  };

  const loadAvailableDeliveries = async () => {
    try {
      // Utilisation de la nouvelle vue SQL pour simplifier la requête
      let query = supabase
        .from('available_deliveries_view')
        .select('*') // La vue a déjà la bonne structure
        .eq('status', 'pending'); // S'assurer de ne prendre que les livraisons en attente

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      console.log('📦 Données brutes reçues de la vue "available_deliveries_view":', JSON.stringify(data, null, 2));

      // Filter deliveries by zone if driver has a zone set
      let filteredData = data || [];
      if (driverZone) {
        console.log(`🗺️ Filtrage des livraisons dans un rayon de 50km autour de la zone: ${driverZone.name}`);
        filteredData = data?.filter(delivery => {
          // Simple distance-based filtering (in a real app, use proper geospatial queries)
          // CORRECTION CRUCIALE : Le format GeoJSON est [longitude, latitude].
          // Nous devons inverser pour notre fonction qui attend (latitude, longitude).
          const coords = delivery.delivery_location?.coordinates;
          const deliveryLat = coords?.[1] || delivery.delivery_location?.latitude;
          const deliveryLng = coords?.[0] || delivery.delivery_location?.longitude;

          if (!deliveryLat || !deliveryLng) return true; // Include if no location data

          const distance = getDistanceFromLatLonInKm(
            driverZone.coordinates.latitude,
            driverZone.coordinates.longitude,
            deliveryLat,
            deliveryLng
          );

          console.log(`📍 Filtrage de la livraison ${delivery.id.slice(-6)}: distance = ${distance.toFixed(2)} km. Incluse: ${distance <= 50}`);

          // Include deliveries within 50km of driver zone for better testing
          return distance <= 50;
        }) || [];
      }

      console.log('✅ Données finales après filtrage:', JSON.stringify(filteredData, null, 2));
      // Le mapping est simplifié car la vue retourne 'order_details' que nous renommons en 'order'
      const mappedData = filteredData.map(d => ({
        ...d,
        order: {
          ...(d.order_details || {}),
          total_price: d.order_details?.total_amount || 0,
        },
      }));
      setAvailableDeliveries(mappedData as Delivery[]);

    } catch (error: any) {
      console.error('❌ Erreur lors du chargement des livraisons disponibles:', error);
    }
  };

  // Helper function to calculate distance between two coordinates
  const getDistanceFromLatLonInKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Distance in km
    return d;
  };

  const deg2rad = (deg: number) => {
    return deg * (Math.PI / 180);
  };

  const toggleOnlineStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser(); // Supabase est déjà importé

      if (!user) return;

      // 1. Déterminer le nouveau statut et mettre à jour l'UI de manière optimiste
      const newStatus = !isOnline;
      setIsOnline(newStatus);

      // 2. Envoyer la mise à jour à la base de données
      const { error } = await supabase
        .from('livreur_verifications')
        .update({
          is_online: newStatus,
          last_seen: new Date().toISOString()
        })
        .eq('user_id', user.id);

      // 3. Si la mise à jour échoue, annuler le changement et afficher une erreur détaillée
      if (error) {
        console.error('❌ DB Error toggling online status:', error);
        // Annuler le changement d'état de l'interface
        setIsOnline(!newStatus);
        Alert.alert('Erreur Réseau', `Impossible de changer le statut. Vérifiez votre connexion et les règles de sécurité (RLS) sur la table 'livreur_verifications'. Détails: ${error.message}`);
        return; // Arrêter l'exécution ici
      }

      if (newStatus) {
        Alert.alert('✅ En ligne', 'Vous recevrez maintenant les demandes de livraison');
      } else {
        Alert.alert('📴 Hors ligne', 'Vous ne recevrez plus de demandes');
      }

    } catch (error: any) {
      console.error('❌ Error toggling online status:', error);
      setIsOnline(!isOnline); // Revert on error
      Alert.alert('Erreur', 'Impossible de changer le statut');
    }
  };

  const acceptDelivery = async (delivery: Delivery) => {
    // Affiche un indicateur de chargement sur le bouton/carte spécifique
    setIsActionLoading(true); 

    if (!isOnline) {
      Alert.alert('Hors ligne', 'Vous devez être en ligne pour accepter une livraison.');
      setIsActionLoading(false);
      return;
    }

    try {
      // Utilisation de la Edge Function pour une assignation atomique et sécurisée
      const { data: assignedDelivery, error } = await supabase.functions.invoke('claim-delivery', {
        body: { deliveryId: delivery.id },
      });

      if (error) {
        // L'erreur sera attrapée et gérée correctement dans le bloc catch
        throw error;
      }

      console.log("Livraison assignée via Edge Function:", assignedDelivery);

      // TRACKER L'ACCEPTATION DE LIVRAISON
      trackAction('delivery_accepted', {
        delivery_id: delivery.id,
        order_id: delivery.order_id,
        total_amount: delivery.order?.total_price || 0,
        items_count: delivery.order?.items?.length || 0,
        pickup_location: delivery.pickup_location,
        delivery_location: delivery.delivery_location
      });

      // Mettre à jour l'état local avec les données fraîches du serveur
      const newDelivery = { ...delivery, status: 'accepted' };
      setCurrentDeliveries(prev => [...prev.filter(d => d.id !== newDelivery.id), newDelivery]);
      setAvailableDeliveries(prev => prev.filter(d => d.id !== delivery.id));

      Alert.alert('✅ Livraison acceptée', 'Rendez-vous au point de retrait');

    } catch (error: any) {
      console.error('❌ Error accepting delivery:', error);

      let errorMessage = 'Impossible d\'accepter la livraison.';
      
      // Vérifier si c'est une erreur de la fonction Edge
      if (error.context && typeof error.context.json === 'function') {
        try {
          // Lire le corps de la réponse d'erreur
          const errorBody = await error.context.json();
          if (errorBody.error) {
            errorMessage = errorBody.error;
          } else {
            // Fallback si le corps JSON n'a pas de champ 'error'
            errorMessage = JSON.stringify(errorBody);
          }
        } catch {
          errorMessage = `La fonction Edge a retourné une erreur non-JSON: ${error.message}`;
        }
      } else {
        errorMessage = error.message;
      }

      Alert.alert('Erreur', errorMessage);
      // Recharger les livraisons disponibles pour actualiser l'UI
      await loadAvailableDeliveries();
    } finally {
      setIsActionLoading(false);
    }
  };

  const updateDeliveryStatus = async (deliveryId: string, status: string) => {
    console.log('\n══════════════════════════════════════════════');
    console.log('🔄 updateDeliveryStatus appelé');
    console.log('══════════════════════════════════════════════');
    console.log('Delivery ID:', deliveryId);
    console.log('Nouveau statut:', status);

    setIsActionLoading(true);

    try {

      const updateData: any = {
        status: status,
        actual_delivery_time: status === 'delivered' ? new Date().toISOString() : null
      };

      if (status === 'delivered') {
        updateData.driver_confirmed = true;
        updateData.driver_confirmation_time = new Date().toISOString();
        console.log('✅ Ajout des données de confirmation livreur');
      }

      console.log('📤 Envoi de la mise à jour:', updateData);

      const { data, error } = await supabase
        .from('deliveries')
        .update(updateData)
        .eq('id', deliveryId)
        .select();

      console.log('📥 Réponse Supabase:', { data, error });

      if (error) {
        console.error('❌ ERREUR SUPABASE:', error);
        console.error('   Code:', error.code);
        console.error('   Message:', error.message);
        console.error('   Details:', error.details);
        console.error('   Hint:', error.hint);
        throw error;
      }

      if (!data || data.length === 0) {
        console.error('⚠️ Aucune ligne mise à jour');
        throw new Error('La mise à jour n\'a affecté aucune ligne');
      }

      console.log('✅ Mise à jour réussie:', data[0]);

      if (status === 'delivered') {
        console.log('💰 Création du paiement...');
        const delivery = currentDeliveries.find(d => d.id === deliveryId);
        if (delivery) {
          await createPaymentRecord(delivery);
          console.log('✅ Paiement créé');
        }

        setCurrentDeliveries(prev => prev.filter(d => d.id !== deliveryId));
        console.log('✅ Livraison retirée de currentDeliveries');

        // TRACKER LA FINALISATION DE LIVRAISON
        trackAction('delivery_completed', {
          delivery_id: deliveryId,
          order_id: delivery?.order_id || '',
          total_amount: delivery?.order?.total_price || 0,
          actual_delivery_time: new Date().toISOString(),
          driver_earnings: (delivery?.order?.total_price || 0) * 0.85 // 85% pour le livreur
        });

        Alert.alert(
          '✅ Livraison terminée',
          'Le client et le vendeur ont été notifiés. Paiement en cours de traitement.'
        );
      } else {
        setCurrentDeliveries(prev => prev.map(d =>
          d.id === deliveryId ? { ...d, status } : d
        ));
        console.log('✅ Statut mis à jour dans currentDeliveries');

        if (status === 'picked_up') {
          Alert.alert('✅ Colis récupéré', 'Vous pouvez maintenant commencer la livraison.');
        }
      }

      console.log('══════════════════════════════════════════════\n');

    } catch (error: any) {
      console.error('\n❌❌❌ ERREUR DANS updateDeliveryStatus ❌❌❌');
      console.error('Message:', error.message);
      console.error('Code:', error.code);
      console.error('══════════════════════════════════════════════\n');

      Alert.alert('Erreur', error.message || 'Impossible de mettre à jour le statut');
    } finally {
      setIsActionLoading(false);
    }
  };

  // ============================================================================
  // DIAGNOSTIC COMPLET: handleStartDelivery avec logs ultra-détaillés
  // ============================================================================
  // Remplacez complètement votre fonction handleStartDelivery par celle-ci
  
  const handleStartDelivery = async () => {
    console.log('\n\n');
    console.log('═════════════════════════════════════════════════════════════');
    console.log('🚀 DÉBUT handleStartDelivery');
    console.log('═════════════════════════════════════════════════════════════');
    
    // ─────────────────────────────────────────────────────────────────────────
    // ÉTAPE 1: Validation de selectedDelivery
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n📋 ÉTAPE 1: Validation selectedDelivery');
    console.log('selectedDelivery:', selectedDelivery ? '✅ EXISTE' : '❌ NULL');
    
    if (!selectedDelivery) {
      console.error('❌ ERREUR: selectedDelivery est null ou undefined');
      Alert.alert('Erreur', 'Aucune livraison sélectionnée');
      return;
    }
  
    console.log('✅ selectedDelivery.id:', selectedDelivery.id);
    console.log('✅ selectedDelivery.status:', selectedDelivery.status);
    // @ts-expect-error driver_id may not be in type definition
    console.log('✅ selectedDelivery.driver_id:', selectedDelivery.driver_id);
    console.log('✅ selectedDelivery.order:', selectedDelivery.order ? 'EXISTE' : 'NULL');
    
    if (selectedDelivery.order) {
      console.log('   - order.buyer_id:', selectedDelivery.order.buyer_id);
      console.log('   - order.total_price:', selectedDelivery.order.total_price);
    }
  
    // ─────────────────────────────────────────────────────────────────────────
    // ÉTAPE 2: Validation du temps estimé
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n⏱️  ÉTAPE 2: Validation du temps');
    console.log('estimatedTime (brut):', estimatedTime);
    console.log('Type:', typeof estimatedTime);
    
    if (!estimatedTime || estimatedTime.trim() === '') {
      console.error('❌ ERREUR: estimatedTime est vide');
      Alert.alert('Erreur', 'Veuillez entrer un temps estimé.');
      return;
    }
  
    const parsedTime = parseInt(estimatedTime);
    console.log('Temps parsé:', parsedTime);
    console.log('isNaN:', isNaN(parsedTime));
  
    if (isNaN(parsedTime) || parsedTime <= 0) {
      console.error('❌ ERREUR: Temps invalide après parsing');
      Alert.alert('Erreur', 'Veuillez entrer une estimation de temps valide en minutes (nombre positif).');
      return;
    }
  
    console.log('✅ Temps valide:', parsedTime, 'minutes');
  
    // ─────────────────────────────────────────────────────────────────────────
    // ÉTAPE 3: Initialisation Supabase et vérification auth
    // ─────────────────────────────────────────────────────────────────────────
    try {
      console.log('\n🔐 ÉTAPE 3: Initialisation Supabase');
      const supabase = await ensureSupabaseInitialized();
      console.log('✅ Supabase initialisé');
  
      // Vérifier l'authentification
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError) {
        console.error('❌ ERREUR AUTH:', authError);
        throw new Error(`Erreur d'authentification: ${authError.message}`);
      }
  
      if (!user) {
        console.error('❌ ERREUR: Utilisateur non authentifié');
        throw new Error('Utilisateur non authentifié');
      }
  
      console.log('✅ Utilisateur authentifié:', user.id);
  
      // ─────────────────────────────────────────────────────────────────────────
      // ÉTAPE 4: Vérification du driver_id
      // ─────────────────────────────────────────────────────────────────────────
      console.log('\n🚗 ÉTAPE 4: Vérification du profil livreur');
      
      const { data: driverProfile, error: driverError } = await supabase
        .from('delivery_drivers')
        .select('id, user_id, is_online')
        .eq('user_id', user.id)
        .single();
  
      if (driverError) {
        console.error('❌ ERREUR DRIVER PROFILE:', driverError);
        throw new Error(`Impossible de récupérer le profil livreur: ${driverError.message}`);
      }
  
      if (!driverProfile) {
        console.error('❌ ERREUR: Aucun profil livreur trouvé');
        throw new Error('Aucun profil livreur trouvé pour cet utilisateur');
      }
  
      console.log('✅ Driver Profile:', driverProfile);
      console.log('   - ID:', driverProfile.id);
      console.log('   - User ID:', driverProfile.user_id);
      console.log('   - Is Online:', driverProfile.is_online);
  
      // @ts-expect-error driver_id may not be in type definition
      if (selectedDelivery.driver_id) {
        console.log('\n🔍 Vérification driver_id:');
        // @ts-expect-error driver_id may not be in type definition
        console.log('   - Dans selectedDelivery:', selectedDelivery.driver_id);
        console.log('   - Dans delivery_drivers:', driverProfile.id);
        // @ts-expect-error driver_id may not be in type definition
        console.log('   - Correspondent:', selectedDelivery.driver_id === driverProfile.id ? '✅ OUI' : '⚠️ NON');
      }
  
      // ─────────────────────────────────────────────────────────────────────────
      // ÉTAPE 5: Calcul de l'heure d'arrivée
      // ─────────────────────────────────────────────────────────────────────────
      console.log('\n⏰ ÉTAPE 5: Calcul heure d\'arrivée');
      const now = new Date();
      const arrivalTime = new Date(now.getTime() + parsedTime * 60 * 1000);
      
      console.log('   - Heure actuelle:', now.toISOString());
      console.log('   - Délai (minutes):', parsedTime);
      console.log('   - Heure d\'arrivée:', arrivalTime.toISOString());
  
      // ─────────────────────────────────────────────────────────────────────────
      // ÉTAPE 6: Mise à jour de la base de données
      // ─────────────────────────────────────────────────────────────────────────
      console.log('\n💾 ÉTAPE 6: Mise à jour de la livraison');
      console.log('Paramètres UPDATE:');
      console.log('   - Table: deliveries');
      console.log('   - WHERE id =', selectedDelivery.id);
      console.log('   - SET status = in_transit');
      console.log('   - SET estimated_delivery_time =', arrivalTime.toISOString());
  
      // --- CORRECTION : Utilisation d'une Edge Function pour la mise à jour ---
      // Cela centralise la logique et contourne les problèmes de permissions RLS complexes.
      const { data: functionData, error: functionError } = await supabase.functions.invoke('update-delivery-status', {
        body: {
          deliveryId: selectedDelivery.id,
          status: 'in_transit',
          estimatedDeliveryTime: arrivalTime.toISOString(),
        },
      });

      console.log('\n📊 Réponse Supabase UPDATE:');
      console.log('   - Error:', functionError ? '❌ OUI' : '✅ NON');
      console.log('   - Data:', functionData ? '✅ OUI' : '❌ NULL');
  
      if (functionError) {
        console.error('\n❌ ERREUR DE LA EDGE FUNCTION:', JSON.stringify(functionError, null, 2));
        // Tenter d'extraire un message d'erreur plus clair du corps de la réponse
        const errorMessage = functionError.context?.data?.error || functionError.message;
        throw new Error(errorMessage);
      }
  
      if (!functionData) {
        console.error('\n❌ ERREUR: Aucune ligne mise à jour');
        console.error('Cela indique probablement un problème de permissions RLS ou que la fonction a échoué');
        console.error('La politique RLS empêche la mise à jour pour cet utilisateur/cette livraison');
        
        // Test de diagnostic
        console.log('\n🔍 TEST DIAGNOSTIC RLS:');
        const { data: testRead, error: testError } = await supabase
          .from('deliveries')
          .select('id, status, driver_id')
          .eq('id', selectedDelivery.id)
          .single();
        
        console.log('Peut lire la livraison?', testRead ? '✅ OUI' : '❌ NON');
        if (testRead) {
          console.log('Données lues:', testRead);
        }
        if (testError) {
          console.log('Erreur lecture:', testError);
        }
        
        throw new Error('La mise à jour n\'a affecté aucune ligne. Vérifiez les politiques RLS de la table deliveries.');
      }
  
      console.log('\n✅ MISE À JOUR RÉUSSIE!');
      console.log('Données mises à jour:', JSON.stringify(functionData, null, 2));
  
      // ─────────────────────────────────────────────────────────────────────────
      // ÉTAPE 7: Notification client (via trigger DB)
      // ─────────────────────────────────────────────────────────────────────────
      console.log('\n🔔 ÉTAPE 7: Notification');
      console.log(`Le trigger DB va notifier l'acheteur: ${selectedDelivery.order?.buyer_id}`);
  
      // ─────────────────────────────────────────────────────────────────────────
      // ÉTAPE 8: Mise à jour de l'état local
      // ─────────────────────────────────────────────────────────────────────────
      console.log('\n🔄 ÉTAPE 8: Mise à jour état local');
      setCurrentDeliveries(prev => {
        const updated = prev.map(d =>
          d.id === selectedDelivery!.id
            ? { 
                ...d, 
                status: 'in_transit', 
                estimated_delivery_time: arrivalTime.toISOString() 
              }
            : d
        );
        console.log('✅ currentDeliveries mis à jour');
        console.log('   - Nombre total:', updated.length);
        console.log('   - Livraison modifiée:', updated.find(d => d.id === selectedDelivery!.id)?.status);
        return updated;
      });
  
      // ─────────────────────────────────────────────────────────────────────────
      // ÉTAPE 9: Nettoyage et fermeture
      // ─────────────────────────────────────────────────────────────────────────
      console.log('\n🧹 ÉTAPE 9: Nettoyage');
      setSelectedDelivery(null);
      setIsTimeModalVisible(false);
      setEstimatedTime('');
      console.log('✅ Modal fermé, états réinitialisés');
  
      console.log('\n═════════════════════════════════════════════════════════════');
      console.log('🎉 SUCCÈS COMPLET!');
      console.log('═════════════════════════════════════════════════════════════\n\n');
      
      Alert.alert(
        '✅ Livraison commencée', 
        `Le client sera chez lui dans environ ${parsedTime} minutes.`
      );
  
    } catch (error: any) {
      console.error('\n\n');
      console.error('═════════════════════════════════════════════════════════════');
      console.error('💥 ERREUR CAPTURÉE DANS handleStartDelivery');
      console.error('═════════════════════════════════════════════════════════════');
      console.error('Type d\'erreur:', error.constructor.name);
      console.error('Message:', error.message);
      console.error('Code:', error.code);
      console.error('Details:', error.details);
      console.error('Hint:', error.hint);
      console.error('\nStack trace:');
      console.error(error.stack);
      console.error('\nObjet complet:');
      console.error(JSON.stringify(error, null, 2));
      console.error('═════════════════════════════════════════════════════════════\n\n');
      
      // Message d'erreur détaillé pour l'utilisateur
      let userMessage = 'Impossible de démarrer la livraison.';
      
      if (error.message) {
        userMessage += `\n\n${error.message}`;
      }
      
      if (error.hint) {
        userMessage += `\n\nConseil: ${error.hint}`;
      }
  
      if (error.code) {
        userMessage += `\n\nCode d'erreur: ${error.code}`;
      }
      
      Alert.alert('Erreur de livraison', userMessage);
    }
  };
  
  // ============================================================================
  // INSTRUCTIONS DE TEST
  // ============================================================================
  /*
  Après avoir remplacé la fonction:
  
  1. Acceptez une livraison
  2. Cliquez sur "Colis Récupéré" 
  3. Cliquez sur "Commencer la Livraison"
  4. Entrez "30" dans le champ temps
  5. Cliquez sur "Confirmer & Démarrer"
  
  6. OUVREZ LA CONSOLE et cherchez les logs qui commencent par:
     ═════════════════════════════════════════════════════════════
     
  7. Copiez TOUS les logs de "🚀 DÉBUT" jusqu'à soit:
     - "🎉 SUCCÈS COMPLET!" (si ça marche)
     - "💥 ERREUR CAPTURÉE" (si ça échoue)
  
  8. Partagez-moi ces logs complets pour diagnostic précis
  */

  const createPaymentRecord = async (delivery: Delivery) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: driver } = await supabase
        .from('livreur_verifications')
        .select('id')
        .eq('user_id', user.id)
        .eq('verification_status', 'approved')
        .limit(1)
        .maybeSingle();

      if (!driver) return;

      const orderAmount = delivery?.order?.total_price || 0;
      const aviprodCommission = orderAmount * 0.15; // 15%
      const driverEarnings = orderAmount * 0.85; // 85%

      const { error } = await supabase
        .from('driver_payments')
        .insert({
          delivery_id: delivery.id,
          driver_earnings: driverEarnings
        });

      if (error) throw error;

    } catch (error: any) {
      console.error('❌ Error creating payment record:', error);
    }
  };

  const renderStats = () => (
    <View style={styles.statsContainer}>
      <View style={styles.statCard}>
        <Icon name="car" size={24} color={colors.primary} />
        <Text style={styles.statValue}>{driverStats?.total_deliveries || 0}</Text>
        <Text style={styles.statLabel}>Livraisons</Text>
      </View>

      <View style={styles.statCard}>
        <Icon name="star" size={24} color={colors.warning} />
        <Text style={styles.statValue}>{driverStats?.avg_rating?.toFixed(1) || '0.0'}</Text>
        <Text style={styles.statLabel}>Note</Text>
      </View>

      <View style={styles.statCard}>
        <Icon name="cash" size={24} color={colors.success} />
        <Text style={styles.statValue}>{driverStats?.total_earnings?.toLocaleString() || '0'}</Text>
        <Text style={styles.statLabel}>CFA gagnés</Text>
      </View>

      {driverZone && (
        <View style={styles.statCard}>
          <Icon name="location" size={24} color={colors.accent} />
          <Text style={styles.statValue}>{driverZone.name}</Text>
          <Text style={styles.statLabel}>Zone</Text>
        </View>
      )}
    </View>
  );

  const renderCurrentDeliveries = () => {
    if (currentDeliveries.length === 0) return null;

    return (
      <View style={styles.currentDeliveriesContainer}>
        <Text style={styles.sectionTitle}>Livraisons en cours</Text>
        {currentDeliveries.map(delivery => {
          const statusMessages = {
            assigned: 'En route vers le point de retrait',
            accepted: 'En route vers le point de retrait',
            picked_up: 'Colis récupéré, prêt pour livraison',
            in_transit: 'En cours de livraison',
          };

          return (
            <View key={`current-${delivery.id}`} style={styles.currentDeliveryCard}>
              <View style={styles.deliveryHeader}>
                <Icon name="car" size={24} color={colors.primary} />
                <Text style={styles.deliveryTitle}>Livraison #{delivery.id.slice(-8)}</Text>
              </View>

              <Text style={styles.deliveryStatus}>
                {statusMessages[delivery.status as keyof typeof statusMessages] || delivery.status}
              </Text>

              <View style={styles.deliveryInfo}>
                <Text style={styles.deliveryAmount}>
                  {(delivery.order?.total_price || 0).toLocaleString()} CFA
                </Text>
                <Text style={styles.deliveryItems}>
                  {delivery.order?.items?.length || 0} article(s)
                </Text>
              </View>

              <View style={styles.deliveryActions}>
                {delivery.status === 'accepted' && (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.pickupButton]}
                    onPress={() => updateDeliveryStatus(delivery.id, 'picked_up')}
                    disabled={isActionLoading}
                  >
                    <Text style={styles.actionButtonText}>✅ Colis Récupéré</Text>
                  </TouchableOpacity>
                )}

                {delivery.status === 'picked_up' && (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.primaryButton]}
                    onPress={() => {
                      setSelectedDelivery(delivery); // 1. Stocker la livraison sélectionnée
                      setIsTimeModalVisible(true);
                    }}
                    disabled={isActionLoading}
                  >
                    <Text style={styles.actionButtonText}>🚚 Commencer la Livraison</Text>
                  </TouchableOpacity>
                )}

                {delivery.status === 'in_transit' && (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.successButton]}
                    onPress={() => updateDeliveryStatus(delivery.id, 'delivered')}
                    disabled={isActionLoading}
                  >
                    <Text style={styles.actionButtonText}>🏁 Livraison Terminée</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })}
      </View>
    );
  };

  const renderAvailableDeliveries = () => (
    <View style={styles.availableDeliveriesContainer}>
      <Text style={styles.sectionTitle}>
        Livraisons disponibles {driverZone ? `(${driverZone.name})` : ''}
      </Text>

      {availableDeliveries.length === 0 ? (
        <View style={styles.emptyState}>
          <Icon name="car" size={48} color={colors.textSecondary} />
          <Text style={styles.emptyStateText}>
            {driverZone
              ? `Aucune livraison disponible dans votre zone (${driverZone.name})`
              : 'Aucune livraison disponible'
            }
          </Text>
          <Text style={styles.emptyStateSubtext}>
            Les nouvelles livraisons apparaîtront automatiquement
          </Text>
        </View>
      ) : (
        availableDeliveries.map(delivery => {
          const distance = delivery.pickup_location?.coordinates && delivery.delivery_location?.coordinates
            ? getDistanceFromLatLonInKm(delivery.pickup_location.coordinates[1], delivery.pickup_location.coordinates[0], delivery.delivery_location.coordinates[1], delivery.delivery_location.coordinates[0]).toFixed(1)
            : null;
          return (
          <TouchableOpacity key={delivery.id} style={styles.deliveryCard} onPress={() => setSelectedDelivery(delivery)}>
            <View style={styles.deliveryCardHeader}>
              <Text style={styles.deliveryCardTitle}>
                Livraison #{delivery.id.slice(-8)}
              </Text>
              <Text style={styles.deliveryCardAmount}>
                {(delivery.order?.total_price || 0).toLocaleString()} CFA
              </Text>
            </View>

            <View style={styles.deliveryRoute}>
              <View style={styles.routePoint}>
                <Icon name="storefront" size={16} color={colors.primary} />
                <Text style={styles.routeText} numberOfLines={1}>
                  Retrait: {typeof delivery.order?.seller_name === 'object' ? delivery.order.seller_name.full_name : delivery.order?.seller_name || 'Vendeur inconnu'}
                </Text>
              </View>
              <View style={styles.routeArrow}>
                <Text style={{ color: colors.textSecondary, fontSize: 16 }}>→</Text>
              </View>
              <View style={styles.routePoint}>
                <Icon name="person" size={16} color={colors.success} />
                <Text style={styles.routeText} numberOfLines={1}>
                  Client: {typeof delivery.order?.buyer_name === 'object' ? delivery.order.buyer_name.full_name : delivery.order?.buyer_name || 'Client inconnu'}
                </Text>
              </View>
            </View>

            <Text style={styles.deliveryCardItems}>
              {delivery.order?.items?.length || 0} article(s) | {delivery.delivery_location?.city || 'Lieu non spécifié'} {distance && `| ~${distance} km`}
            </Text>

            <TouchableOpacity
              style={styles.acceptButton}
              onPress={() => acceptDelivery(delivery)}
            >
              <Text style={styles.acceptButtonText}>Accepter cette livraison</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        )})
      )}
    </View>
  );

  const renderDeliveryDetailModal = () => {
    if (!selectedDelivery) return null;

    const distance = selectedDelivery.pickup_location?.coordinates && selectedDelivery.delivery_location?.coordinates
      ? getDistanceFromLatLonInKm(selectedDelivery.pickup_location.coordinates[1], selectedDelivery.pickup_location.coordinates[0], selectedDelivery.delivery_location.coordinates[1], selectedDelivery.delivery_location.coordinates[0]).toFixed(1)
      : null;

    return (
      <Modal
        animationType="slide"
        transparent={true}
        visible={!!selectedDelivery}
        onRequestClose={() => setSelectedDelivery(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Détails de la Livraison</Text>
              <TouchableOpacity onPress={() => setSelectedDelivery(null)}>
                <Icon name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView>
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Récapitulatif</Text>
                <View style={styles.modalInfoRow}>
                  <Text style={styles.modalLabel}>Montant de la commande</Text>
                  <Text style={styles.modalValueAmount}>{(selectedDelivery?.order?.total_price || 0).toLocaleString()} CFA</Text>
                </View>
                {distance && (
                  <View style={styles.modalInfoRow}>
                    <Text style={styles.modalLabel}>Distance estimée</Text>
                    <Text style={styles.modalValue}>{distance} km</Text>
                  </View>
                )}
              </View>

              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>📍 Point de Retrait (Vendeur)</Text>
                <View style={styles.modalAddressCard}>
                  <Text style={styles.modalAddressName}>{typeof selectedDelivery?.order?.seller_name === 'object' && selectedDelivery.order.seller_name ? selectedDelivery.order.seller_name.full_name : selectedDelivery?.order?.seller_name || 'Vendeur inconnu'}</Text>
                  <Text style={styles.modalAddressText}>{selectedDelivery?.pickup_location?.address || 'Adresse non spécifiée'}</Text>
                  <Text style={styles.modalAddressText}>{selectedDelivery?.pickup_location?.city}</Text>
                </View>
              </View>

              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>🏁 Point de Livraison (Client)</Text>
                <View style={styles.modalAddressCard}>
                  <Text style={styles.modalAddressName}>{typeof selectedDelivery?.order?.buyer_name === 'object' && selectedDelivery.order.buyer_name ? selectedDelivery.order.buyer_name.full_name : selectedDelivery?.order?.buyer_name || 'Client inconnu'}</Text>
                  <Text style={styles.modalAddressText}>{selectedDelivery?.delivery_location?.address}</Text>
                  <Text style={styles.modalAddressText}>{selectedDelivery?.delivery_location?.city}</Text>
                  <Text style={styles.modalAddressPhone}>📞 {selectedDelivery?.delivery_location?.phone}</Text>
                </View>
              </View>
            </ScrollView>

            <TouchableOpacity
              style={[styles.acceptButton, { marginTop: 20 }]}
              onPress={() => {
                if (selectedDelivery) {
                  acceptDelivery(selectedDelivery);
                  setSelectedDelivery(null);
                }
              }}
            >
              <Text style={styles.acceptButtonText}>Accepter cette livraison</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  const renderTimeInputModal = () => (
    <Modal
      animationType="fade"
      transparent={true}
      visible={isTimeModalVisible}
      onRequestClose={() => setIsTimeModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>Temps de Livraison</Text>
          <Text style={styles.modalSubtitle}>
            Estimez le temps de trajet jusqu\'au client en minutes.
          </Text>
          <TextInput
            style={styles.timeInput}
            placeholder="Ex: 30"
            keyboardType="number-pad"
            value={estimatedTime}
            onChangeText={setEstimatedTime}
          />
          <View style={styles.modalActions}>
            <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={() => setIsTimeModalVisible(false)}>
              <Text style={styles.cancelButtonText}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.confirmButton]}
              onPress={handleStartDelivery}
            >
              <Text style={styles.confirmButtonText}>Confirmer & Démarrer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={commonStyles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Chargement...</Text>
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
        <Text style={styles.headerTitle}>Espace Livreur</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.onlineButton, isOnline && styles.onlineButtonActive]}
            onPress={toggleOnlineStatus}
          >
            <View style={[styles.onlineIndicator, isOnline && styles.onlineIndicatorActive]} />
            <Text style={[styles.onlineButtonText, isOnline && styles.onlineButtonTextActive]}>
              {isOnline ? 'En ligne' : 'Hors ligne'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.historyButton} onPress={() => router.push({ pathname: '/order-tracking', params: { mode: 'driver' } })}>
            <Icon name="time" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {renderStats()}
        {renderCurrentDeliveries()}
        {renderAvailableDeliveries()}
      </ScrollView>

      {renderDeliveryDetailModal()}
      {renderTimeInputModal()}

      {/* Map View - placeholder for now */}
      <View style={styles.mapContainer}>
        <View style={styles.webMapPlaceholder}>
          <Icon name="map" size={48} color={colors.textSecondary} />
          <Text style={styles.webMapText}>Carte interactive</Text>
          <Text style={styles.webMapSubtext}>Disponible dans l\'app mobile</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
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
  onlineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.error,
  },
  onlineButtonActive: {
    borderColor: colors.success,
    backgroundColor: colors.success + '20',
  },
  onlineIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.error,
    marginRight: 6,
  },
  onlineIndicatorActive: {
    backgroundColor: colors.success,
  },
  onlineButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.error,
  },
  onlineButtonTextActive: {
    color: colors.success,
  },
  scrollView: {
    flex: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 20,
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: width * 0.4, // Minimum width for better responsiveness
    backgroundColor: colors.backgroundAlt,
    borderRadius: 12,
    padding: 12, // Reduced padding for better fit
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  statValue: {
    fontSize: 20, // Reduced from 24
    fontWeight: '700',
    color: colors.text,
    marginTop: 6, // Reduced from 8
  },
  statLabel: {
    fontSize: 11, // Reduced from 12
    color: colors.textSecondary,
    marginTop: 2, // Reduced from 4
  },
  currentDeliveryCard: {
    marginBottom: 16,
    backgroundColor: colors.backgroundAlt,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  deliveryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  deliveryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginLeft: 8,
  },
  deliveryStatus: {
    fontSize: 14,
    color: colors.primary,
    marginBottom: 12,
  },
  deliveryInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  deliveryAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.success,
  },
  deliveryItems: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  deliveryActions: {
    gap: 8,
  },
  actionButton: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: colors.primary,
  },
  pickupButton: {
    backgroundColor: colors.accent,
  },
  successButton: {
    backgroundColor: colors.success,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
  currentDeliveriesContainer: {
    margin: 20,
  },
  availableDeliveriesContainer: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  deliveryCard: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  deliveryCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  deliveryCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  deliveryCardAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.success,
  },
  deliveryCardItems: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  deliveryRoute: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
    paddingVertical: 8,
    backgroundColor: colors.background,
    borderRadius: 8,
  },
  routePoint: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
  },
  routeText: { fontSize: 12, color: colors.text, fontWeight: '500' },
  routeArrow: { marginHorizontal: 4 },
  acceptButton: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  acceptButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
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
  emptyStateSubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  deliveryZone: {
    fontSize: 12,
    color: colors.success,
    fontWeight: '600',
    marginTop: 4,
  },
  mapContainer: {
    height: height * 0.3,
    backgroundColor: colors.border,
  },
  map: {
    flex: 1,
  },
  webMapPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.backgroundAlt,
  },
  webMapText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginTop: 12,
  },
  webMapSubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: height * 0.8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
  },
  modalSection: {
    marginBottom: 24,
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 12,
  },
  modalInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  modalLabel: {
    fontSize: 16,
    color: colors.text,
  },
  modalValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  modalValueAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.success,
  },
  modalAddressCard: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalAddressName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  modalAddressText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  modalAddressPhone: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
    marginTop: 8,
  },
  modalSubtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  timeInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: colors.border,
  },
  confirmButton: {
    backgroundColor: colors.primary,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
});
