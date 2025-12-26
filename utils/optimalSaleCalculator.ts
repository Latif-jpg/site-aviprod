// utils/optimalSaleCalculator.ts

interface Lot {
  id: string;
  birdType: string;
  age: number;
  averageWeight: number;
  quantity: number;
  sellingPrice: number;
  feedConsumption: number;
  mortality: number;
  entryDate: string;
  targetSaleDate?: string;
}

interface SaleWindow {
  optimalDate: Date;
  minDate: Date;
  maxDate: Date;
  currentAge: number;
  optimalAge: number;
  currentWeight: number;
  targetWeight: number;
  profitability: 'excellent' | 'good' | 'acceptable' | 'poor';
  recommendation: string;
  metrics: {
    estimatedProfit: number;
    fcr: number; // Feed Conversion Ratio
    daysUntilOptimal: number;
    weightGainNeeded: number;
  };
}

/**
 * Calcule la fenêtre de vente optimale basée sur plusieurs critères
 */
export const calculateOptimalSaleWindow = (lot: Lot): SaleWindow => {
  // 1. Paramètres standards par type d'oiseau
  const standards = getStandardsByBirdType(lot.birdType);
  
  // 2. Calculer l'âge optimal
  const optimalAge = calculateOptimalAge(lot, standards);
  
  // 3. Calculer le poids cible
  const targetWeight = calculateTargetWeight(lot, standards);
  
  // 4. Calculer la fenêtre (min-optimal-max)
  const optimalDate = addDays(new Date(lot.entryDate), optimalAge);
  const minDate = addDays(optimalDate, -7); // 7 jours avant optimal
  const maxDate = addDays(optimalDate, 7);  // 7 jours après optimal
  
  // 5. Calculer le FCR (Feed Conversion Ratio)
  const fcr = calculateFCR(lot);
  
  // 6. Estimer le profit
  const estimatedProfit = calculateEstimatedProfit(lot, targetWeight);
  
  // 7. Évaluer la rentabilité
  const profitability = evaluateProfitability(lot, fcr, optimalAge);
  
  // 8. Générer une recommandation
  const recommendation = generateRecommendation(lot, optimalAge, targetWeight, profitability);
  
  // 9. Jours jusqu'à la vente optimale
  const daysUntilOptimal = Math.max(0, optimalAge - lot.age);
  
  // 10. Poids à gagner
  const weightGainNeeded = Math.max(0, targetWeight - lot.averageWeight);
  
  return {
    optimalDate,
    minDate,
    maxDate,
    currentAge: lot.age,
    optimalAge,
    currentWeight: lot.averageWeight,
    targetWeight,
    profitability,
    recommendation,
    metrics: {
      estimatedProfit,
      fcr,
      daysUntilOptimal,
      weightGainNeeded
    }
  };
};

// === FONCTIONS AUXILIAIRES ===

function getStandardsByBirdType(birdType: string) {
  const type = birdType?.toLowerCase() || 'broilers';
  
  const standardsByType: Record<string, any> = {
    broilers: {
      optimalAge: { min: 35, ideal: 42, max: 49 },
      targetWeight: { min: 1.8, ideal: 2.2, max: 2.8 },
      dailyWeightGain: 0.055, // 55g par jour
      idealFCR: 1.8,
      feedCostPerKg: 250, // FCFA
      sellingPriceRange: { min: 1500, ideal: 1800, max: 2200 }
    },
    layers: {
      optimalAge: { min: 510, ideal: 540, max: 600 },
      targetWeight: { min: 1.6, ideal: 1.8, max: 2.0 },
      dailyWeightGain: 0.008,
      idealFCR: 2.2,
      feedCostPerKg: 280,
      sellingPriceRange: { min: 3000, ideal: 3500, max: 4000 }
    },
    breeders: {
      optimalAge: { min: 350, ideal: 365, max: 400 },
      targetWeight: { min: 2.8, ideal: 3.2, max: 3.6 },
      dailyWeightGain: 0.01,
      idealFCR: 2.5,
      feedCostPerKg: 300,
      sellingPriceRange: { min: 4000, ideal: 5000, max: 6000 }
    }
  };
  
  return standardsByType[type] || standardsByType.broilers;
}

function calculateOptimalAge(lot: Lot, standards: any): number {
  // Ajuster l'âge optimal selon les performances actuelles
  const currentFCR = calculateFCR(lot);
  const weightProgress = lot.averageWeight / standards.targetWeight.ideal;
  
  let optimalAge = standards.optimalAge.ideal;
  
  // Si le poids progresse bien, on peut vendre plus tôt
  if (weightProgress > 0.9 && currentFCR < standards.idealFCR * 1.1) {
    optimalAge = standards.optimalAge.min + 3;
  }
  // Si le poids est en retard, attendre un peu plus
  else if (weightProgress < 0.7) {
    optimalAge = standards.optimalAge.ideal + 3;
  }
  
  return optimalAge;
}

function calculateTargetWeight(lot: Lot, standards: any): number {
  // Projection du poids basée sur le gain quotidien moyen
  const daysRemaining = Math.max(0, standards.optimalAge.ideal - lot.age);
  const projectedWeight = lot.averageWeight + (standards.dailyWeightGain * daysRemaining);
  
  // S'assurer que c'est dans la fourchette acceptable
  return Math.min(
    Math.max(projectedWeight, standards.targetWeight.min),
    standards.targetWeight.max
  );
}

function calculateFCR(lot: Lot): number {
  // FCR = Aliment consommé (kg) / Gain de poids (kg)
  // Estimation basée sur la consommation quotidienne
  if (lot.averageWeight <= 0) return 999;
  
  const totalFeedConsumed = lot.feedConsumption * lot.age;
  const weightGained = lot.averageWeight - 0.045; // Poids initial d'un poussin ~45g
  
  if (weightGained <= 0) return 999;
  
  return totalFeedConsumed / (weightGained * lot.quantity);
}

function calculateEstimatedProfit(lot: Lot, targetWeight: number): number {
  const standards = getStandardsByBirdType(lot.birdType);
  
  // Revenus estimés
  const revenue = targetWeight * lot.sellingPrice * lot.quantity;
  
  // Coûts estimés
  const feedCost = lot.feedConsumption * standards.feedCostPerKg * lot.age * lot.quantity;
  const otherCosts = lot.quantity * 500; // Coûts fixes estimés (vaccins, etc.)
  
  const profit = revenue - feedCost - otherCosts;
  
  return profit;
}

function evaluateProfitability(lot: Lot, fcr: number, optimalAge: number): 'excellent' | 'good' | 'acceptable' | 'poor' {
  const standards = getStandardsByBirdType(lot.birdType);
  const ageDeviation = Math.abs(lot.age - optimalAge);
  
  // Critères de rentabilité
  const goodFCR = fcr <= standards.idealFCR * 1.1;
  const goodTiming = ageDeviation <= 7;
  const lowMortality = (lot.mortality / lot.quantity) < 0.05;
  
  if (goodFCR && goodTiming && lowMortality) return 'excellent';
  if (goodFCR && (goodTiming || lowMortality)) return 'good';
  if (goodFCR || goodTiming) return 'acceptable';
  return 'poor';
}

function generateRecommendation(
  lot: Lot, 
  optimalAge: number, 
  targetWeight: number, 
  profitability: string
): string {
  const daysUntilOptimal = optimalAge - lot.age;
  const weightGap = targetWeight - lot.averageWeight;
  
  if (daysUntilOptimal <= 0) {
    if (lot.averageWeight >= targetWeight * 0.95) {
      return `✅ Fenêtre de vente OPTIMALE atteinte ! Vendez maintenant pour maximiser le profit.`;
    } else {
      return `⚠️ Âge optimal atteint mais poids insuffisant (${weightGap.toFixed(2)}kg manquant). Augmentez l'alimentation ou vendez à prix réduit.`;
    }
  }
  
  if (daysUntilOptimal <= 7) {
    return `🎯 Préparez-vous à la vente dans ${daysUntilOptimal} jours. Poids cible: ${targetWeight.toFixed(2)}kg (manque ${weightGap.toFixed(2)}kg).`;
  }
  
  if (profitability === 'excellent') {
    return `💚 Excellentes performances ! Continuez le plan actuel. Vente optimale dans ${daysUntilOptimal} jours.`;
  }
  
  if (profitability === 'poor') {
    return `🔴 Performances préoccupantes. Considérez une vente anticipée pour limiter les pertes.`;
  }
  
  return `📊 Lot en bonne voie. Vente optimale prévue dans ${daysUntilOptimal} jours à ${targetWeight.toFixed(2)}kg.`;
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

// === FONCTION D'AIDE POUR FORMATER L'AFFICHAGE ===

export const formatSaleWindow = (window: SaleWindow): string => {
  const formatDate = (date: Date) => date.toLocaleDateString('fr-FR', { 
    day: '2-digit', 
    month: 'short', 
    year: 'numeric' 
  });
  
  return `
📅 Fenêtre de vente optimale:
   • Minimum: ${formatDate(window.minDate)}
   • Optimal: ${formatDate(window.optimalDate)}
   • Maximum: ${formatDate(window.maxDate)}

📊 Métriques actuelles:
   • Âge: ${window.currentAge} jours (optimal: ${window.optimalAge})
   • Poids: ${window.currentWeight.toFixed(2)}kg (cible: ${window.targetWeight.toFixed(2)}kg)
   • FCR: ${window.metrics.fcr.toFixed(2)}
   • Jours restants: ${window.metrics.daysUntilOptimal}

💰 Rentabilité: ${window.profitability.toUpperCase()}
   • Profit estimé: ${window.metrics.estimatedProfit.toLocaleString()} FCFA

💡 ${window.recommendation}
  `;
};