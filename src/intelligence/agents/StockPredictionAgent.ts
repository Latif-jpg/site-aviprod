import { useMemo } from 'react';
import { StockItem } from '../../../types';

interface PredictionInput {
  item: StockItem;
  dailyConsumption: number;
}

interface PredictionResult {
  daysRemaining: number;
  runOutDate: Date | null;
  reorderDate: Date | null;
  reorderQuantity: number | null;
}

export const useStockPrediction = () => {

  const predictStockLevels = useMemo(() => {
    return ({ item, dailyConsumption }: PredictionInput): PredictionResult | null => {
      if (!item || dailyConsumption <= 0) {
        return null;
      }

      const quantity = item.quantity || 0;
      const daysRemaining = Math.floor(quantity / dailyConsumption);

      const today = new Date();
      const runOutDate = new Date(today);
      runOutDate.setDate(today.getDate() + daysRemaining);

      // Suggérer de commander 7 jours avant la rupture (délai de livraison)
      const reorderDate = new Date(runOutDate);
      reorderDate.setDate(runOutDate.getDate() - 7);

      // Suggérer de commander assez pour 30 jours de consommation
      const reorderQuantity = dailyConsumption * 30;

      return {
        daysRemaining,
        runOutDate,
        reorderDate: daysRemaining > 7 ? reorderDate : today, // Si moins de 7 jours, commander maintenant
        reorderQuantity,
      };
    };
  }, []);

  return {
    predictStockLevels,
  };
};