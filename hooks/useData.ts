

import { useState, useEffect, useCallback } from 'react';
import { Lot, Task, StockItem, Notification } from '../types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ensureSupabaseInitialized } from '../app/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useDataCollector } from '../src/hooks/useDataCollector';

export const useData = () => {
  const { user } = useAuth();
  const { trackDataLoading } = useDataCollector();
  const [lots, setLots] = useState<Lot[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [stock, setStock] = useState<StockItem[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const loadLots = useCallback(async () => {
    return trackDataLoading('loadLots', async () => {if (!user) {
      setLots([]);
      return;
    }
    try {
      console.log('📊 Loading lots...');
      const supabase = await ensureSupabaseInitialized();
      const { data, error } = await supabase
        .from('lots')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.log('⚠️ Error loading lots:', error);
        setLots([]);
        return;
      }

      console.log('✅ Loaded lots:', data?.length || 0);
      
      const mappedLots: Lot[] = (data || []).map(lot => ({
        id: lot.id,
        name: lot.name || '',
        birdType: 'broilers' as const,
        breed: lot.breed || '',
        quantity: lot.quantity || 0,
        age: lot.age || 0,
        entryDate: lot.created_at || new Date().toISOString(),
        dateCreated: lot.created_at || new Date().toISOString(),
        status: (lot.status || 'active') as 'active' | 'completed' | 'sold',
        healthStatus: 'good' as const,
        initial_quantity: lot.initial_quantity || 0, // --- CORRECTION : Conserver la quantité initiale
        feedConsumption: 0,
        mortality: lot.mortality || 0, // --- CORRECTION : Conserver la mortalité réelle
        averageWeight: parseFloat(lot.poids_moyen || '0'),
        sellingPrice: 0,
        stage: 'grower' as const,
        taux_mortalite: lot.taux_mortalite || 0, // --- CORRECTION : Conserver le taux de mortalité
        treatmentsDone: [],
        treatmentsPending: [],
      }));

      // --- CORRECTION : Mettre à jour l'état des lots ---
      // Cette ligne est essentielle pour que les rafraîchissements fonctionnent.
      setLots(mappedLots);
    } catch (error) {
      console.error('❌ Error loading lots:', error);
      setLots([]);
    }});
  }, [user, trackDataLoading]);

  const loadTasks = useCallback(async () => {
    return trackDataLoading('loadTasks', async () => {try {
      console.log('📊 Loading tasks...');
      setTasks([]);
    } catch (error) {
      console.error('❌ Error loading tasks:', error);
      setTasks([]);
    }
  });}, [trackDataLoading]);

  const loadStock = useCallback(async () => {
    return trackDataLoading('loadStock', async () => {if (!user) {
      setStock([]);
      return;
    }
    try {
      console.log('📊 Loading stock...');
      const supabase = await ensureSupabaseInitialized();
      const { data, error } = await supabase
        .from('stock') // CORRECTION : Sélectionner explicitement les colonnes
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });


      if (error) {
        console.log('⚠️ Error loading stock:', error);
        setStock([]);
        return;
      }

      console.log('✅ Loaded stock items:', data?.length || 0);
      
      const mappedStock: StockItem[] = (data || []).map(item => ({
        id: item.id,
        name: item.name || '',
        category: (item.category || 'other') as 'feed' | 'medicine' | 'equipment' | 'other',
        quantity: parseFloat(item.quantity || '0'),
        unit: item.unit || 'kg',
        minThreshold: parseFloat(item.min_threshold || '0'),
        min_threshold: parseFloat(item.min_threshold || '0'), // Assurez-vous que ce champ est bien récupéré
        cost: parseFloat(item.cost || '0'),
        supplier: item.supplier || '',
        expiryDate: item.expiry_date || undefined,
      }));

      setStock(mappedStock);
    } catch (error) {
      console.error('❌ Error loading stock:', error);
      setStock([]);
    }});
  }, [user, trackDataLoading]);

  const loadNotifications = useCallback(async () => {
    return trackDataLoading('loadNotifications', async () => {if (!user) {
      setNotifications([]);
      return;
    }
    try {
      console.log('📊 Loading notifications...');
      const supabase = await ensureSupabaseInitialized();
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .eq('read', false)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) {
        console.log('⚠️ Error loading notifications:', error);
        setNotifications([]);
        return;
      }

      console.log('✅ Loaded notifications:', data?.length || 0);
      
      const mappedNotifications: Notification[] = (data || []).map(notif => ({
        id: notif.id,
        title: notif.type || 'Notification',
        message: notif.message || '',
        type: (notif.type || 'info') as 'info' | 'warning' | 'error' | 'success',
        date: notif.created_at || new Date().toISOString(),
        read: notif.read || false,
      }));

      setNotifications(mappedNotifications);
    } catch (error) {
      console.error('❌ Error loading notifications:', error);
      setNotifications([]);
    }});
  }, [user, trackDataLoading]);

  const loadUnreadMessages = useCallback(async () => {
    return trackDataLoading('loadUnreadMessages', async () => {if (!user) {
      setUnreadMessages(0);
      return;
    }
    try {
      console.log('📊 Loading unread messages...');
      const supabase = await ensureSupabaseInitialized();
      const { count, error } = await supabase
        .from('marketplace_messages')
        .select('', { count: 'exact', head: true })
        .eq('receiver_id', user.id)
        .is('read_at', null);

      if (error) {
        console.log('⚠️ Error loading unread messages:', error);
        setUnreadMessages(0);
        return;
      }

      console.log('✅ Loaded unread messages count:', count || 0);
      setUnreadMessages(count || 0);
    } catch (error) {
      console.error('❌ Error loading unread messages:', error);
      setUnreadMessages(0);
    }});
  }, [user, trackDataLoading]);

  // --- NOUVEAU : Fonction de consommation quotidienne autonome du stock ---
  const runDailyStockConsumption = useCallback(async () => {
    try {
      // Vérifier si la consommation a déjà été calculée aujourd'hui
      const lastRunDate = await AsyncStorage.getItem('@lastStockConsumptionDate');
      const today = new Date().toISOString().split('T')[0];

      if (lastRunDate === today) {
        console.log('✅ La consommation de stock a déjà été calculée aujourd\'hui.');
        return;
      }

      console.log('🔄 Calcul de la consommation quotidienne du stock...');

      const supabase = await ensureSupabaseInitialized();
      if (!user) return;

      // 1. Récupérer les assignations ET les rations pour avoir une solution de repli
      const { data: assignments, error: assignmentError } = await supabase
        .from('lot_stock_assignments')
        .select('lot_id, stock_item_id, daily_quantity_per_bird')
        .eq('user_id', user.id)
        .eq('is_active', true);

      const { data: rations, error: rationsError } = await supabase
        .from('custom_feed_rations')
        .select('lot_id, daily_consumption_per_bird_grams')
        .eq('user_id', user.id);

      if (assignmentError) throw assignmentError;
      if (rationsError) console.warn("Could not load custom rations for fallback", rationsError);

      if (!assignments || assignments.length === 0) {
        console.log('ℹ️ Aucune assignation de stock active trouvée.');
        return;
      }

      // 2. Calculer la consommation totale par article de stock
      const consumptionMap = new Map();
      const logEntries = [];

      // --- CORRECTION : Utiliser les données les plus fraîches au lieu de l'état potentiellement obsolète ---
      const { data: currentLots, error: lotsError } = await supabase
        .from('lots')
        .select('id, name, quantity, status')
        .eq('user_id', user.id)
        .eq('status', 'active');

      if (lotsError) throw lotsError;

      for (const lot of currentLots) {
        const assignment = assignments.find(a => a.lot_id === lot.id);
        if (!assignment || !assignment.stock_item_id) continue;

        // --- LOGIQUE AMÉLIORÉE ---
        // Priorité à la valeur dans l'assignation. Sinon, fallback sur la ration (convertie en kg).
        let consumptionPerBird = assignment.daily_quantity_per_bird;
        if (!consumptionPerBird || consumptionPerBird === 0) {
          const fallbackRation = rations?.find(r => r.lot_id === lot.id);
          if (fallbackRation && fallbackRation.daily_consumption_per_bird_grams > 0) {
            consumptionPerBird = fallbackRation.daily_consumption_per_bird_grams / 1000; // Convertir g en kg
          }
        }

        if (!consumptionPerBird || consumptionPerBird === 0) continue; // Si toujours pas de valeur, on passe au lot suivant

        // Calculer la consommation quotidienne pour ce lot (en kg)
        const dailyConsumptionForLot = (consumptionPerBird * lot.quantity);

        // Ajouter à la consommation totale pour cet article
        const currentConsumption = consumptionMap.get(assignment.stock_item_id) || 0;
        consumptionMap.set(assignment.stock_item_id, currentConsumption + dailyConsumptionForLot);

        // Préparer l'entrée de log pour l'historique
        logEntries.push({
          user_id: user.id, // Assurez-vous que user.id est bien défini
          stock_item_id: assignment.stock_item_id,
          lot_id: lot.id,
          quantity_consumed: dailyConsumptionForLot,
          entry_type: 'automatic'
        });
      }

      if (consumptionMap.size === 0) {
        console.log('ℹ️ Aucune consommation à déduire aujourd\'hui.');
        await AsyncStorage.setItem('@lastStockConsumptionDate', today);
        return;
      }

      // 3. Appeler la fonction RPC pour décrémenter le stock
      const decrementPromises = [];
      for (const [stockId, quantityToDecrement] of consumptionMap.entries()) {
        console.log(`📉 Déduction de ${quantityToDecrement.toFixed(2)} kg pour l'article ${stockId}`);
        decrementPromises.push(
          supabase.rpc('decrement_stock_quantity', {
            item_id: stockId,
            amount_to_decrement: quantityToDecrement,
          })
        );
      }

      await Promise.all(decrementPromises);

      // 4. Enregistrer l'historique de consommation
      if (logEntries.length > 0) {
        const { error: logError } = await supabase.from('stock_consumption_tracking').insert(logEntries);
        if (logError) {
          console.error('❌ Erreur lors de l\'enregistrement de l\'historique de consommation:', logError);
        } else {
          console.log('📝 Historique de consommation enregistré avec succès.');
        }
      }

      // 5. Marquer la journée comme traitée
      await AsyncStorage.setItem('@lastStockConsumptionDate', today);
      console.log('✅ Consommation de stock quotidienne terminée avec succès.');

      // 6. Recharger les données pour refléter les changements
      await loadStock();

    } catch (error) {
      console.error('❌ Erreur lors de l\'exécution de la consommation de stock quotidienne:', error);
    }
  }, [user, loadStock]); // Retrait de 'lots' et 'stock' des dépendances pour éviter les exécutions multiples

  // Function to refresh unread messages count
  const refreshUnreadMessages = useCallback(async () => {
    await loadUnreadMessages();
  }, [loadUnreadMessages]);

  // Function to mark messages as read
  const markMessagesAsRead = useCallback(async () => {
    if (!user) return;
    try {
      const supabase = await ensureSupabaseInitialized();
      // Update all unread messages for this user
      const { error } = await supabase
        .from('marketplace_messages')
        .update({ read_at: new Date().toISOString() })
        .eq('receiver_id', user.id)
        .is('read_at', null);

      if (error) {
        console.error('Error marking messages as read:', error);
      } else {
        console.log('✅ All messages marked as read');
        // Immediately update the count
        setUnreadMessages(0);
      }
    } catch (error) {
      console.error('Error in markMessagesAsRead:', error);
    }
  }, [user]);

  useEffect(() => {
    const loadAllData = async () => {
      try {
        setIsLoading(true);
        await Promise.all([
          loadLots().catch(err => console.log('⚠️ Failed to load lots:', err)),
          loadStock().catch(err => console.log('⚠️ Failed to load stock:', err)), // Assurer le chargement du stock
          loadTasks().catch(err => console.log('⚠️ Failed to load tasks:', err)),
          loadNotifications().catch(err => console.log('⚠️ Failed to load notifications:', err)),
          loadUnreadMessages().catch(err => console.log('⚠️ Failed to load unread messages:', err)),
        ]);
      } catch (error) {
        console.error('❌ Error loading data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadAllData();

    // Set up real-time subscription for unread messages
    const setupRealtimeSubscription = async () => {
      if (!user) return;
      try {
        const supabase = await ensureSupabaseInitialized();
        const channel = supabase
          .channel('unread-messages')
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'marketplace_messages',
              filter: `receiver_id=eq.${user.id}`,
            },
            (payload) => {
              console.log('💬 New message received:', payload);
              loadUnreadMessages();
            }
          )
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'marketplace_messages',
              filter: `receiver_id=eq.${user.id}`,
            },
            (payload) => {
              console.log('📝 Message updated:', payload);
              loadUnreadMessages();
            }
          )
          .subscribe();

        return () => {
          supabase.removeChannel(channel);
        };
      } catch (error) {
        console.error('Error setting up realtime subscription for messages:', error);
      }
    };

    const cleanup = setupRealtimeSubscription();

    return () => {
      cleanup?.then(cleanupFn => cleanupFn?.());
    };
  }, [user, loadLots, loadTasks, loadStock, loadNotifications, loadUnreadMessages]);

  return {
    lots,
    tasks,
    stock,
    notifications,
    unreadMessages,
    isLoading,
    loadLots,
    loadTasks,
    loadStock,
    loadNotifications,
    loadUnreadMessages,
    refreshUnreadMessages,
    markMessagesAsRead,
    runDailyStockConsumption,
  };
};
