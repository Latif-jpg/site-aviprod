import { useState, useEffect, useCallback } from 'react';
import { ensureSupabaseInitialized } from '../app/integrations/supabase/client';

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
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setFinancialRecords([]);
        setFinancialSummary(null);
        return;
      }

      // Définir les dates pour la période actuelle et la période précédente
      const now = new Date();
      let daysToSubtract = 7;
      if (period === 'week') {
        daysToSubtract = 7;
      } else if (period === 'month') {
        daysToSubtract = 30;
      } else if (period === 'quarter') {
        daysToSubtract = 90;
      }

      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - daysToSubtract);

      const { data: currentDataRes, error } = await supabase
        .from('financial_records')
        .select('*')
        .eq('user_id', user.id)
        .gte('record_date', fromDate.toISOString());

      if (error) throw error;

      const allCurrentRecords = currentDataRes || [];

      // Trier les enregistrements actuels par date pour l'affichage.
      const sortedCurrentRecords = allCurrentRecords.sort((a, b) => new Date(b.record_date).getTime() - new Date(a.record_date).getTime());

      // Mettre à jour l'état pour l'affichage de la liste (uniquement les 5 plus récents).
      setFinancialRecords(sortedCurrentRecords.slice(0, 5));

      // Mettre à jour le résumé financier en utilisant TOUTES les données de la période actuelle.
      setFinancialSummary(calculateSummary(allCurrentRecords));

    } catch (error: any) {
      console.error('❌ Error loading financial records:', error);
      // Ne pas mettre d'alerte ici pour ne pas déranger l'utilisateur à chaque rechargement
    } finally {
      setLoading(false);
    }
  }, [period]); // Correction: La fonction dépend maintenant de 'period'.

  useEffect(() => {
    console.log(`🔄 Period changed to: ${period}. Reloading financial data...`);
    loadFinancialRecords();
  }, [period, loadFinancialRecords]); // `loadFinancialRecords` est maintenant une dépendance stable.

  return {
    financialRecords,
    financialSummary,
    loading,
    loadFinancialRecords, // Exposer la fonction pour le rechargement manuel
  };
};