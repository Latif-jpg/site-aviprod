-- =================================================================
-- MIGRATION: Crée la fonction `get_my_claim` pour extraire les claims du JWT.
-- Problème: Les politiques RLS et les fonctions RPC utilisent `get_my_claim` qui n'existe pas.
-- Solution: Définir la fonction `get_my_claim` qui extrait une valeur textuelle d'un claim spécifique
--           dans les métadonnées de l'application du JWT de l'utilisateur.
-- =================================================================

CREATE OR REPLACE FUNCTION public.get_my_claim(claim_name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  _claim TEXT;
BEGIN
  SELECT auth.jwt() -> 'app_metadata' ->> claim_name INTO _claim;
  RETURN _claim;
END;
$$;

-- Accorder les droits d'exécution à tous les utilisateurs authentifiés
GRANT EXECUTE ON FUNCTION public.get_my_claim(TEXT) TO authenticated;