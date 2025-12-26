import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './useAuth';
import { ensureSupabaseInitialized } from '../config';

export interface FinancialRecord {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  description: string;
  record_date: string;
}

export interface FinancialSummary {
  totalIncome: number;
  totalExpenses: number;
  profit: number;
  profitMargin: number;
  isRentable: boolean;
}

export const useFinance = (period: 'week' | 'month' | 'quarter') => {
  const [financialRecords, setFinancialRecords] = useState<FinancialRecord[]>([]);
  const [financialSummary, setFinancialSummary] = useState<FinancialSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const { user: authUser } = useAuth();

  const calculateSummary = (currentRecords: FinancialRecord[]): FinancialSummary => {
    // Calculs pour la période actuelle
    const totalIncome = currentRecords
      .filter(r => r.type === 'income')
      .reduce((sum, r) => sum + r.amount, 0);

    const totalExpenses = currentRecords
      .filter(r => r.type === 'expense')
      .reduce((sum, r) => sum + r.amount, 0);

    const profit = totalIncome - totalExpenses;
    const profitMargin = totalIncome > 0 ? (profit / totalIncome) * 100 : 0;

    return {
      totalIncome,
      totalExpenses,
      profit,
      profitMargin,
      isRentable: profit > 0,
    };
  };

  const loadFinancialRecords = useCallback(async (currentPeriod: 'week' | 'month' | 'quarter') => {

    try {
      setLoading(true);
      const supabase = await ensureSupabaseInitialized();
      let user = authUser;
      if (!user) {
        const authRes = await supabase.auth.getUser();
        user = authRes?.data?.user ?? null;
      }

      if (!user) {
        console.warn('useFinance: no authenticated user available, aborting loadFinancialRecords');
        setFinancialRecords([]);
        setFinancialSummary(null);
        setLoading(false);
        return;
      }

      // Define dates based on the currentPeriod argument
      const now = new Date();
      const endDate = now.toISOString().split('T')[0];
      let daysToSubtract = 7;
      if (currentPeriod === 'week') {
        daysToSubtract = 7;
      } else if (currentPeriod === 'month') {
        daysToSubtract = 30;
      } else if (currentPeriod === 'quarter') {
        daysToSubtract = 90;
      }

      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - daysToSubtract);
      const startDate = fromDate.toISOString().split('T')[0];

      // --- NOUVELLE LOGIQUE : Appel unique à la RPC complète ---
      console.log(`useFinance: Calling RPC get_comprehensive_financial_analysis for period ${currentPeriod}`);
      const { data, error } = await supabase.rpc('get_comprehensive_financial_analysis', {
        p_user_id: user.id,
        p_start_date: startDate,
        p_end_date: endDate,
      });

      if (error) throw error;

      // Extraire les données de la réponse de la RPC
      const allCurrentRecords = (data.transactions || []) as FinancialRecord[];
      const summaryData = data.current_period;

      const summary: FinancialSummary = {
        totalIncome: summaryData.revenue || 0,
        totalExpenses: summaryData.expenses || 0,
        profit: summaryData.profit || 0,
        profitMargin: summaryData.profit_margin || 0,
        isRentable: (summaryData.profit || 0) > 0,
      };

      // Sort records for display
      const sortedCurrentRecords = allCurrentRecords.sort((a, b) => new Date(b.record_date).getTime() - new Date(a.record_date).getTime());

      // Mettre à jour les deux états avec les données de la RPC
      setFinancialRecords(sortedCurrentRecords);
      setFinancialSummary(summary);

    } catch (error: any) {
      console.error('❌ Error loading financial records:', error);
    } finally {
      setLoading(false);
    }
  }, [authUser]); // Recompute when authUser changes so we retry after login

  useEffect(() => {
    console.log(`🔄 Period changed to: ${period}. Reloading financial data...`);
    // Update the ref that holds the latest requested period so realtime
    // handlers can use the most recent value without forcing a resubscribe.
    lastPeriodRef.current = period;
    loadFinancialRecords(period);
  }, [period, loadFinancialRecords]);

  // --- NEW: Real-time subscription for financial records ---
  // Keep a ref of the last requested period so the realtime handler can
  // always reload the latest period without re-creating the subscription.
  const lastPeriodRef = useRef<'week' | 'month' | 'quarter'>(period);

  useEffect(() => {
    const setupFinanceSubscription = async () => {
      try {
        const supabase = await ensureSupabaseInitialized();
        // Prefer auth context user to avoid AuthSessionMissingError
        let subUser = authUser;
        if (!subUser) {
          const authRes = await supabase.auth.getUser();
          console.log('useFinance: setupFinanceSubscription auth.getUser response:', authRes);
          subUser = authRes?.data?.user ?? null;
        } else {
          console.log('useFinance: setupFinanceSubscription using auth context user:', authUser?.id);
        }
        if (!subUser) return;

        const financeChannel = supabase
          .channel('finance-changes')
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'financial_records',
              filter: `user_id=eq.${subUser.id}`,
            },
            () => {
              // Use the ref to get the latest period without re-subscribing.
              const rp = lastPeriodRef.current;
              console.log('💰 Financial data changed, reloading for period (from ref):', rp);
              loadFinancialRecords(rp);
            }
          )
          .subscribe();

        return () => {
          console.log('🔌 Unsubscribing from finance real-time changes.');
          supabase.removeChannel(financeChannel);
        };
      } catch (error) {
        console.error('❌ Error setting up realtime subscription for finance:', error);
      }
    };

    const cleanupPromise = setupFinanceSubscription();

    return () => {
      cleanupPromise?.then(cleanupFn => cleanupFn?.());
    };
    // NOTE: do not include `period` here to avoid resubscribing on every
    // period change; the ref provides the latest value to the handler.
  }, [loadFinancialRecords, authUser]);

  return {
    financialRecords,
    financialSummary,
    loading,
    loadFinancialRecords, // Exposer la fonction pour le rechargement manuel
  };
};