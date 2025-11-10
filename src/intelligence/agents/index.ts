// src/intelligence/agents/index.ts
// Export de tous les agents d'intelligence

export { lotIntelligenceAgent, useLotIntelligence } from './LotIntelligenceAgent';
export { financialAdvisor, useFinancialAdvisor } from './FinancialAdvisor';
export { healthAdvisor, useHealthAdvisor } from './HealthAdvisor';
export { rationAdvisor, useRationAdvisor } from './RationAdvisor';

// Types communs aux agents
export interface AgentAnalysisResult {
  confidence: number;
  recommendations: string[];
  alerts_generated: number;
  timestamp: string;
}

export interface AgentMetrics {
  total_analyses: number;
  success_rate: number;
  average_confidence: number;
  alerts_generated: number;
}

// Interface commune pour tous les agents
export interface IntelligenceAgent {
  analyze(entityId: string): Promise<any>;
  getMetrics(): Promise<AgentMetrics>;
  isActive(): boolean;
}

// Factory pour créer des agents
export class AgentFactory {
  private static agents: Map<string, IntelligenceAgent> = new Map();

  static registerAgent(name: string, agent: IntelligenceAgent) {
    this.agents.set(name, agent);
  }

  static getAgent(name: string): IntelligenceAgent | undefined {
    return this.agents.get(name);
  }

  static getAllAgents(): Map<string, IntelligenceAgent> {
    return this.agents;
  }

  static getActiveAgents(): IntelligenceAgent[] {
    return Array.from(this.agents.values()).filter(agent => agent.isActive());
  }
}

// Enregistrement automatique des agents
import { lotIntelligenceAgent } from './LotIntelligenceAgent';

// Enregistrer les agents
import { lotIntelligenceAgentWrapper } from './LotIntelligenceAgent';
import { financialAdvisorWrapper } from './FinancialAdvisor';
import { healthAdvisorWrapper } from './HealthAdvisor';
import { rationAdvisorWrapper } from './RationAdvisor';

AgentFactory.registerAgent('lot', lotIntelligenceAgentWrapper);
AgentFactory.registerAgent('finance', financialAdvisorWrapper);
AgentFactory.registerAgent('health', healthAdvisorWrapper);
AgentFactory.registerAgent('ration', rationAdvisorWrapper);

// Fonction utilitaire pour analyser une entité avec l'agent approprié
export async function analyzeEntity(entityType: string, entityId: string) {
  const agent = AgentFactory.getAgent(entityType);
  if (!agent) {
    throw new Error(`Aucun agent trouvé pour le type d'entité: ${entityType}`);
  }

  return await agent.analyze(entityId);
}

// Fonction pour obtenir les métriques de tous les agents
export async function getAllAgentsMetrics() {
  const metrics: Record<string, AgentMetrics> = {};

  for (const [name, agent] of AgentFactory.getAllAgents()) {
    try {
      metrics[name] = await agent.getMetrics();
    } catch (error) {
      console.error(`Erreur récupération métriques agent ${name}:`, error);
      metrics[name] = {
        total_analyses: 0,
        success_rate: 0,
        average_confidence: 0,
        alerts_generated: 0,
      };
    }
  }

  return metrics;
}