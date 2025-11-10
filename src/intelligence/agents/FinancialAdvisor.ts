// src/intelligence/agents/FinancialAdvisor.ts
// Import dynamique pour éviter les problèmes d'initialisation
let supabaseClient: any = null;

const getSupabaseClient = async () => {
  if (!supabaseClient) {
    try {
      const { ensureSupabaseInitialized } = await import('../../../app/integrations/supabase/client');
      supabaseClient = await ensureSupabaseInitialized();
    } catch (error) {
      console.error('[FinancialAdvisor] Erreur chargement Supabase:', error);
      return null;
    }
  }
  return supabaseClient;
};

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
      // V2: Charger le profil de l'utilisateur
      this.userProfile = await this.getOrcreateUserProfile(userId);

      const transactions = await this.getTransactions(userId, period);

      const [profitability, anomalies, cashFlow, taxOptimization, investments] = await Promise.all([
        this.analyzeProfitability(transactions, userId),
        this.detectAnomalies(transactions, userId),
        this.forecastCashFlow(transactions, userId),
        this.optimizeTax(transactions),
        this.recommendInvestments(transactions, userId), // V2: Maintenant influencé par le profil
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
      await this.updateLearnings(userId, { profitability, anomalies });

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
    userId: string,
    recommendationType: string,
    feedback: 'positive' | 'negative'
  ) {
    if (!this.userProfile) {
      this.userProfile = await this.getOrcreateUserProfile(userId);
    }

    const currentWeight = this.userProfile.recommendation_weights[recommendationType] || 1.0;
    const adjustment = feedback === 'positive' ? 0.1 : -0.1;
    const newWeight = Math.max(0.1, Math.min(2.0, currentWeight + adjustment));

    this.userProfile.recommendation_weights[recommendationType] = newWeight;

    const supabase = await getSupabaseClient();
    if (!supabase || !this.userProfile) return;

    await supabase
      .from('user_financial_profiles')
      .update({ recommendation_weights: this.userProfile.recommendation_weights, updated_at: new Date() })
      .eq('user_id', userId);
      
    console.log(`[FinancialAdvisorV2] Poids pour '${recommendationType}' ajusté à ${newWeight.toFixed(2)}.`);
  }

  // ==================== MÉTHODES D'ANALYSE (inchangées ou légèrement modifiées) ====================

  private async analyzeProfitability(
    transactions: Transaction[],
    userId: string
  ): Promise<ProfitabilityAnalysis> {
    const revenues = transactions.filter(t => t.type === 'revenue');
    const expenses = transactions.filter(t => t.type === 'expense');

    const totalRevenue = revenues.reduce((sum, t) => sum + t.montant, 0);
    const totalExpenses = expenses.reduce((sum, t) => sum + t.montant, 0);
    const netProfit = totalRevenue - totalExpenses;
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    const investmentBase = await this.getInitialInvestment(userId);
    const roi = investmentBase > 0 ? (netProfit / investmentBase) * 100 : 0;

    const trend = await this.calculateFinancialTrend(userId, netProfit);
    const profitabilityScore = this.calculateProfitabilityScore(profitMargin, roi, trend);

    const breakdownByCategory: Record<string, number> = {};
    expenses.forEach(t => {
      breakdownByCategory[t.category] = (breakdownByCategory[t.category] || 0) + t.montant;
    });

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
    transactions: Transaction[],
    userId: string
  ): Promise<AnomalyDetection> {
    const anomalies: AnomalyDetection['detected_anomalies'] = [];
    const expenseTransactionsByCategory = transactions
      .filter(t => t.type === 'expense')
      .reduce((acc, t) => {
        if (!acc[t.category]) acc[t.category] = [];
        acc[t.category].push(t);
        return acc;
      }, {} as Record<string, Transaction[]>);

    for (const [category, transactionsForCategory] of Object.entries(expenseTransactionsByCategory)) {
      const amount = transactionsForCategory.reduce((sum, t) => sum + t.montant, 0);
      const actualCount = transactionsForCategory.length;

      const expectedAmount = await this.getExpectedAmount(userId, category);
      const deviation = Math.abs(amount - expectedAmount) / expectedAmount;

      if (deviation > ANOMALY_THRESHOLD) {
        const severity = deviation > 0.5 ? 'high' : deviation > 0.4 ? 'medium' : 'low';
        anomalies.push({
          type: 'expense_spike',
          category,
          amount,
          expected_amount: expectedAmount,
          deviation_percent: deviation * 100,
          severity,
          explanation: `Dépenses en ${category} supérieures de ${(deviation * 100).toFixed(0)}% à la normale`,
        });
      }

      const expectedCount = await this.getExpectedTransactionCount(userId, category);
      if (expectedCount > 1 && actualCount > expectedCount * FREQUENCY_ANOMALY_THRESHOLD) {
        anomalies.push({
          type: 'unusual_frequency',
          category,
          amount: actualCount,
          expected_amount: expectedCount,
          deviation_percent: ((actualCount - expectedCount) / expectedCount) * 100,
          severity: actualCount > expectedCount * 2 ? 'medium' : 'low',
          explanation: `Fréquence d'achats inhabituelle: ${actualCount} transactions contre une moyenne de ${expectedCount.toFixed(0)}.`,
        });
      }
    }
    return {
      detected_anomalies: anomalies,
      total_anomalies: anomalies.length,
    };
  }
  
  private async forecastCashFlow(
    transactions: Transaction[],
    userId: string
  ): Promise<CashFlowForecast> {
    const currentBalance = await this.getCurrentBalance(userId);
    const avgMonthlyRevenue = await this.getAverageMonthlyRevenue(userId);
    const avgMonthlyExpenses = await this.getAverageMonthlyExpenses(userId);

    const forecast30 = currentBalance + (avgMonthlyRevenue - avgMonthlyExpenses);
    const forecast60 = currentBalance + 2 * (avgMonthlyRevenue - avgMonthlyExpenses);
    const forecast90 = currentBalance + 3 * (avgMonthlyRevenue - avgMonthlyExpenses);

    const riskLevel = this.assessCashFlowRisk(forecast30, forecast60, avgMonthlyExpenses);
    const recommendations = this.generateCashFlowRecommendations(riskLevel);

    return {
      current_balance: currentBalance,
      forecast_30_days: forecast30,
      forecast_60_days: forecast60,
      forecast_90_days: forecast90,
      risk_level: riskLevel,
      expected_inflows: avgMonthlyRevenue,
      expected_outflows: avgMonthlyExpenses,
      recommendations,
    };
  }

  private async optimizeTax(transactions: Transaction[]): Promise<TaxOptimization> {
    // La logique reste la même, car elle est basée sur des règles fixes
    const totalRevenue = transactions.filter(t => t.type === 'revenue').reduce((sum, t) => sum + t.montant, 0);
    const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.montant, 0);
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
    transactions: Transaction[],
    userId: string
  ): Promise<InvestmentRecommendations> {
    const profitability = await this.analyzeProfitability(transactions, userId);
    const budgetAvailable = Math.max(0, profitability.net_profit * 0.3);

    const allPossibleInvestments: InvestmentRecommendations['priority_investments'] = [];

    // Recommandation 1: Alimentation (priorité haute, risque faible)
    if (profitability.breakdown_by_category['alimentation'] > profitability.total_expenses * 0.65) {
      allPossibleInvestments.push({
        category: 'Optimisation alimentation',
        estimated_cost: 5000, expected_roi: 25, payback_period_months: 4, priority_score: 90,
        justification: 'Coûts alimentaires élevés - Un aliment de meilleure qualité peut améliorer le FCR.',
      });
    }

    // Recommandation 2: Sanitaire (priorité haute, risque faible)
    const avgMortality = await this.getAverageMortality(userId);
    if (avgMortality > 6) {
      allPossibleInvestments.push({
        category: 'Système de désinfection',
        estimated_cost: 3000, expected_roi: 40, payback_period_months: 3, priority_score: 95,
        justification: 'Mortalité élevée - Réduction des pertes par amélioration sanitaire.',
      });
    }

    // Recommandation 3: Expansion (priorité moyenne, risque moyen/haut)
    if (profitability.profit_margin_percent > 20 && budgetAvailable > 10000) {
      allPossibleInvestments.push({
        category: 'Expansion capacité (+20%)',
        estimated_cost: 15000, expected_roi: 35, payback_period_months: 12, priority_score: 75,
        justification: 'Forte rentabilité - Augmentation du volume de production.',
      });
    }

    // V2: Filtrer les investissements selon le profil de risque de l'utilisateur
    const riskTolerance = this.userProfile?.risk_tolerance || 'medium';
    let filteredInvestments = allPossibleInvestments;

    if (riskTolerance === 'low') {
      // Exclure les investissements à haut risque comme l'expansion
      filteredInvestments = allPossibleInvestments.filter(inv => inv.category !== 'Expansion capacité (+20%)');
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
    const supabase = await getSupabaseClient();
    if (!supabase || !this.userProfile) return;

    const recommendations: any[] = [];
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // V2: Obtenir les poids des recommandations depuis le profil
    const weights = this.userProfile.recommendation_weights;

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
  private async updateLearnings(
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

    // 2. Mettre à jour le profil utilisateur dans Supabase (pour persistance)
    // Cette partie peut être étendue pour stocker les tendances moyennes, etc.
    // Pour l'instant, on met juste à jour la date de dernière analyse.
    const supabase = await getSupabaseClient();
    if (!supabase) return;
    await supabase.from('user_financial_profiles').update({ updated_at: new Date() }).eq('user_id', userId);
  }


  // ==================== MÉTHODES UTILITAIRES ET PROFILS (V2) ====================

  private async getOrcreateUserProfile(userId: string): Promise<UserFinancialProfile> {
    const supabase = await getSupabaseClient();
    if (!supabase) throw new Error("Supabase client non initialisé");

    // Étape 1: Assurer l'existence du profil avec UPSERT.
    // Tente d'insérer un profil. Si un profil avec le même user_id existe déjà,
    // il ne fait rien et ne retourne rien (à cause de ignoreDuplicates: true).
    const { error: upsertError } = await supabase
      .from('user_financial_profiles')
      .upsert({
        user_id: userId,
        risk_tolerance: 'medium',
        preferred_strategies: [],
        recommendation_weights: {},
      }, {
        onConflict: 'user_id',
        ignoreDuplicates: true,
      });

    if (upsertError) {
      console.error('[FinancialAdvisorV2] Erreur lors de l\'upsert du profil financier:', upsertError);
      throw upsertError;
    }

    // Étape 2: Récupérer le profil qui existe maintenant à coup sûr.
    const { data: profileData, error: selectError } = await supabase
      .from('user_financial_profiles')
      .select()
      .eq('user_id', userId)
      .single();

    if (selectError) {
      console.error('[FinancialAdvisorV2] Erreur lors de la récupération du profil financier après upsert:', selectError);
      throw selectError;
    }

    return profileData as UserFinancialProfile;
  }

  private async getTransactions(userId: string, period: string): Promise<Transaction[]> {
    const supabase = await getSupabaseClient();
    if (!supabase) return [];

    let daysBack = 30;
    if (period === 'week') daysBack = 7;
    if (period === 'quarter') daysBack = 90;
    if (period === 'year') daysBack = 365;

    const startDate = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);

    const { data } = await supabase
      .from('financial_records')
      .select('*')
      .eq('user_id', userId)
      .gte('record_date', startDate.toISOString())
      .order('record_date', { ascending: false });

    return data?.map((record: any) => ({
      id: record.id,
      type: record.type === 'income' ? 'revenue' : 'expense',
      category: record.category || 'autres',
      montant: record.amount,
      description: record.description || '',
      date: record.record_date,
      farm_id: record.user_id,
    })) || [];
  }

  // ... Les autres méthodes utilitaires (getExpectedAmount, getCurrentBalance, etc.) restent globalement les mêmes ...
  // Elles sont appelées par les méthodes d'analyse principales.
  
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
  
  private async calculateFinancialTrend(userId: string, currentProfit: number): Promise<ProfitabilityAnalysis['trend']> {
    // Implémentation simplifiée pour l'exemple
    return 'stable';
  }
  
  // Fonctions de récupération de données (stubs pour l'exemple)
  private async getInitialInvestment(userId: string): Promise<number> { return 50000; }
  private async getExpectedAmount(userId: string, category: string): Promise<number> { return 1000; }
  private async getExpectedTransactionCount(userId: string, category: string): Promise<number> { return 5; }
  private async getCurrentBalance(userId: string): Promise<number> { return 20000; }
  private async getAverageMonthlyRevenue(userId: string): Promise<number> { return 5000; }
  private async getAverageMonthlyExpenses(userId: string): Promise<number> { return 3000; }
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
  return {
    analyzeFinances: (userId: string, period?: 'week' | 'month' | 'quarter' | 'year') =>
      financialAdvisor.analyzeFinances(userId, period),
    // V2: Exposer la méthode de feedback à l'UI
    applyUserFeedback: (userId: string, recommendationType: string, feedback: 'positive' | 'negative') =>
      financialAdvisor.applyUserFeedback(userId, recommendationType, feedback),
  };
};
