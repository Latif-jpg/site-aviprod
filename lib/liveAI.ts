// lib/liveAI.ts
// Simple IA "heuristic" : fast on-device rules returning risk, causes, recommendations.

export type HealthSnapshot = {
  mortalityPct?: number;       // % mortalité quotidienne
  consumptionChangePct?: number; // % variation consommation (ex: -12)
  consumptionChangeReason?: 'low_ration' | 'low_stock' | 'low_profit' | 'good' | 'normal' | null;
  symptomCount?: number;      // nombre de symptômes rapportés
  lastVaccineDays?: number;   // jours depuis dernier vaccin
  stockPercent?: number;      // % stock sanitaire
}

export type AIResult = {
  riskScore: number; // 0..100
  level: 'ok' | 'warning' | 'critical';
  causes: string[];
  recommendations: { text: string; productId?: string; reason?: string }[];
}

// Heuristic model (on-device)
export function heuristicsModel(snapshot: HealthSnapshot): AIResult {
  const {
    mortalityPct = 0,
    consumptionChangePct = 0,
    consumptionChangeReason = null,
    symptomCount = 0,
    lastVaccineDays = 0,
    stockPercent = 100
  } = snapshot;

  let score = 30; // base (lower better)

  // mortality strongly influences score
  score += Math.min(50, mortalityPct * 25); // each % ~ +25 points cap
  // consumption drop influence
  if (consumptionChangePct < -5) score += Math.min(20, Math.abs(consumptionChangePct));
  // symptoms influence
  score += Math.min(15, symptomCount * 4);
  // overdue vaccine
  if (lastVaccineDays > 30) score += 8;
  // low stock
  if (stockPercent < 20) score += 7;

  score = Math.max(0, Math.min(100, Math.round(score)));

  const causes: string[] = [];
  if (mortalityPct > 1.2) causes.push('Mortalité élevée');
  if (consumptionChangePct < -10) causes.push('Consommation en forte baisse');
  if (symptomCount >= 2) causes.push('Plusieurs symptômes observés');
  if (lastVaccineDays > 30) causes.push('Vaccination dépassée');
  if (stockPercent < 20) causes.push('Stock sanitaire bas');

  const recommendations: AIResult['recommendations'] = [];
  if (mortalityPct > 1.2) recommendations.push({ text: 'Isoler sujets malades; contrôler eau & fourrage' });
  
  // --- Recommandations dynamiques basées sur la cause ---
  if (consumptionChangeReason === 'low_ration') {
    recommendations.push({ text: 'Définir des rations pour tous les lots pour optimiser l\'alimentation' });
  } else if (consumptionChangeReason === 'low_stock') {
    recommendations.push({ text: 'Le stock d\'aliments est bas, commander de nouvelles provisions', productId: 'feed_20kg' });
  } else if (consumptionChangeReason === 'low_profit') {
    recommendations.push({ text: 'Analyser les dépenses pour améliorer la qualité de l\'alimentation' });
  } else if (consumptionChangePct < -10) { // Fallback générique si la cause n'est pas identifiée
    recommendations.push({ text: 'Tester qualité de l’eau; vérifier composition de l’aliment' });
  }

  if (lastVaccineDays > 30) recommendations.push({ text: 'Programmer vaccination Gumboro', productId: 'vaccine_gumboro' });
  if (stockPercent < 20) recommendations.push({ text: 'Commander aliments & antibactériens', productId: 'feed_20kg' });

  const level = score >= 70 ? 'critical' : (score >= 40 ? 'warning' : 'ok');

  return { riskScore: score, level, causes, recommendations };
}

// Remote placeholder (if you want cloud)
export async function remotePredict(snapshot: HealthSnapshot, endpointUrl: string, apiKey?: string): Promise<AIResult> {
  try {
    const res = await fetch(endpointUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(apiKey ? { 'x-api-key': apiKey } : {}) },
      body: JSON.stringify({ snapshot })
    });
    if (!res.ok) throw new Error('AI API error ' + res.status);
    const json = await res.json();
    return json as AIResult;
  } catch (e) {
    console.warn('remotePredict failed, fallback to heuristic', e);
    return heuristicsModel(snapshot);
  }
}