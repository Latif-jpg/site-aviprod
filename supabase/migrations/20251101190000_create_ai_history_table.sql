-- =================================================================
-- MIGRATION: Create AI Health Analyses Table and Policies
--
-- Problème: L'historique des analyses IA ne s'affiche pas car la table
-- `ai_health_analyses` ou ses politiques de sécurité (RLS) sont manquantes.
--
-- Solution: Ce script crée la table, active RLS, et définit les politiques
-- pour permettre aux utilisateurs de sauvegarder et de consulter leurs
-- propres analyses.
-- =================================================================

-- 1. Créer la table pour stocker l'historique des analyses
CREATE TABLE IF NOT EXISTS public.ai_health_analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    lot_id TEXT,
    images TEXT[],
    symptoms TEXT[],
    description TEXT,
    diagnosis TEXT,
    confidence INTEGER, -- Le score de confiance de l'IA
    treatment_plan TEXT,
    recommended_products JSONB,
    cache_key TEXT UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Activer la sécurité au niveau des lignes (RLS)
-- C'est une étape de sécurité cruciale.
ALTER TABLE public.ai_health_analyses ENABLE ROW LEVEL SECURITY;

-- 3. Créer les politiques RLS

-- Politique pour la LECTURE (SELECT)
DROP POLICY IF EXISTS "Users can view their own analyses" ON public.ai_health_analyses;
CREATE POLICY "Users can view their own analyses"
ON public.ai_health_analyses FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Politique pour l'ÉCRITURE (INSERT)
DROP POLICY IF EXISTS "Users can create their own analyses" ON public.ai_health_analyses;
CREATE POLICY "Users can create their own analyses"
ON public.ai_health_analyses FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Politique pour le SERVICE_ROLE (pour les fonctions serveur comme check_usage_limit)
DROP POLICY IF EXISTS "Service role can read all analyses" ON public.ai_health_analyses;
CREATE POLICY "Service role can read all analyses"
ON public.ai_health_analyses FOR SELECT
TO service_role
USING (true);