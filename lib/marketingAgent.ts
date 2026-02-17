// lib/marketingAgent.ts
// Moteur IA marketing pour Aviprod Market

export type Product = {
  id: string
  name: string
  price?: number
  zone?: string
  is_sponsored?: boolean
  boost_level?: number
  sponsor_end_date?: string | null
  image?: string
  category?: string
  description?: string
  location?: string
  city?: string
  region?: string
  country?: string
  in_stock?: boolean
  rating?: number
  seller_id?: string
  farm_name?: string
  is_on_sale?: boolean
  discount_percentage?: number
}

export type UserProfile = {
  id?: string
  zone?: string
  farmType?: string
  purchaseHistory?: { productId: string; count: number }[]
}

export type AgentContext = {
  profile: UserProfile;
  health?: {
    score: number;
    alerts: string;
  };
  finance?: {
    profitMargin: number;
  };
}

/**
 * marketingAgent : renvoie une liste triée des produits sponsorisés les plus pertinents.
 * - Utilise un système de scoring basé sur le contexte (santé, finance, profil).
 */
export function marketingAgent(context: AgentContext, products: Product[], maxResults = 4): Product[] {
  const now = new Date()

  // 1. Filtrer les produits pertinents (sponsorisés, en stock, etc.)
  const relevantProducts = (products || []).filter(
    (p) =>
      p.in_stock &&
      (!p.sponsor_end_date || new Date(p.sponsor_end_date) > now)
  )

  // 2. Calcul du score de pertinence pour chaque produit
  const scored = relevantProducts.map((p) => {
    let score = 0

    // --- Critères de Scoring ---

    // Priorité 1: Santé critique (Score x3)
    if (context.health && context.health.score < 60 && ['Médicaments', 'Santé', 'Vitamines'].includes(p.category || '')) {
      score += 100;
    }

    // Priorité 2: Optimisation financière (Score x2)
    if (context.finance && context.finance.profitMargin < 10 && ['Alimentation économique', 'Additifs'].includes(p.category || '')) {
      score += 50;
    }

    // Bonus: Promotions
    if (p.is_on_sale) {
      score += 25;
    }

    // Bonus: Sponsoring et Boost
    if (p.is_sponsored) {
      score += 15 + ((p.boost_level || 0) * 5);
    }

    // Bonus: Proximité géographique
    if (context.profile?.zone && p.zone && context.profile.zone === p.zone) score += 10

    // Petit facteur aléatoire pour dé-prioriser les produits avec un score de 0
    if (score > 0) score += Math.random() * 5

    return { ...p, _score: score }
  })
  const sorted = scored.sort((a, b) => b._score - a._score)

  // 3. Retourner les N meilleurs résultats
  return sorted.slice(0, maxResults)
}