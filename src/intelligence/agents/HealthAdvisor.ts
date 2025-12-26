// src/intelligence/agents/HealthAdvisor.ts
// --- CORRECTION : Utiliser une seule instance de Supabase ---
import { supabase } from '../../../config';

import { smartAlertSystem } from '../core/SmartAlertSystem';
import { dataCollector } from '../core/DataCollector';

/**
 * HEALTH ADVISOR AGENT
 *
 * Agent IA spécialisé dans l'analyse de santé animale:
 * - Analyse prédictive des maladies basée sur les symptômes
 * - Suivi des tendances de santé par lot
 * - Recommandations de prévention et traitement
 * - Apprentissage des patterns de maladie
 * - Intégration avec les analyses IA externes
 */

// ==================== TYPES ====================

interface HealthAnalysis {
  diagnosis: string;
  confidence_score: number;
  severity_level: 'low' | 'medium' | 'high' | 'critical';
  treatment_plan: string[];
  preventive_measures: string[];
  risk_factors: string[];
  recommended_monitoring: string[];
}

interface HealthTrend {
  lot_id: string;
  period: string;
  mortality_rate: number;
  symptom_frequency: Record<string, number>;
  health_score: number; // 0-100, 100 = parfaite santé
  trend_direction: 'improving' | 'stable' | 'declining';
  risk_indicators: string[];
}

interface DiseasePrediction {
  disease_name: string;
  probability: number;
  incubation_period_days: number;
  symptoms_to_watch: string[];
  preventive_actions: string[];
  estimated_cost_impact: number;
}

interface HealthRecommendation {
  type: 'treatment' | 'prevention' | 'monitoring' | 'vaccination';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  title: string;
  description: string;
  estimated_cost: number;
  expected_benefit: string;
  implementation_steps: string[];
}

// ==================== DONNÉES DE RÉFÉRENCE ====================

const DISEASE_PATTERNS: Record<string, {
  symptoms: string[];
  risk_factors: string[];
  treatment: string[];
  prevention: string[];
  incubation_days: number;
  mortality_risk: 'low' | 'medium' | 'high' | 'critical';
}> = {
  'coccidiose': {
    symptoms: ['diarrhée', 'sang dans selles', 'léthargie', 'perte appétit'],
    risk_factors: ['humidité élevée', 'surpeuplement', 'mauvaise hygiène'],
    treatment: ['Anticoccidiens (Toltrazuril, Diclazuril)', 'Électrolyte en eau', 'Probiotiques'],
    prevention: ['Vaccination coccidiose', 'Désinfection régulière', 'Contrôle humidité'],
    incubation_days: 4-7,
    mortality_risk: 'high'
  },
  'newcastle': {
    symptoms: ['toux', 'respiration difficile', 'diarrhée verte', 'tremblements'],
    risk_factors: ['contact oiseaux sauvages', 'stress', 'mauvaise ventilation'],
    treatment: ['Vaccin ND', 'Antibiotiques si bactérien secondaire', 'Soutien nutritionnel'],
    prevention: ['Vaccination systématique', 'Biosécurité stricte', 'Isolement nouveaux arrivants'],
    incubation_days: 2-15,
    mortality_risk: 'high'
  },
  'grippe_aviaire': {
    symptoms: ['respiration difficile', 'œdème tête', 'diarrhée', 'baisse ponte'],
    risk_factors: ['contact oiseaux migrateurs', 'eau contaminée', 'stress'],
    treatment: ['Aucun traitement curatif', 'Mesures d\'urgence', 'Élimination du lot'],
    prevention: ['Vaccination si autorisée', 'Surveillance syndromique', 'Biosécurité maximale'],
    incubation_days: 3-5,
    mortality_risk: 'critical'
  },
  'salmonellose': {
    symptoms: ['diarrhée', 'léthargie', 'déshydratation', 'perte poids'],
    risk_factors: ['alimentation contaminée', 'eau souillée', 'stress thermique'],
    treatment: ['Antibiotiques (Fluoroquinolones)', 'Réhydratation', 'Probiotiques'],
    prevention: ['Hygiène alimentaire', 'Contrôle qualité eau', 'Vaccination'],
    incubation_days: 1-3,
    mortality_risk: 'medium'
  }
};

// ==================== CLASSE PRINCIPALE ====================

class HealthAdvisor {
  private static instance: HealthAdvisor;

  private constructor() {}

  public static getInstance(): HealthAdvisor {
    if (!HealthAdvisor.instance) {
      HealthAdvisor.instance = new HealthAdvisor();
    }
    return HealthAdvisor.instance;
  }

  /**
   * ANALYSE DE SANTÉ COMPLÈTE
   */
  public async analyzeHealth(
    symptoms: string[],
    description: string,
    images: string[] = [],
    lotId?: string,
    userId?: string
  ): Promise<HealthAnalysis | null> {
    try {
      // 1. Analyse basée sur les symptômes
      const symptomAnalysis = this.analyzeSymptoms(symptoms, description);

      // 2. Analyse d'images si disponibles (via fonction Supabase)
      let imageAnalysis = null;
      if (images.length > 0) {
        imageAnalysis = await this.analyzeImages(images, description, symptoms);
      }

      // 3. Analyse contextuelle du lot si disponible
      let lotContext = null;
      if (lotId && userId) {
        lotContext = await this.getLotHealthContext(lotId, userId);
      }

      // 4. Fusionner les analyses
      const finalAnalysis = this.fuseAnalyses(symptomAnalysis, imageAnalysis, lotContext);

      // 5. Générer recommandations
      const recommendations = await this.generateHealthRecommendations(finalAnalysis, lotId);

      // 6. Créer alertes si nécessaire
      if (lotId && finalAnalysis.severity_level !== 'low') {
        await this.generateHealthAlerts(finalAnalysis, lotId);
      }

      // 7. Sauvegarder pour apprentissage
      await this.saveHealthAnalysis(finalAnalysis, symptoms, description, lotId);

      return finalAnalysis;
    } catch (error) {
      console.error('[HealthAdvisor] Erreur analyse santé:', error);
      dataCollector.trackError(error as Error, { symptoms: symptoms.length, hasImages: images.length > 0 });
      return null;
    }
  }

  /**
   * ANALYSE DES TENDANCES DE SANTÉ PAR LOT
   */
  public async analyzeHealthTrends(
    lotId: string,
    userId: string,
    period: 'week' | 'month' = 'month'
  ): Promise<HealthTrend | null> {
    try {
      // Récupérer données de santé du lot
      const healthData = await this.getLotHealthData(lotId, period);

      // Calculer tendances
      const trend = this.calculateHealthTrend(healthData, period);

      // Générer alertes si tendance préoccupante
      if (trend.health_score < 70 || trend.trend_direction === 'declining') {
        await smartAlertSystem.createAlert({
          type: 'lot_health_trend' as any,
          context: {
            lot_id: lotId,
            health_score: trend.health_score,
            trend: trend.trend_direction,
            risk_indicators: trend.risk_indicators.join(', ')
          },
          relatedEntityType: 'lot',
          relatedEntityId: lotId,
        });
      }

      return trend;
    } catch (error) {
      console.error('[HealthAdvisor] Erreur analyse tendances:', error);
      return null;
    }
  }

  /**
   * PRÉDICTIONS DE MALADIES
   */
  public async predictDiseases(lotId: string, userId: string): Promise<DiseasePrediction[]> {
    try {
      // Récupérer historique et conditions actuelles
      const lotData = await this.getLotData(lotId);
      const healthHistory = await this.getHealthHistory(lotId, userId);
      const environmentalFactors = await this.getEnvironmentalFactors(userId);

      // Calculer probabilités de maladie
      const predictions = this.calculateDiseaseProbabilities(
        lotData,
        healthHistory,
        environmentalFactors
      );

      // Filtrer les prédictions significatives (>8% probabilité pour plus de visibilité)
      return predictions.filter(p => p.probability > 0.08);
    } catch (error) {
      console.error('[HealthAdvisor] Erreur prédiction maladies:', error);
      return [];
    }
  }

  // ==================== MÉTHODES D'ANALYSE ====================

  private analyzeSymptoms(symptoms: string[], description: string): Partial<HealthAnalysis> {
    const symptomText = [...symptoms, description.toLowerCase()].join(' ');

    // Recherche de patterns de maladie
    let bestMatch = { disease: '', score: 0, pattern: DISEASE_PATTERNS['coccidiose'] };

    for (const [disease, pattern] of Object.entries(DISEASE_PATTERNS)) {
      let score = 0;

      // Score basé sur les symptômes
      pattern.symptoms.forEach(symptom => {
        if (symptomText.includes(symptom.toLowerCase())) {
          score += 2; // Symptôme exact = +2
        }
      });

      // Score basé sur les mots-clés dans la description
      const descriptionWords = description.toLowerCase().split(' ');
      pattern.symptoms.forEach(symptom => {
        descriptionWords.forEach(word => {
          if (symptom.includes(word) || word.includes(symptom)) {
            score += 1; // Mot partiellement matching = +1
          }
        });
      });

      if (score > bestMatch.score) {
        bestMatch = { disease, score, pattern };
      }
    }

    // Calculer niveau de sévérité
    const severity = this.calculateSeverity(bestMatch.score, symptoms.length);

    return {
      diagnosis: bestMatch.disease || 'symptômes non spécifiques',
      confidence_score: Math.min(bestMatch.score * 10, 95), // Max 95%
      severity_level: severity,
      risk_factors: bestMatch.pattern?.risk_factors || [],
      treatment_plan: bestMatch.pattern?.treatment || ['Consultez un vétérinaire'],
      preventive_measures: bestMatch.pattern?.prevention || []
    };
  }

  private async analyzeImages(images: string[], description: string, symptoms: string[]): Promise<Partial<HealthAnalysis> | null> {
    try {
      // Utiliser la fonction Supabase existante pour l'analyse d'images
      const { data, error } = await supabase.functions.invoke('gemini-health-analysis', {
        body: {
          images: images.map(uri => uri), // Les images sont déjà en base64
          description,
          symptoms,
        },
      });

      if (error) throw error;

      return {
        diagnosis: data.diagnosis || 'analyse image inconclusive',
        confidence_score: data.confidence || 50,
        severity_level: this.mapConfidenceToSeverity(data.confidence || 50),
        treatment_plan: data.treatmentPlan ? [data.treatmentPlan] : [],
      };
    } catch (error) {
      console.error('[HealthAdvisor] Erreur analyse images:', error);
      return null;
    }
  }

  private async getLotHealthContext(lotId: string, userId: string): Promise<any> {
    // Récupérer données récentes du lot
    const { data: lot } = await supabase
      .from('lots')
      .select('*')
      .eq('id', lotId)
      .single();

    // Récupérer mortalité récente
    const { data: mortalityData } = await supabase
      .from('daily_updates')
      .select('mortalite, date')
      .eq('lot_id', lotId)
      .gte('date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .order('date', { ascending: false });

    return {
      lot,
      recentMortality: mortalityData || [],
      avgMortality: mortalityData ? mortalityData.reduce((sum: number, d: any) => sum + (d.mortalite || 0), 0) / mortalityData.length : 0
    };
  }

  private fuseAnalyses(
    symptomAnalysis: Partial<HealthAnalysis>,
    imageAnalysis: Partial<HealthAnalysis> | null,
    lotContext: any
  ): HealthAnalysis {
    // Fusion intelligente des analyses
    let finalDiagnosis = symptomAnalysis.diagnosis || 'analyse inconclusive';
    let finalConfidence = symptomAnalysis.confidence_score || 0;
    let finalSeverity = symptomAnalysis.severity_level || 'low';

    // Si analyse d'image disponible, la combiner
    if (imageAnalysis) {
      // Moyenne pondérée (symptômes 60%, image 40%)
      finalConfidence = Math.round((finalConfidence * 0.6) + ((imageAnalysis.confidence_score || 0) * 0.4));

      // Prendre le diagnostic le plus confiant
      if ((imageAnalysis.confidence_score || 0) > finalConfidence) {
        finalDiagnosis = imageAnalysis.diagnosis || finalDiagnosis;
      }

      // Prendre la sévérité la plus élevée
      if (this.severityToNumber(imageAnalysis.severity_level || 'low') > this.severityToNumber(finalSeverity)) {
        finalSeverity = imageAnalysis.severity_level || finalSeverity;
      }
    }

    // Ajuster selon le contexte du lot
    if (lotContext && lotContext.avgMortality > 5) {
      finalSeverity = this.escalateSeverity(finalSeverity);
      finalDiagnosis += ' (contexte lot préoccupant)';
    }

    return {
      diagnosis: finalDiagnosis,
      confidence_score: finalConfidence,
      severity_level: finalSeverity,
      treatment_plan: symptomAnalysis.treatment_plan || [],
      preventive_measures: symptomAnalysis.preventive_measures || [],
      risk_factors: symptomAnalysis.risk_factors || [],
      recommended_monitoring: this.generateMonitoringRecommendations(finalSeverity)
    };
  }

  private async generateHealthRecommendations(
    analysis: HealthAnalysis,
    lotId?: string
  ): Promise<HealthRecommendation[]> {
    const recommendations: HealthRecommendation[] = [];

    // Recommandations de traitement
    if (analysis.severity_level !== 'low') {
      recommendations.push({
        type: 'treatment',
        priority: analysis.severity_level === 'critical' ? 'urgent' : 'high',
        title: 'Traitement immédiat requis',
        description: `Appliquer le protocole de traitement pour ${analysis.diagnosis}`,
        estimated_cost: this.estimateTreatmentCost(analysis.diagnosis),
        expected_benefit: 'Récupération rapide et réduction de la mortalité',
        implementation_steps: analysis.treatment_plan
      });
    }

    // Recommandations préventives
    analysis.preventive_measures.forEach(measure => {
      recommendations.push({
        type: 'prevention',
        priority: 'medium',
        title: 'Mesure préventive',
        description: measure,
        estimated_cost: 0, // Coûts préventifs souvent faibles
        expected_benefit: 'Réduction du risque de récidive',
        implementation_steps: [measure]
      });
    });

    // Recommandations de surveillance
    recommendations.push({
      type: 'monitoring',
      priority: 'medium',
      title: 'Surveillance accrue',
      description: 'Monitorer attentivement les signes de détérioration',
      estimated_cost: 0,
      expected_benefit: 'Détection précoce des complications',
      implementation_steps: analysis.recommended_monitoring
    });

    return recommendations;
  }

  private async generateHealthAlerts(analysis: HealthAnalysis, lotId: string) {
    const alerts: Promise<any>[] = [];

    if (analysis.severity_level === 'critical') {
      alerts.push(
        smartAlertSystem.alertCriticalHealthIssue(
          lotId,
          analysis.diagnosis,
          analysis.confidence_score
        )
      );
    } else if (analysis.severity_level === 'high') {
      alerts.push(
        smartAlertSystem.createAlert({
          type: 'lot_health_issue' as any,
          context: {
            lot_id: lotId,
            diagnosis: analysis.diagnosis,
            severity: analysis.severity_level,
            confidence: analysis.confidence_score
          },
          relatedEntityType: 'lot',
          relatedEntityId: lotId,
        })
      );
    }

    await Promise.all(alerts);
  }

  private async saveHealthAnalysis(
    analysis: HealthAnalysis,
    symptoms: string[],
    description: string,
    lotId?: string
  ) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from('ai_health_analyses').insert({
        user_id: user.id,
        lot_id: lotId,
        symptoms: symptoms,
        description: description,
        diagnosis: analysis.diagnosis,
        confidence_score: analysis.confidence_score,
        severity_level: analysis.severity_level,
        treatment_plan: analysis.treatment_plan,
        preventive_measures: analysis.preventive_measures,
        risk_factors: analysis.risk_factors,
        recommended_monitoring: analysis.recommended_monitoring,
        created_at: new Date().toISOString()
      });
    } catch (error) {
      console.error('[HealthAdvisor] Erreur sauvegarde analyse:', error);
    }
  }

  // ==================== MÉTHODES UTILITAIRES ====================

  private calculateSeverity(score: number, symptomCount: number): HealthAnalysis['severity_level'] {
    if (score >= 8 || symptomCount >= 4) return 'critical';
    if (score >= 6 || symptomCount >= 3) return 'high';
    if (score >= 4 || symptomCount >= 2) return 'medium';
    return 'low';
  }

  private mapConfidenceToSeverity(confidence: number): HealthAnalysis['severity_level'] {
    if (confidence >= 80) return 'high';
    if (confidence >= 60) return 'medium';
    return 'low';
  }

  private severityToNumber(severity: string): number {
    const map = { low: 1, medium: 2, high: 3, critical: 4 };
    return map[severity as keyof typeof map] || 1;
  }

  private escalateSeverity(severity: HealthAnalysis['severity_level']): HealthAnalysis['severity_level'] {
    if (severity === 'low') return 'medium';
    if (severity === 'medium') return 'high';
    if (severity === 'high') return 'critical';
    return severity;
  }

  private generateMonitoringRecommendations(severity: HealthAnalysis['severity_level']): string[] {
    const baseMonitoring = [
      'Contrôler la mortalité quotidienne',
      'Observer les comportements alimentaires',
      'Vérifier les signes cliniques'
    ];

    if (severity === 'high' || severity === 'critical') {
      baseMonitoring.push(
        'Isoler les animaux suspects',
        'Augmenter la fréquence des observations',
        'Préparer un plan d\'urgence vétérinaire'
      );
    }

    return baseMonitoring;
  }

  private estimateTreatmentCost(diagnosis: string): number {
    const costMap: Record<string, number> = {
      'coccidiose': 15000,
      'newcastle': 25000,
      'grippe_aviaire': 50000,
      'salmonellose': 20000
    };
    return costMap[diagnosis.toLowerCase()] || 10000;
  }

  private async getLotHealthData(lotId: string, period: HealthTrend['period']): Promise<any[]> {
    const days = period === 'week' ? 7 : 30;
    const { data } = await supabase
      .from('daily_updates')
      .select('*')
      .eq('lot_id', lotId)
      .gte('date', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
      .order('date', { ascending: true });

    return data || [];
  }

  private calculateHealthTrend(healthData: any[], period: HealthTrend['period']): HealthTrend {
    if (healthData.length === 0) {
      return {
        lot_id: '',
        period,
        mortality_rate: 0,
        symptom_frequency: {},
        health_score: 100,
        trend_direction: 'stable',
        risk_indicators: []
      };
    }

    const avgMortality = healthData.reduce((sum, d) => sum + (d.mortalite || 0), 0) / healthData.length;
    const symptomFreq: Record<string, number> = {};

    // Analyser les symptômes mentionnés
    healthData.forEach(day => {
      if (day.symptoms) {
        day.symptoms.forEach((symptom: string) => {
          symptomFreq[symptom] = (symptomFreq[symptom] || 0) + 1;
        });
      }
    });

    // Calculer score de santé (100 = parfait)
    let healthScore = 100;
    healthScore -= avgMortality * 2; // -2 points par % de mortalité
    healthScore -= Object.keys(symptomFreq).length * 5; // -5 points par type de symptôme

    // Déterminer tendance
    const firstHalf = healthData.slice(0, Math.floor(healthData.length / 2));
    const secondHalf = healthData.slice(Math.floor(healthData.length / 2));

    const firstHalfMortality = firstHalf.reduce((sum, d) => sum + (d.mortalite || 0), 0) / firstHalf.length;
    const secondHalfMortality = secondHalf.reduce((sum, d) => sum + (d.mortalite || 0), 0) / secondHalf.length;

    let trend: HealthTrend['trend_direction'] = 'stable';
    if (secondHalfMortality > firstHalfMortality + 1) trend = 'declining';
    if (secondHalfMortality < firstHalfMortality - 1) trend = 'improving';

    // Indicateurs de risque
    const riskIndicators: string[] = [];
    if (avgMortality > 5) riskIndicators.push('Mortalité élevée');
    if (Object.keys(symptomFreq).length > 3) riskIndicators.push('Multiples symptômes');
    if (trend === 'declining') riskIndicators.push('Tendance à la baisse');

    return {
      lot_id: healthData[0]?.lot_id || '',
      period,
      mortality_rate: avgMortality,
      symptom_frequency: symptomFreq,
      health_score: Math.max(0, Math.min(100, healthScore)),
      trend_direction: trend,
      risk_indicators: riskIndicators
    };
  }

  private async getLotData(lotId: string): Promise<any> {
    const { data } = await supabase
      .from('lots')
      .select('*')
      .eq('id', lotId)
      .single();

    return data;
  }

  private async getHealthHistory(lotId: string, userId: string): Promise<any[]> {
    const { data } = await supabase
      .from('ai_health_analyses')
      .select('*')
      .eq('lot_id', lotId)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    return data || [];
  }

  private async getEnvironmentalFactors(userId: string): Promise<any> {
    // Récupérer des données réelles si possible, sinon valeurs par défaut
    try {
      // Essayer de récupérer des données météo ou régionales depuis la base
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('region, location')
        .eq('id', userId)
        .single();

      // Déterminer la saison basée sur le mois actuel
      const currentMonth = new Date().getMonth() + 1; // 1-12
      const isRainySeason = [6, 7, 8, 9, 10].includes(currentMonth); // Juin à Octobre = saison des pluies en Afrique de l'Ouest

      return {
        region: userProfile?.region || 'afrique_ouest',
        season: isRainySeason ? 'saison_pluvieuse' : 'saison_seche',
        temperature: isRainySeason ? 25 : 32, // Plus frais en saison des pluies
        humidity: isRainySeason ? 75 : 45, // Plus humide en saison des pluies
        location: userProfile?.location
      };
    } catch (error) {
      console.warn('[HealthAdvisor] Erreur récupération facteurs environnementaux:', error);
      return this.getDefaultEnvironmentalFactors();
    }
  }

  private getDefaultEnvironmentalFactors(): any {
    const currentMonth = new Date().getMonth() + 1;
    const isRainySeason = [6, 7, 8, 9, 10].includes(currentMonth);

    return {
      region: 'afrique_ouest',
      season: isRainySeason ? 'saison_pluvieuse' : 'saison_seche',
      temperature: isRainySeason ? 25 : 32,
      humidity: isRainySeason ? 75 : 45
    };
  }

  private calculateDiseaseProbabilities(
    lotData: any,
    healthHistory: any[],
    environmentalFactors: any
  ): DiseasePrediction[] {
    const predictions: DiseasePrediction[] = [];

    // Facteurs de base selon l'environnement
    const environmentalMultiplier = this.getEnvironmentalRiskMultiplier(environmentalFactors);

    for (const [diseaseName, pattern] of Object.entries(DISEASE_PATTERNS)) {
      let probability = 0.05; // Probabilité de base très faible

      // Ajuster selon l'âge du lot (certaines maladies plus probables à certains âges)
      if (lotData?.age) {
        if (diseaseName === 'coccidiose' && lotData.age < 21) probability += 0.25; // 25% pour poussins
        if (diseaseName === 'newcastle' && lotData.age > 14) probability += 0.20; // 20% pour poulets plus âgés
        if (diseaseName === 'grippe_aviaire') probability += 0.10; // 10% risque de base
        if (diseaseName === 'salmonellose') probability += 0.15; // 15% risque de base
      }

      // Ajuster selon l'historique récent (beaucoup plus d'impact)
      const recentCases = healthHistory.filter(h =>
        h.diagnosis?.toLowerCase().includes(diseaseName) &&
        new Date(h.created_at) > new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
      ).length;

      if (recentCases > 0) probability += 0.40; // +40% si déjà eu la maladie récemment

      // Ajuster selon les conditions actuelles du lot
      if (lotData) {
        // Si mortalité élevée, augmenter les probabilités
        if (lotData.mortality_rate > 5) probability += 0.20;

        // Si beaucoup de symptômes, augmenter les probabilités
        if (lotData.symptom_count > 3) probability += 0.15;

        // Selon la saison et région
        if (environmentalFactors.season === 'saison_pluvieuse') {
          if (diseaseName === 'coccidiose') probability += 0.15;
          if (diseaseName === 'newcastle') probability += 0.10;
        }
      }

      // Multiplier par facteurs environnementaux
      probability *= environmentalMultiplier[diseaseName] || 1.0;

      // Assurer un minimum de visibilité pour les maladies importantes
      if (diseaseName === 'grippe_aviaire' && probability < 0.08) probability = 0.08;
      if (diseaseName === 'newcastle' && probability < 0.12) probability = 0.12;
      if (diseaseName === 'coccidiose' && probability < 0.15) probability = 0.15;

      // Calculer coût d'impact estimé
      const estimatedCost = this.estimateDiseaseCost(diseaseName, lotData?.quantity || 100);

      predictions.push({
        disease_name: diseaseName,
        probability: Math.min(probability, 0.95), // Max 95%
        incubation_period_days: pattern.incubation_days,
        symptoms_to_watch: pattern.symptoms,
        preventive_actions: pattern.prevention,
        estimated_cost_impact: estimatedCost
      });
    }

    return predictions.sort((a, b) => b.probability - a.probability);
  }

  private getEnvironmentalRiskMultiplier(env: any): Record<string, number> {
    const multipliers: Record<string, number> = {
      'coccidiose': env.humidity > 70 ? 1.5 : 1.0,
      'newcastle': env.season === 'saison_pluvieuse' ? 1.3 : 1.0,
      'grippe_aviaire': env.temperature < 15 ? 1.4 : 1.0,
      'salmonellose': env.humidity > 80 ? 1.2 : 1.0
    };
    return multipliers;
  }

  private estimateDiseaseCost(diseaseName: string, lotSize: number): number {
    const baseCosts: Record<string, number> = {
      'coccidiose': 500, // FCFA par animal
      'newcastle': 800,
      'grippe_aviaire': 2000,
      'salmonellose': 600
    };

    return (baseCosts[diseaseName] || 500) * lotSize;
  }
}

// ==================== WRAPPER POUR INTERFACE COMMUNE ====================

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

class HealthAdvisorWrapper implements IntelligenceAgent {
  private agent = HealthAdvisor.getInstance();

  async analyze(entityId: string): Promise<any> {
    // Pour analyse de santé, entityId peut être un lotId
    return await this.agent.analyzeHealthTrends(entityId, 'user_id_placeholder');
  }

  async getMetrics(): Promise<AgentMetrics> {
    return {
      total_analyses: 0,
      success_rate: 90,
      average_confidence: 75,
      alerts_generated: 0,
    };
  }

  isActive(): boolean {
    return true;
  }
}

// ==================== EXPORTS ====================

export const healthAdvisor = HealthAdvisor.getInstance();
export const healthAdvisorWrapper = new HealthAdvisorWrapper();

export const useHealthAdvisor = () => {
  return {
    analyzeHealth: (symptoms: string[], description: string, images?: string[], lotId?: string, userId?: string) =>
      healthAdvisor.analyzeHealth(symptoms, description, images, lotId, userId),
    analyzeHealthTrends: (lotId: string, userId: string, period?: 'week' | 'month') =>
      healthAdvisor.analyzeHealthTrends(lotId, userId, period),
    predictDiseases: (lotId: string, userId: string) =>
      healthAdvisor.predictDiseases(lotId, userId),
  };
};