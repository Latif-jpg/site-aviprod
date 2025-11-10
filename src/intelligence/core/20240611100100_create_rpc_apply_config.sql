-- =================================================================
-- MIGRATION: Crée la fonction RPC pour appliquer les changements de configuration.
-- Problème: Le SelfLearningEngine a besoin d'un moyen sécurisé pour modifier la configuration.
-- Solution: Créer une fonction RPC `apply_config_change` qui utilise les droits `SECURITY DEFINER`.
-- =================================================================

CREATE OR REPLACE FUNCTION public.apply_config_change (
  p_key TEXT,
  p_value JSONB,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER -- Exécute avec les droits du créateur (postgres), contournant les RLS standards.
AS $$
BEGIN
  -- Vérifier que l'appelant est bien un administrateur (sécurité supplémentaire)
  -- Cette vérification est cruciale car SECURITY DEFINER est puissant.
  IF get_my_claim('role') != 'admin'::text THEN
    RAISE EXCEPTION 'Permission non accordée: Seuls les administrateurs peuvent modifier la configuration.';
  END IF;

  -- Insérer ou mettre à jour la clé de configuration
  INSERT INTO public.app_config (key, value, updated_at)
  VALUES (p_key, p_value, NOW())
  ON CONFLICT (key)
  DO UPDATE SET
    value = EXCLUDED.value,
    updated_at = NOW();
END;
$$;

-- Donner la permission d'exécuter cette fonction aux administrateurs (via le rôle `service_role` ou `authenticated` si la vérification interne est utilisée)
GRANT EXECUTE ON FUNCTION public.apply_config_change(TEXT, JSONB, JSONB) TO authenticated;