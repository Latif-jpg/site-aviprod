-- =================================================================
-- MIGRATION: Crée le système de gestion des plans de prophylaxie.
-- Problème: La logique de prophylaxie n'est pas appliquée et les dates sont invalides.
-- Solution:
-- 1. Créer une table `prophylaxis_plans` pour stocker les programmes de prophylaxie.
-- 2. Créer une fonction `get_prophylaxis_plan` pour calculer les dates des étapes.
-- =================================================================

-- ===========================================
-- 1. TABLE: prophylaxis_plans
-- Description: Stocke les programmes de prophylaxie sanitaire pour les lots.
-- ===========================================

CREATE TABLE IF NOT EXISTS public.prophylaxis_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    lot_id TEXT NOT NULL,
    start_date DATE NOT NULL,
    specie VARCHAR(50) NOT NULL DEFAULT 'poulet_de_chair', -- 'poulet_de_chair', 'pondeuse', etc.
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, lot_id)
);

COMMENT ON TABLE public.prophylaxis_plans IS 'Stocke les programmes de prophylaxie pour les lots d''élevage.';
COMMENT ON COLUMN public.prophylaxis_plans.lot_id IS 'Identifiant du lot (bande) concerné par le plan.';
COMMENT ON COLUMN public.prophylaxis_plans.start_date IS 'Date d''arrivée des sujets (Jour 1).';
COMMENT ON COLUMN public.prophylaxis_plans.specie IS 'Espèce de volaille pour adapter le programme.';

-- ===========================================
-- 2. RLS (ROW LEVEL SECURITY)
-- ===========================================

ALTER TABLE public.prophylaxis_plans ENABLE ROW LEVEL SECURITY; -- Ajout du point-virgule manquant

CREATE POLICY "Utilisateurs peuvent gérer leurs propres plans"
ON public.prophylaxis_plans
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id); -- Ajout du point-virgule manquant

-- ===========================================
-- 3. FONCTION: get_prophylaxis_plan(date)
-- Description: Retourne le calendrier de prophylaxie calculé.
-- ===========================================

CREATE OR REPLACE FUNCTION public.get_prophylaxis_plan(start_date DATE)
RETURNS JSONB
LANGUAGE plpgsql
IMMUTABLE -- La fonction retourne toujours le même résultat pour les mêmes arguments.
AS $$
DECLARE
    v_plan JSONB; -- Renommage de la variable pour éviter le conflit avec le mot-clé réservé "PLAN"
BEGIN
    -- Plan de prophylaxie sanitaire pour les poulets de chair
    -- Tâches de nettoyage, désinfection et biosécurité
    v_plan := jsonb_build_array(
        jsonb_build_object('day', 1,  'date', start_date + interval '0 day', 'title', 'Nettoyage et Désinfection Initiale', 'description', $string$Nettoyage complet des locaux et désinfection avant l'arrivée des poussins. Utiliser des désinfectants appropriés.$string$),
        jsonb_build_object('day', 3,  'date', start_date + interval '2 days', 'title', 'Contrôle de l\'Hygiène des Abreuvoirs', 'description', $string$Nettoyer et désinfecter tous les abreuvoirs. Vérifier le bon fonctionnement du système d'eau.$string$),
        jsonb_build_object('day', 7,  'date', start_date + interval '6 days', 'title', 'Nettoyage des Mangeoires', 'description', $string$Nettoyer et désinfecter les mangeoires. Retirer les résidus alimentaires et appliquer un désinfectant.$string$),
        jsonb_build_object('day', 14, 'date', start_date + interval '13 days', 'title', 'Désinfection Générale des Locaux', 'description', $string$Désinfection complète des sols, murs et équipements. Utiliser des produits adaptés à la volaille.$string$),
        jsonb_build_object('day', 21, 'date', start_date + interval '20 days', 'title', 'Contrôle des Conditions d\'Hygiène', 'description', $string$Inspection approfondie de l'hygiène générale. Nettoyer les zones critiques et renouveler la litière si nécessaire.$string$),
        jsonb_build_object('day', 28, 'date', start_date + interval '27 days', 'title', 'Nettoyage du Système de Ventilation', 'description', $string$Nettoyer les filtres et conduits de ventilation. Assurer une circulation d'air optimale.$string$),
        jsonb_build_object('day', 35, 'date', start_date + interval '34 days', 'title', 'Désinfection Finale Pré-Vente', 'description', $string$Désinfection complète avant la vente. Préparer les locaux pour le prochain lot.$string$)
    );

    RETURN v_plan;
END;
$$;

COMMENT ON FUNCTION public.get_prophylaxis_plan(start_date DATE) IS 'Calcule et retourne le calendrier de prophylaxie pour les poulets de chair en fonction de la date de démarrage.';

-- ===========================================
-- 4. PERMISSIONS
-- ===========================================

GRANT EXECUTE ON FUNCTION public.get_prophylaxis_plan(start_date DATE) TO authenticated;

-- ===========================================
-- 5. TRIGGER pour `updated_at`
-- ===========================================

CREATE OR REPLACE FUNCTION public.update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_prophylaxis_timestamp
BEFORE UPDATE ON public.prophylaxis_plans
FOR EACH ROW
EXECUTE PROCEDURE public.update_timestamp();