// src/intelligence/core/SelfLearningEngineLite.ts
import { supabase as globalSupabase } from '../../../config'; // Utiliser le client Supabase consolidé
import { SupabaseClient } from '@supabase/supabase-js';

/**
 * SELF-LEARNING ENGINE LITE
 *
 * IA heuristique adaptative SANS Machine Learning lourd:
 * - Apprentissage progressif par observation
 * - Aucune dépendance externe
 * - 100% local et rapide
 * - Auto-optimisation continue
 * - Sauvegarde dans Supabase
 *
 * PRINCIPE:
 * 1. Observer résultats actions
 * 2. Évaluer efficacité
 * 3. Ajuster priorités
 * 4. Retenir meilleures décisions
 */

// ==================== TYPES ====================

interface Metric {
  successRate: number;      // Taux de succès 0-1
  avgResponseTime: number;   // Temps moyen en ms
  totalExecutions: number;   // Nombre d'exécutions
  lastExecuted: string;      // ISO timestamp
  score: number;             // Score global 0-1
  confidence: number;        // Confiance 0-1
}

interface ActionResult {
  action: string;
  success: boolean;
  duration: number;          // en ms
  context?: Record<string, any>;
  userId?: string;
  timestamp?: string;
}

interface Strategy {
  name: string;
  description: string;
  applicableContexts: string[];
  metrics: Metric;
}

interface LearningConfig {
  learningRate: number;      // Vitesse adaptation (0.05-0.2)
  explorationRate: number;   // Taux exploration (0.1-0.3)
  minExecutions: number;     // Min avant confiance
  useSupabase: boolean;      // Sauvegarder dans Supabase
}

// ==================== CLASSE PRINCIPALE ====================

class SelfLearningEngineLite {
  private static instance: SelfLearningEngineLite;

  private metrics: Record<string, Metric> = {};
  private strategies: Record<string, Strategy> = {};
  private config: LearningConfig;
  private userId: string | null = null;
  private supabase: SupabaseClient | null = null;

  private constructor(config?: Partial<LearningConfig>) {
    this.config = {
      learningRate: 0.1,
      explorationRate: 0.15,
      minExecutions: 5,
      useSupabase: true,
      ...config,
    };

    // Note: Binding not needed for direct method calls

    // CORRECTION: Ne pas initialiser côté serveur (SSR) pour éviter les erreurs "window not defined"
    if (typeof window !== 'undefined') {
      this.initializeUser();
      this.loadMemory();
    } else {
      console.log('[SelfLearningLite] Mode Serveur (SSR) détecté: Initialisation reportée.');
    }
  }

  public static getInstance(config?: Partial<LearningConfig>): SelfLearningEngineLite {
    if (!SelfLearningEngineLite.instance) {
      SelfLearningEngineLite.instance = new SelfLearningEngineLite(config);
    }
    return SelfLearningEngineLite.instance;
  }

  /**
   * INITIALISATION
   */

  private async initializeUser() {
    try {
      // Le client Supabase est déjà initialisé et exporté globalement
      this.supabase = globalSupabase;
      const { data: { session }, error } = await this.supabase.auth.getSession();
      if (error) {
        // Ne pas throw l'erreur, juste logger et continuer
        console.log('[SelfLearningLite] Session error (normal si pas connecté):', error.message);
      }
      this.userId = session?.user?.id || null;
    } catch (error) {
      console.error('[SelfLearningLite] Erreur init user:', error);
      this.userId = null;
    }
  }

  /**
   * 🧠 APPRENTISSAGE PRINCIPAL
   */

  public learn(result: ActionResult): void {
    const { action, success, duration, context, timestamp } = result;

    // Initialiser métrique si nouvelle action
    if (!this.metrics[action]) {
      this.metrics[action] = {
        successRate: 0.5,
        avgResponseTime: duration,
        totalExecutions: 0,
        lastExecuted: timestamp || new Date().toISOString(),
        score: 0.5,
        confidence: 0,
      };
    }

    const m = this.metrics[action];

    // Mise à jour progressive avec learning rate
    m.successRate = this.adapt(m.successRate, success ? 1 : 0);
    m.avgResponseTime = this.adapt(m.avgResponseTime, duration);
    m.totalExecutions += 1;
    m.lastExecuted = timestamp || new Date().toISOString();

    // Calcul confiance (augmente avec expérience)
    m.confidence = Math.min(m.totalExecutions / (this.config.minExecutions * 2), 1);

    // Score global (70% succès + 30% performance)
    m.score = this.calculateScore(m);

    // Sauvegarder
    this.metrics[action] = m;
    this.saveMemory();

    // Logger apprentissage
    console.log(`[SelfLearningLite] Appris: ${action} | Score: ${m.score.toFixed(2)} | Confiance: ${(m.confidence * 100).toFixed(0)}%`);
  }

  /**
   * 🎯 SÉLECTION DE LA MEILLEURE ACTION
   */

  public chooseBestAction(
    possibleActions: string[],
    context?: Record<string, any>
  ): string {
    // Exploration vs Exploitation (ε-greedy)
    const shouldExplore = Math.random() < this.config.explorationRate;

    if (shouldExplore) {
      // Exploration: choisir action aléatoire pour découvrir
      const randomIndex = Math.floor(Math.random() * possibleActions.length);
      console.log(`[SelfLearningLite] EXPLORATION: ${possibleActions[randomIndex]}`);
      return possibleActions[randomIndex];
    }

    // Exploitation: choisir meilleure action connue
    let bestAction = possibleActions[0];
    let bestScore = this.getActionScore(possibleActions[0]);

    for (const action of possibleActions) {
      const score = this.getActionScore(action);

      if (score > bestScore) {
        bestScore = score;
        bestAction = action;
      }
    }

    console.log(`[SelfLearningLite] EXPLOITATION: ${bestAction} (score: ${bestScore.toFixed(2)})`);
    return bestAction;
  }

  /**
   * 📊 OBTENIR SCORE D'UNE ACTION
   */

  private getActionScore(action: string): number {
    const metric = this.metrics[action];

    if (!metric) {
      // Nouveau = score neutre pour encourager l'essai
      return 0.5;
    }

    // Pondérer par confiance (favoriser actions testées)
    return metric.score * (0.5 + 0.5 * metric.confidence);
  }

  /**
   * 🧮 CALCUL DU SCORE GLOBAL
   */

  private calculateScore(m: Metric): number {
    // 70% succès + 30% rapidité
    const successScore = m.successRate;
    const speedScore = 1 / (1 + m.avgResponseTime / 1000); // Normaliser temps

    return successScore * 0.7 + speedScore * 0.3;
  }

  /**
   * 🔧 ADAPTATION PROGRESSIVE (EXPONENTIAL MOVING AVERAGE)
   */

  private adapt(oldValue: number, newValue: number): number {
    return oldValue + this.config.learningRate * (newValue - oldValue);
  }

  /**
   * 📈 RECOMMANDER ACTIONS PRIORITAIRES
   */

  public getTopActions(n: number = 3): Array<{ action: string; score: number; confidence: number }> {
    const actions = Object.entries(this.metrics)
      .map(([action, metric]) => ({
        action,
        score: metric.score,
        confidence: metric.confidence,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, n);

    return actions;
  }

  /**
   * 🔍 ANALYSE COMPARATIVE
   */

  public compareActions(action1: string, action2: string): {
    winner: string;
    scoreDiff: number;
    recommendation: string;
  } {
    const score1 = this.getActionScore(action1);
    const score2 = this.getActionScore(action2);

    const winner = score1 > score2 ? action1 : action2;
    const scoreDiff = Math.abs(score1 - score2);

    let recommendation = '';
    if (scoreDiff > 0.2) {
      recommendation = `${winner} est nettement meilleur (+${(scoreDiff * 100).toFixed(0)}%)`;
    } else if (scoreDiff > 0.1) {
      recommendation = `${winner} performe légèrement mieux`;
    } else {
      recommendation = 'Performance équivalente, continuer à tester';
    }

    return { winner, scoreDiff, recommendation };
  }

  /**
   * 📊 STATISTIQUES GLOBALES
   */

  public getGlobalStats(): {
    totalActions: number;
    avgSuccessRate: number;
    avgScore: number;
    mostReliable: string;
    fastest: string;
  } {
    const entries = Object.entries(this.metrics);

    if (entries.length === 0) {
      return {
        totalActions: 0,
        avgSuccessRate: 0,
        avgScore: 0,
        mostReliable: 'N/A',
        fastest: 'N/A',
      };
    }

    const avgSuccessRate = entries.reduce((sum, [, m]) => sum + m.successRate, 0) / entries.length;
    const avgScore = entries.reduce((sum, [, m]) => sum + m.score, 0) / entries.length;

    const mostReliable = entries.reduce((best, [action, m]) =>
      m.successRate > (this.metrics[best]?.successRate || 0) ? action : best
      , entries[0][0]);

    const fastest = entries.reduce((best, [action, m]) =>
      m.avgResponseTime < (this.metrics[best]?.avgResponseTime || Infinity) ? action : best
      , entries[0][0]);

    return {
      totalActions: entries.length,
      avgSuccessRate,
      avgScore,
      mostReliable,
      fastest,
    };
  }

  /**
   * 💾 SAUVEGARDE MÉMOIRE
   */

  private async saveMemory() {
    if (this.config.useSupabase && this.userId && this.supabase) {
      try {
        await this.supabase
          .from('ai_learning_memory')
          .upsert({
            user_id: this.userId,
            metrics: this.metrics,
            updated_at: new Date().toISOString(),
          });
      } catch (error) {
        console.error('[SelfLearningLite] Erreur sauvegarde Supabase:', error);
        // Fallback localStorage
        this.saveToLocalStorage();
      }
    } else {
      this.saveToLocalStorage();
    }
  }

  public saveToLocalStorage() {
    try {
      // Note: Dans React Native, remplacer par AsyncStorage
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('aviprod_ai_memory', JSON.stringify(this.metrics));
      }
    } catch (error) {
      console.error('[SelfLearningLite] Erreur sauvegarde locale:', error);
    }
  }

  /**
   * 📂 CHARGEMENT MÉMOIRE
   */

  private async loadMemory() {
    if (this.config.useSupabase && this.userId && this.supabase) {
      try {
        const { data, error } = await this.supabase
          .from('ai_learning_memory')
          .select('metrics')
          .eq('user_id', this.userId)
          .single();

        if (!error && data) {
          this.metrics = data.metrics;
          console.log('[SelfLearningLite] Mémoire chargée depuis Supabase');
          return;
        }
      } catch (error) {
        console.error('[SelfLearningLite] Erreur chargement Supabase:', error);
      }
    }

    // Fallback localStorage
    this.loadFromLocalStorage();
  }

  public loadFromLocalStorage() {
    try {
      if (typeof localStorage !== 'undefined') {
        const data = localStorage.getItem('aviprod_ai_memory');
        if (data) {
          this.metrics = JSON.parse(data);
          console.log('[SelfLearningLite] Mémoire chargée depuis localStorage');
        }
      }
    } catch (error) {
      console.error('[SelfLearningLite] Erreur chargement local:', error);
    }
  }

  /**
   * 🔄 RÉINITIALISATION
   */

  public reset() {
    this.metrics = {};
    this.saveMemory();
    console.log('[SelfLearningLite] Mémoire réinitialisée');
  }

  public resetAction(action: string) {
    delete this.metrics[action];
    this.saveMemory();
    console.log(`[SelfLearningLite] Action ${action} réinitialisée`);
  }

  /**
   * 🔍 ACCÈS AUX MÉTRIQUES
   */

  public getMetrics(): Record<string, Metric> {
    return this.metrics;
  }

  public getActionMetric(action: string): Metric | null {
    return this.metrics[action] || null;
  }

  /**
   * ⚙️ CONFIGURATION
   */

  public updateConfig(config: Partial<LearningConfig>) {
    this.config = { ...this.config, ...config };
  }

  public getConfig(): LearningConfig {
    return this.config;
  }
}

// Export singleton
export const selfLearningLite = SelfLearningEngineLite.getInstance();

// Hook React
export const useSelfLearningLite = () => {
  return {
    learn: (result: ActionResult) => selfLearningLite.learn(result),
    chooseBestAction: (actions: string[], context?: Record<string, any>) =>
      selfLearningLite.chooseBestAction(actions, context),
    getTopActions: (n?: number) => selfLearningLite.getTopActions(n),
    compareActions: (action1: string, action2: string) =>
      selfLearningLite.compareActions(action1, action2),
    getGlobalStats: () => selfLearningLite.getGlobalStats(),
    getMetrics: () => selfLearningLite.getMetrics(),
    reset: () => selfLearningLite.reset(),
  };
};