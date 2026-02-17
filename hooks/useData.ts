import { useState, useEffect, useCallback, useMemo } from 'react';
import { Lot, Task, StockItem, Notification } from '../types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ensureSupabaseInitialized, supabase } from '../config'; // Corrigé: importer supabase de config
import { useAuth } from './useAuth';

export const useData = () => {
  const { user } = useAuth();
  const userId = user?.id;
  const [lots, setLots] = useState<Lot[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [stock, setStock] = useState<StockItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadLots = useCallback(async () => {
    if (!userId) {
      setLots([]);
      return;
    }
    try {
      console.log('📊 Loading lots for user:', userId);
      const supabase = await ensureSupabaseInitialized();
      const { data, error } = await supabase
        .from('lots')
        .select('*, taux_mortalite')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error loading lots:', error.message);
        setLots([]);
        return;
      }

      const mappedLots: Lot[] = (data || []).map(lot => ({
        id: lot.id,
        name: lot.name || '',
        birdType: (lot.bird_type || 'broilers') as 'broilers' | 'layers',
        breed: lot.breed || '',
        quantity: lot.quantity || 0,
        age: lot.age || 0,
        entryDate: lot.entry_date || lot.created_at || new Date().toISOString(),
        dateCreated: lot.created_at || new Date().toISOString(),
        status: (lot.status || 'active') as 'active' | 'completed' | 'sold',
        healthStatus: (lot.health_status || 'good') as 'excellent' | 'good' | 'fair' | 'poor',
        initial_quantity: lot.initial_quantity || 0,
        feedConsumption: 0,
        mortality: lot.mortality || 0,
        averageWeight: 0,
        sellingPrice: 0,
        stage: 'grower' as const,
        taux_mortalite: lot.taux_mortalite || 0,
        treatmentsDone: [],
        symptoms: [],
        treatmentsPending: [],
      }));

      setLots(mappedLots);
    } catch (error) {
      console.error('❌ Error in loadLots:', error);
      setLots([]);
    }
  }, [userId]);

  const loadTasks = useCallback(async () => {
    try {
      console.log('📊 Loading tasks...');
      setTasks([]);
    } catch (error) {
      console.error('❌ Error loading tasks:', error);
      setTasks([]);
    }
  }, []);

  const loadStock = useCallback(async () => {
    if (!userId) {
      setStock([]);
      return;
    }
    try {
      console.log('📊 Loading stock...');
      const supabase = await ensureSupabaseInitialized();
      const { data, error } = await supabase
        .from('stock')
        .select('id, name, category, quantity, unit, min_threshold, cost, supplier, expiry_date')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error loading stock:', error.message);
        setStock([]);
        return;
      }

      const mappedStock: StockItem[] = (data || []).map(item => ({
        id: item.id,
        name: item.name || '',
        category: (item.category || 'other') as 'feed' | 'medicine' | 'equipment' | 'other',
        quantity: parseFloat(item.quantity || '0'),
        unit: item.unit || 'kg',
        minThreshold: parseFloat(item.min_threshold || '0'),
        min_threshold: parseFloat(item.min_threshold || '0'),
        cost: parseFloat(item.cost || '0'),
        supplier: item.supplier || '',
        expiryDate: item.expiry_date || undefined,
      }));

      setStock(mappedStock);
    } catch (error) {
      console.error('❌ Error loading stock:', error);
      setStock([]);
    }
  }, [userId]);

  const runDailyStockConsumption = useCallback(async () => {
    try {
      const lastRunDate = await AsyncStorage.getItem('@lastStockConsumptionDate');
      const today = new Date().toISOString().split('T')[0];

      if (lastRunDate === today) {
        return;
      }

      const supabase = await ensureSupabaseInitialized();
      if (!userId) return;

      const { data: assignments, error: assignmentError } = await supabase
        .from('lot_stock_assignments')
        .select('lot_id, stock_item_id, daily_quantity_per_bird')
        .eq('user_id', userId)
        .eq('is_active', true);

      if (assignmentError) throw assignmentError;
      if (!assignments || assignments.length === 0) {
        return;
      }

      const FEED_CONSUMPTION_STANDARDS: Record<string, (age: number) => number> = {
        'broilers': (age: number) => {
          if (age < 7) return 0.025; if (age < 14) return 0.045; if (age < 21) return 0.065;
          if (age < 28) return 0.090; if (age < 35) return 0.120; return 0.145;
        },
        'layers': (age: number) => {
          if (age < 60) return 0.045; if (age < 120) return 0.095; return 0.115;
        },
        'default': (age: number) => { if (age < 21) return 0.050; return 0.120; },
      };

      const consumptionMap = new Map();
      const logEntries = [];

      const { data: currentLots, error: lotsError } = await supabase
        .from('lots')
        .select('id, name, quantity, status, age, entry_date, bird_type')
        .eq('user_id', userId)
        .eq('status', 'active');

      if (lotsError) throw lotsError;

      for (const lot of currentLots) {
        const assignment = assignments.find(a => a.lot_id === lot.id);
        if (!assignment || !assignment.stock_item_id) continue;

        const entryDate = new Date(lot.entry_date);
        const todayDate = new Date();
        entryDate.setHours(0, 0, 0, 0);
        todayDate.setHours(0, 0, 0, 0);
        const daysOnFarm = Math.floor((todayDate.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24));
        const currentAge = (lot.age || 0) + daysOnFarm;

        const birdType = lot.bird_type || 'default';
        const feedFunction = FEED_CONSUMPTION_STANDARDS[birdType] || FEED_CONSUMPTION_STANDARDS['default'];
        const consumptionPerBird = feedFunction(currentAge);
        const dailyConsumptionForLot = (consumptionPerBird * lot.quantity);

        const currentConsumption = consumptionMap.get(assignment.stock_item_id) || 0;
        consumptionMap.set(assignment.stock_item_id, currentConsumption + dailyConsumptionForLot);

        logEntries.push({
          user_id: userId,
          stock_item_id: assignment.stock_item_id,
          lot_id: lot.id,
          quantity_consumed: dailyConsumptionForLot,
          quantity_planned: dailyConsumptionForLot,
          entry_type: 'automatic',
          date: new Date().toISOString(),
        });
      }

      if (consumptionMap.size === 0) {
        await AsyncStorage.setItem('@lastStockConsumptionDate', today);
        return;
      }

      const decrementPromises = [];
      for (const [stockId, quantityToDecrement] of consumptionMap.entries()) {
        decrementPromises.push(
          supabase.rpc('decrement_stock_quantity', {
            item_id: stockId,
            amount_to_decrement: quantityToDecrement,
          })
        );
      }

      await Promise.all(decrementPromises);

      if (logEntries.length > 0) {
        await supabase.from('stock_consumption_tracking').insert(logEntries);
      }

      await AsyncStorage.setItem('@lastStockConsumptionDate', today);
      await loadStock();

    } catch (error) {
      console.error('❌ Error during daily stock consumption:', error);
    }
  }, [userId, loadStock]);

  const refreshUnreadMessages = useCallback(async () => {
    // Obsolete, géré par NotificationContext
  }, []);

  const markMessagesAsRead = useCallback(async () => {
    if (!userId) return;
    try {
      const supabase = await ensureSupabaseInitialized();
      await supabase
        .from('marketplace_messages')
        .update({ read_at: new Date().toISOString() })
        .eq('receiver_id', userId)
        .is('read_at', null);
    } catch (error) {
      console.error('Error in markMessagesAsRead:', error);
    }
  }, [userId]);

  useEffect(() => {
    const loadAllData = async () => {
      if (!userId) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        await Promise.all([
          loadLots(),
          loadStock(),
          loadTasks(),
        ]);
      } catch (error) {
        console.error('❌ Error during initial data load:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadAllData();
  }, [userId, loadLots, loadStock, loadTasks]);

  useEffect(() => {
    if (!userId) return;

    const setupRealtimeSubscriptions = async () => {
      try {
        const supabase = await ensureSupabaseInitialized();

        const stockChannel = supabase.channel('data-stock').on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'stock', filter: `user_id=eq.${userId}` },
          () => loadStock()
        )
          .subscribe();

        return () => {
          console.log('🔌 Unsubscribing from all data channels.');
          supabase.removeChannel(stockChannel);
        };
      } catch (error) {
        console.error('❌ Error setting up realtime subscriptions in useData:', error);
      }
    };

    const cleanupPromise = setupRealtimeSubscriptions();

    return () => {
      cleanupPromise?.then(cleanupFn => cleanupFn?.());
    };
  }, [userId, loadStock]);

  return useMemo(() => ({
    lots,
    tasks,
    stock,
    unreadMessages: 0,
    isLoading,
    loadLots,
    loadTasks,
    loadStock,
    refreshUnreadMessages,
    markMessagesAsRead,
    runDailyStockConsumption,
  }), [
    lots,
    tasks,
    stock,
    isLoading,
    loadLots,
    loadTasks,
    loadStock,
    refreshUnreadMessages,
    markMessagesAsRead,
    runDailyStockConsumption,
  ]);
};
