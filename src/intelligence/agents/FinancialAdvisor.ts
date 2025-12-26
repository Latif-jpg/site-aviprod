// src/intelligence/agents/FinancialAdvisor.ts
// --- CORRECTION : Utiliser une seule instance de Supabase ---
import { supabase } from '../../../config';

import { smartAlertSystem } from '../core/SmartAlertSystem';
import { dataCollector } from '../core/DataCollector';

/**
 * FINANCIAL ADVISOR AGENT V2 - IA LÉGÈRE
 *
 * Agent IA spécialisé dans l'optimisation financière avec apprentissage heuristique.
 * - Analyse de rentabilité en temps réel
 * - Détection d'anomalies de dépenses
 * - Prévision de cash-flow
 * - Recommandations d'investissement adaptatives
 * - Apprentissage basé sur le profil et le feedback utilisateur
 */

// ==================== TYPES ====================

interface Transaction {
  id: string;
  type: 'revenue' | 'expense';
  category: string;
  montant: number;
  description: string;
  date: string;
  farm_id: string;
}

// ... (autres types d'analyse restent les mêmes)
interface ProfitabilityAnalysis {
  total_revenue: number;
  total_expenses: number;
  net_profit: number;
  profit_margin_percent: number;
  roi: number;
  trend: 'improving' | 'stable' | 'declining';
  profitability_score: number;
  breakdown_by_category: Record<string, number>;
}

interface AnomalyDetection {
  detected_anomalies: Array<{
    type: 'expense_spike' | 'revenue_drop' | 'unusual_frequency';
    category: string;
    amount: number;
    expected_amount: number;
    deviation_percent: number;
    severity: 'low' | 'medium' | 'high';
    explanation: string;
  }>;
  total_anomalies: number;
}

interface CashFlowForecast {
  current_balance: number;
  forecast_30_days: number;
  forecast_60_days: number;
  forecast_90_days: number;
  risk_level: 'safe' | 'warning' | 'critical';
  expected_inflows: number;
  expected_outflows: number;
  recommendations: string[];
}

interface TaxOptimization {
  estimated_taxable_income: number;
  potential_deductions: Array<{
    category: string;
    amount: number;
    description: string;
  }>;
  tax_saving_opportunities: string[];
  next_declaration_reminder: string;
}

interface InvestmentRecommendations {
  priority_investments: Array<{
    category: string;
    estimated_cost: number;
    expected_roi: number;
    payback_period_months: number;
    priority_score: number;
    justification: string;
  }>;
  budget_available: number;
}


// ==================== V2: IA LÉGÈRE - TYPES ET PROFILS ====================

// NOTE: Assurez-vous que cette table existe dans votre base de données Supabase.
/*
CREATE TABLE user_financial_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id),
  risk_tolerance TEXT NOT NULL DEFAULT 'medium',
  preferred_strategies TEXT[] NOT NULL DEFAULT '{}',
  recommendation_weights JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
*/
interface UserFinancialProfile {
  user_id: string;
  risk_tolerance: 'low' | 'medium' | 'high';
  preferred_strategies: string[]; // e.g., 'cost_reduction', 'growth_investment'
  recommendation_weights: Record<string, number>; // Poids ajusté pour chaque type de reco
}

interface HeuristicData {
  profit_margin: number;
  net_profit: number;
  total_expenses: number;
  alert_count: number;
  timestamp: number;
}

interface ComprehensiveAnalysisData {
  period: { start_date: string; end_date: string; };
  current_period: { revenue: number; expenses: number; profit: number; profit_margin: number; expenses_by_category: Record<string, number>; };
  previous_period: { revenue: number; expenses: number; profit: number; };
  transactions: Transaction[];
  user_financial_profile: UserFinancialProfile;
  current_balance: number; // CORRECTION : Ajout du champ manquant pour la balance actuelle.
}


// ==================== V2: SYSTÈME D'APPRENTISSAGE HEURISTIQUE ====================

class HeuristicMemory {
  private memory: HeuristicData[] = [];
  private max_size = 20; // Conserver les 20 derniers enregistrements

  update(data: Omit<HeuristicData, 'timestamp'>) {
    this.memory.push({ ...data, timestamp: Date.now() });
    if (this.memory.length > this.max_size) {
      this.memory.shift();
    }
  }

  getAverageTrend() {
    if (this.memory.length < 2) return { avgMargin: 0, avgAlerts: 0 };
    const avgMargin = this.memory.reduce((a, b) => a + b.profit_margin, 0) / this.memory.length;
    const avgAlerts = this.memory.reduce((a, b) => a + b.alert_count, 0) / this.memory.length;
    return { avgMargin, avgAlerts };
  }
}


// ==================== CONFIGURATION ====================

const ANOMALY_THRESHOLD = 0.30; // 30% déviation = anomalie
const FREQUENCY_ANOMALY_THRESHOLD = 1.5; // 50% de transactions en plus

// ==================== CLASSE PRINCIPALE (V2) ====================

class FinancialAdvisor {
  private static instance: FinancialAdvisor;
  private heuristicMemory = new HeuristicMemory();
  private userProfile: UserFinancialProfile | null = null;

  private constructor() {}

  public static getInstance(): FinancialAdvisor {
    if (!FinancialAdvisor.instance) {
      FinancialAdvisor.instance = new FinancialAdvisor();
    }
    return FinancialAdvisor.instance;
  }

  /**
   * ANALYSE FINANCIÈRE COMPLÈTE (V2)
   */
  public async analyzeFinances(
    userId: string,
    period: 'week' | 'month' | 'quarter' | 'year' = 'month'
  ): Promise<{
    profitability: ProfitabilityAnalysis;
    anomalies: AnomalyDetection;
    cashFlow: CashFlowForecast;
    taxOptimization: TaxOptimization;
    investments: InvestmentRecommendations;
  } | null> {
    try {
      console.log(`[FinancialAdvisorV2] Appel de la RPC unifiée 'get_comprehensive_financial_analysis' pour l'utilisateur ${userId}`);

      // Définir les dates de la période en fonction de la sélection de l'utilisateur
      const endDate = new Date();
      let daysBack = 30; // Par défaut : 'month'
      if (period === 'week') daysBack = 7;
      if (period === 'quarter') daysBack = 90;
      if (period === 'year') daysBack = 365;
      const startDate = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);
      
      // --- LOG DE DÉBOGAGE 1 : Vérifier les paramètres envoyés ---
      const rpcParams = {
        p_user_id: userId,
        p_start_date: startDate.toISOString().split('T')[0],
        p_end_date: endDate.toISOString().split('T')[0],
      };
      console.log("🔍 [FinancialAdvisorV2] Paramètres envoyés à la RPC 'get_comprehensive_financial_analysis':", JSON.stringify(rpcParams, null, 2));

      // =================================================================
      // ÉTAPE 1: APPEL UNIQUE À LA FONCTION RPC
      // =================================================================
      const { data: analysisData, error: rpcError } = await supabase.rpc(
        'get_comprehensive_financial_analysis',
        rpcParams
      ) as { data: ComprehensiveAnalysisData, error: any };

      if (rpcError) throw rpcError;

      // --- LOG DE DÉBOGAGE 2 : Afficher les données brutes reçues ---
      console.log("✅ [FinancialAdvisorV2] Données brutes reçues de la RPC:", JSON.stringify(analysisData, null, 2));

      if (!analysisData) throw new Error("Aucune donnée d'analyse financière retournée par la RPC.");

      this.userProfile = analysisData.user_financial_profile;

      const [profitability, anomalies, cashFlow, taxOptimization, investments] = await Promise.all([
        this.analyzeProfitability(analysisData),
        this.detectAnomalies(analysisData),
        this.forecastCashFlow(analysisData),
        this.optimizeTax(analysisData.transactions),
        this.recommendInvestments(analysisData), // V2: Maintenant influencé par le profil
      ]);

      // Générer alertes si nécessaire
      await this.generateFinancialAlerts(userId, { profitability, anomalies, cashFlow });

      // V2: Créer des recommandations IA basées sur l'apprentissage
      await this.createFinancialRecommendations(userId, {
        profitability,
        anomalies,
        cashFlow,
        investments,
      });

      // V2: Mettre à jour la mémoire et le profil
      this.updateLearnings(userId, { profitability, anomalies });

      return { profitability, anomalies, cashFlow, taxOptimization, investments };
    } catch (error) {
      console.error('[FinancialAdvisorV2] Erreur analyse:', error);
      dataCollector.trackError(error as Error, { userId, action: 'analyzeFinances' });
      return null;
    }
  }

  /**
   * V2: Applique le feedback de l'utilisateur pour ajuster les poids des recommandations.
   */
  public async applyUserFeedback(
    userId: string, // L'ID de l'utilisateur
    recommendationType: string, // Le type de recommandation (ex: 'financial_optimization')
    feedback: 'positive' | 'negative' // Le feedback de l'utilisateur
  ) {
    if (!this.userProfile) {
      this.userProfile = await this.getOrcreateUserProfile(userId);
    }

    const currentWeight = this.userProfile.recommendation_weights[recommendationType] || 1.0;
    const adjustment = feedback === 'positive' ? 0.1 : -0.1;
    const newWeight = Math.max(0.1, Math.min(2.0, currentWeight + adjustment));

    this.userProfile.recommendation_weights[recommendationType] = newWeight;

    await supabase
      .from('user_financial_profiles')
      .update({ recommendation_weights: this.userProfile.recommendation_weights, updated_at: new Date() })
      .eq('user_id', userId);
      
    console.log(`[FinancialAdvisorV2] Poids pour '${recommendationType}' ajusté à ${newWeight.toFixed(2)}.`);
  }

  // ==================== MÉTHODES D'ANALYSE (inchangées ou légèrement modifiées) ====================

  private async analyzeProfitability(
    analysisData: ComprehensiveAnalysisData
  ): Promise<ProfitabilityAnalysis> {
    const { revenue: totalRevenue, expenses: totalExpenses, profit: netProfit, profit_margin: profitMargin } = analysisData.current_period;

    const investmentBase = await this.getInitialInvestment(this.userProfile?.user_id || '');
    const roi = investmentBase > 0 && netProfit > 0 ? (netProfit / investmentBase) * 100 : 0;

    const trend = this.calculateFinancialTrend(netProfit, analysisData.previous_period.profit);
    const profitabilityScore = this.calculateProfitabilityScore(profitMargin, roi, trend);

    const breakdownByCategory = analysisData.current_period.expenses_by_category || {};

    // Si expenses_by_category est null, on le calcule à partir des transactions
    if (!breakdownByCategory || Object.keys(breakdownByCategory).length === 0) {
      // CORRECTION : S'assurer que 'transactions' n'est pas null avant de le filtrer.
      (analysisData.transactions || []).filter(t => t.type === 'expense').forEach(t => { 
        breakdownByCategory[t.category] = (breakdownByCategory[t.category] || 0) + t.montant; 
      });
    }

    return {
      total_revenue: totalRevenue,
      total_expenses: totalExpenses,
      net_profit: netProfit,
      profit_margin_percent: profitMargin,
      roi,
      trend,
      profitability_score: profitabilityScore,
      breakdown_by_category: breakdownByCategory,
    };
  }

  private async detectAnomalies(
    analysisData: ComprehensiveAnalysisData
  ): Promise<AnomalyDetection> {
    const anomalies: AnomalyDetection['detected_anomalies'] = [];
    const currentExpensesByCategory = analysisData.current_period.expenses_by_category || {};
    const previousExpensesTotal = analysisData.previous_period.expenses;

    // Pour cette démo, on compare la dépense totale à celle de la période précédente
    // Une version plus avancée comparerait catégorie par catégorie.
    if (previousExpensesTotal > 0) {
      const deviation = (analysisData.current_period.expenses - previousExpensesTotal) / previousExpensesTotal;

      if (Math.abs(deviation) > ANOMALY_THRESHOLD) {
        const severity = Math.abs(deviation) > 0.5 ? 'high' : 'medium';
        anomalies.push({
          type: 'expense_spike',
          category: 'Toutes',
          amount: analysisData.current_period.expenses,
          expected_amount: previousExpensesTotal,
          deviation_percent: deviation * 100,
          severity,
          explanation: `Les dépenses totales sont de ${(deviation * 100).toFixed(0)}% ${deviation > 0 ? 'supérieures' : 'inférieures'} à la période précédente.`,
        });
      }
    }

    return {
      detected_anomalies: anomalies,
      total_anomalies: anomalies.length,
    };
  }
  
  private async forecastCashFlow(
    analysisData: ComprehensiveAnalysisData
  ): Promise<CashFlowForecast> {
    // --- CORRECTION DÉFINITIVE : Utiliser la balance réelle fournie par la RPC. ---
    // Le nom du champ dans la RPC est 'current_balance'.
    const currentBalance = analysisData.current_balance || 0;
    
    // --- CORRECTION : Utiliser les données de la période ACTUELLE pour les prévisions ---
    // Les prévisions se basent sur la performance récente, pas sur une période antérieure qui peut être vide.
    const monthlyProfit = analysisData.current_period.profit;
    const monthlyRevenue = analysisData.current_period.revenue;
    const monthlyExpenses = analysisData.current_period.expenses;

    const forecast30 = currentBalance + monthlyProfit;
    const forecast60 = currentBalance + (2 * monthlyProfit);
    const forecast90 = currentBalance + (3 * monthlyProfit);

    const riskLevel = this.assessCashFlowRisk(forecast30, forecast60, monthlyExpenses);
    const recommendations = this.generateCashFlowRecommendations(riskLevel);

    return {
      current_balance: currentBalance,
      forecast_30_days: forecast30,
      forecast_60_days: forecast60,
      forecast_90_days: forecast90,
      risk_level: riskLevel,
      expected_inflows: monthlyRevenue,
      expected_outflows: monthlyExpenses,
      recommendations,
    };
  }

  private async optimizeTax(transactions: Transaction[] | null): Promise<TaxOptimization> {
    // CORRECTION : S'assurer que 'transactions' n'est jamais null.
    // Si la RPC retourne null, on le traite comme un tableau vide.
    const safeTransactions = transactions || [];
    const totalRevenue = safeTransactions.filter(t => t.type === 'revenue').reduce((sum, t) => sum + t.montant, 0);
    const totalExpenses = safeTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.montant, 0);
    const taxableIncome = Math.max(0, totalRevenue - totalExpenses);
    
    return {
      estimated_taxable_income: taxableIncome,
      potential_deductions: [],
      tax_saving_opportunities: [],
      next_declaration_reminder: this.calculateNextDeclarationDate(),
    };
  }

  /**
   * V2: RECOMMANDATIONS D'INVESTISSEMENT BASÉES SUR LE PROFIL DE RISQUE
   */
  private async recommendInvestments(
    analysisData: ComprehensiveAnalysisData
  ): Promise<InvestmentRecommendations> {
    // --- AMÉLIORATION : L'IA prend maintenant en compte plus de contexte ---
    const profitability = await this.analyzeProfitability(analysisData);
    const budgetAvailable = Math.max(0, analysisData.current_period.profit * 0.3);
    const farmAgeInDays = this.userProfile?.created_at ? (new Date().getTime() - new Date(this.userProfile.created_at).getTime()) / (1000 * 60 * 60 * 24) : 90;
    const isNewFarm = farmAgeInDays < 180; // Considérer une ferme comme "nouvelle" si elle a moins de 6 mois

    const allPossibleInvestments: InvestmentRecommendations['priority_investments'] = [];

    // --- NOUVELLE LOGIQUE 1 : Analyse des dépenses par catégorie ---
    // L'IA vérifie si une catégorie de dépense est anormalement élevée.
    const topExpenseCategory = Object.entries(profitability.breakdown_by_category)
      .sort(([, a], [, b]) => b - a)[0];

    if (topExpenseCategory && topExpenseCategory[0].toLowerCase().includes('aliment') && (topExpenseCategory[1] / profitability.total_expenses) > 0.60) {
      // Si l'alimentation représente plus de 60% des dépenses, c'est une priorité.
      allPossibleInvestments.push({
        category: 'Optimisation alimentation',
        estimated_cost: 5000, expected_roi: 25, payback_period_months: 4, priority_score: 90,
        justification: 'Coûts alimentaires élevés - Un aliment de meilleure qualité peut améliorer le FCR.',
      });
    }

    // --- NOUVELLE LOGIQUE 2 : Analyse de la santé des lots ---
    // L'IA se base sur la mortalité moyenne pour suggérer des améliorations sanitaires.
    const avgMortality = await this.getAverageMortality(this.userProfile?.user_id || ''); // Cette fonction est un placeholder, mais la logique est là.
    if (avgMortality > 6) {
      allPossibleInvestments.push({
        category: 'Système de désinfection',
        estimated_cost: 3000, expected_roi: 40, payback_period_months: 3, priority_score: 95,
        justification: 'Mortalité élevée - Réduction des pertes par amélioration sanitaire.',
      });
    }

    // --- NOUVELLE LOGIQUE 3 : Recommandation d'expansion intelligente ---
    // L'IA ne propose l'expansion que si la ferme est mature et rentable.
    // Elle évite de suggérer des investissements risqués à une nouvelle ferme.
    const isProfitableEnough = profitability.profit_margin_percent > 20;
    if (!isNewFarm && isProfitableEnough && budgetAvailable > 10000) {
      allPossibleInvestments.push({
        category: 'Expansion capacité (+20%)',
        estimated_cost: 15000, expected_roi: 35, payback_period_months: 12, priority_score: 75,
        justification: 'Forte rentabilité - Augmentation du volume de production.',
      });
    }

    // --- AMÉLIORATION : Le filtrage par profil de risque est plus fin ---
    const riskTolerance = this.userProfile?.risk_tolerance || 'medium';
    let filteredInvestments = allPossibleInvestments;

    if (riskTolerance === 'low') {
      // Pour un profil prudent, on ne garde que les investissements à faible risque et à retour rapide.
      filteredInvestments = allPossibleInvestments.filter(inv => inv.payback_period_months <= 6);
    } else if (isNewFarm && riskTolerance === 'medium') {
      // Pour une nouvelle ferme avec un profil de risque moyen, on évite quand même l'expansion.
      filteredInvestments = allPossibleInvestments.filter(inv => !inv.category.includes('Expansion'));
    } else if (riskTolerance === 'high') {
      // Augmenter la priorité des investissements de croissance
      filteredInvestments.forEach(inv => {
        if (inv.category === 'Expansion capacité (+20%)') {
          inv.priority_score = Math.min(100, inv.priority_score + 10);
        }
      });
    }

    filteredInvestments.sort((a, b) => b.priority_score - a.priority_score);

    return {
      priority_investments: filteredInvestments.slice(0, 3),
      budget_available: budgetAvailable,
    };
  }

  // ==================== V2: APPRENTISSAGE ET RECOMMANDATIONS ====================

  /**
   * V2: CRÉATION DE RECOMMANDATIONS IA ADAPTATIVES
   */
  private async createFinancialRecommendations(
    userId: string,
    analysis: {
      profitability: ProfitabilityAnalysis;
      anomalies: AnomalyDetection;
      cashFlow: CashFlowForecast;
      investments: InvestmentRecommendations;
    }
  ) {
    const recommendations: any[] = [];
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Si le profil n'est pas déjà chargé, on le récupère avant de continuer.
    if (!this.userProfile) {
      this.userProfile = await this.getOrcreateUserProfile(userId);
    }
    // V2: Obtenir les poids des recommandations depuis le profil
    const weights = this.userProfile?.recommendation_weights || {}; // Utiliser un objet vide comme fallback

    // Reco 1: Optimisation des marges (si nécessaire)
    const optiWeight = weights['financial_optimization'] || 1.0;
    if (analysis.profitability.profit_margin_percent < 15) {
      recommendations.push({
        user_id: user.id,
        farm_id: userId,
        recommendation_type: 'financial_optimization',
        category: 'finance',
        priority: 80 * optiWeight, // V2: Priorité ajustée
        title: 'Améliorer la Marge Bénéficiaire',
        description: `Votre marge est de ${analysis.profitability.profit_margin_percent.toFixed(1)}%, ce qui est améliorable.`,
        actions: [{ step: 1, action: 'Analyser les coûts les plus élevés' }],
        expected_impact: { margin_improvement: '+5-8%' },
        confidence_score: 85,
      });
    }

    // Reco 2: Investissement prioritaire (s'il y en a)
    const investWeight = weights['investment_opportunity'] || 1.0;
    if (analysis.investments.priority_investments.length > 0) {
      const topInvestment = analysis.investments.priority_investments[0];
      recommendations.push({
        user_id: user.id,
        farm_id: userId,
        recommendation_type: 'investment_opportunity',
        category: 'finance',
        priority: topInvestment.priority_score * investWeight, // V2: Priorité ajustée
        title: `Investir dans: ${topInvestment.category}`,
        description: topInvestment.justification,
        actions: [{ step: 1, action: `Budget estimé: ${topInvestment.estimated_cost} FCFA` }],
        expected_impact: { roi: `${topInvestment.expected_roi}%` },
        confidence_score: 75,
      });
    }

    if (recommendations.length > 0) {
      // Supprimer les anciennes recommandations pour ne pas surcharger
      await supabase.from('ai_recommendations').delete().eq('user_id', user.id).eq('category', 'finance');
      // Insérer les nouvelles
      await supabase.from('ai_recommendations').insert(recommendations);
    }
  }

  /**
   * V2: Met à jour la mémoire heuristique et le profil utilisateur
   */
  private updateLearnings(
    userId: string,
    analysis: { profitability: ProfitabilityAnalysis; anomalies: AnomalyDetection }
  ) {
    // 1. Mettre à jour la mémoire heuristique
    this.heuristicMemory.update({
      profit_margin: analysis.profitability.profit_margin_percent,
      net_profit: analysis.profitability.net_profit,
      total_expenses: analysis.profitability.total_expenses,
      alert_count: analysis.anomalies.total_anomalies,
    });
  }


  // ==================== MÉTHODES UTILITAIRES ET PROFILS (V2) ====================

  private async getOrcreateUserProfile(userId: string): Promise<UserFinancialProfile> {
    // Le profil est maintenant fourni par la RPC. Si pour une raison quelconque il est null,
    // on retourne un profil par défaut sécurisé pour éviter tout plantage.
    if (!this.userProfile || !this.userProfile.user_id) {
      console.warn(`[FinancialAdvisorV2] Profil financier non trouvé ou invalide pour ${userId}. Utilisation d'un profil par défaut.`);
      return {
        user_id: userId,
        risk_tolerance: 'medium',
        preferred_strategies: [],
        recommendation_weights: {},
      };
    }
    return this.userProfile as UserFinancialProfile;
  }

  private async generateFinancialAlerts(
    userId: string,
    analysis: {
      profitability: ProfitabilityAnalysis;
      anomalies: AnomalyDetection;
      cashFlow: CashFlowForecast;
    }
  ) {
    if (analysis.profitability.profit_margin_percent < 0) {
      await smartAlertSystem.alertNegativeMargin(analysis.profitability.profit_margin_percent, 'ce mois');
    }
    const highSeverityAnomalies = analysis.anomalies.detected_anomalies.filter(a => a.severity === 'high');
    for (const anomaly of highSeverityAnomalies) {
      await smartAlertSystem.createAlert({
        type: 'finance_expense_spike' as any,
        context: { category: anomaly.category, amount: anomaly.amount, deviation: anomaly.deviation_percent.toFixed(0) },
      });
    }
    if (analysis.cashFlow.risk_level === 'critical') {
      await smartAlertSystem.createAlert({
        type: 'finance_low_cashflow' as any,
        context: { current_balance: analysis.cashFlow.current_balance, forecast_30: analysis.cashFlow.forecast_30_days },
      });
    }
  }
  
  private assessCashFlowRisk(forecast30: number, forecast60: number, monthlyExpenses: number): CashFlowForecast['risk_level'] {
    if (forecast30 < 0) return 'critical';
    if (forecast30 < monthlyExpenses * 0.5) return 'warning';
    return 'safe';
  }

  private generateCashFlowRecommendations(risk: string): string[] {
    if (risk === 'critical') return ['🚨 Action urgente: augmenter revenus ou réduire dépenses', 'Négocier délais de paiement'];
    if (risk === 'warning') return ['⚠️ Surveiller la trésorerie de près', 'Prévoir ventes dans les 15 prochains jours'];
    return ['✅ Trésorerie saine', 'Envisager investissements stratégiques'];
  }
  
  private calculateNextDeclarationDate(): string {
    const now = new Date();
    const quarter = Math.floor(now.getMonth() / 3) + 1;
    const nextQuarter = (quarter % 4) + 1;
    const year = nextQuarter === 1 ? now.getFullYear() + 1 : now.getFullYear();
    return `Trimestre ${nextQuarter} ${year}`;
  }
  
  private calculateProfitabilityScore(margin: number, roi: number, trend: string): number {
    let score = 50;
    if (margin > 20) score += 40; else if (margin > 10) score += 20;
    if (roi > 20) score += 30; else if (roi > 10) score += 15;
    if (trend === 'improving') score += 20; else if (trend === 'stable') score += 10;
    return Math.min(score, 100);
  }
  
  private calculateFinancialTrend(currentProfit: number, previousProfit: number): ProfitabilityAnalysis['trend'] {
    if (currentProfit > previousProfit * 1.1) return 'improving';
    if (currentProfit < previousProfit * 0.9) return 'declining';
    return 'stable';
  }
  
  // Fonctions de récupération de données (stubs pour l'exemple)
  private async getInitialInvestment(userId: string): Promise<number> {
    // TODO: Remplacer par une lecture réelle de la base de données
    return 50000;
  }
  private async getAverageMortality(userId: string): Promise<number> { return 5; }
}

// Types pour l'interface
interface IntelligenceAgent {
  analyze(entityId: string): Promise<any>;
  getMetrics(): Promise<AgentMetrics>;
  isActive(): boolean;
}

interface AgentMetrics {
  total_analyses: number;
  success_rate: number;
  average_confidence: number;
  alerts_generated: number;
}

// Implémentation de l'interface IntelligenceAgent
class FinancialAdvisorWrapper implements IntelligenceAgent {
  private agent = FinancialAdvisor.getInstance();

  async analyze(entityId: string): Promise<any> {
    return await this.agent.analyzeFinances(entityId);
  }

  async getMetrics(): Promise<AgentMetrics> {
    // Ces valeurs pourraient être calculées et stockées dynamiquement
    return {
      total_analyses: 0,
      success_rate: 95,
      average_confidence: 85,
      alerts_generated: 0,
    };
  }

  isActive(): boolean {
    return true;
  }
}

// ==================== EXPORTS (inchangés) ====================

// Export singleton
export const financialAdvisor = FinancialAdvisor.getInstance();

// Export wrapper pour l'interface commune
export const financialAdvisorWrapper = new FinancialAdvisorWrapper();

// Hook React pour une utilisation facile dans les composants
export const useFinancialAdvisor = () => {
  const hasAccess = (feature: string): boolean => {
    // Vérification de l'abonnement (à remplacer par votre logique réelle)
    // Pour l'instant, on autorise tout le monde à accéder à l'analyse financière
    return feature === 'finance';
  };

  return {
    analyzeFinances: hasAccess('finance') ? (userId: string, period?: 'week' | 'month' | 'quarter' | 'year') =>
      financialAdvisor.analyzeFinances(userId, period) : null,
    // V2: Exposer la méthode de feedback à l'UI
    applyUserFeedback: (userId: string, recommendationType: string, feedback: 'positive' | 'negative') =>
      financialAdvisor.applyUserFeedback(userId, recommendationType, feedback),
  };
};
