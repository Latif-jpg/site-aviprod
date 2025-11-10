-- MIGRATION: Met automatiquement hors ligne les livreurs inactifs.
-- Problème: Un livreur reste "en ligne" si l'application se ferme ou perd la connexion.
-- Solution:
-- 1. Activer l'extension pg_cron.
-- 2. Créer le rôle 'db_maintenance' s'il est manquant.
-- 3. Donner au rôle 'postgres' la permission de gérer le rôle 'db_maintenance'.
-- 4. Créer les fonctions de logique métier.
-- 5. Changer le propriétaire des fonctions pour 'db_maintenance'.
-- 6. Exécuter la fonction de planification.

-- Étape 1: Activer l'extension pg_cron.
-- Le script interne de Supabase qui s'exécute ici est la source du conflit de privilèges.
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- Étape 2: Créer le rôle 'db_maintenance' s'il n'existe pas.
-- C'est la correction clé pour résoudre les erreurs de permission.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'db_maintenance') THEN
    CREATE ROLE db_maintenance;
  END IF;
END $$;

-- Étape 3: Donner au rôle 'postgres' la permission de gérer 'db_maintenance'.
-- Cela permet à 'postgres' de changer le propriétaire des fonctions.
GRANT db_maintenance TO postgres;

-- Étape 4: Créer les fonctions de logique métier.
CREATE OR REPLACE FUNCTION public.update_stale_driver_status()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER AS $$
BEGIN
  SET search_path TO public, extensions; -- Correction: Utiliser 'TO' au lieu de '='.

  UPDATE public.livreur_verifications lv
  SET is_online = FALSE, updated_at = NOW()
  WHERE
    lv.is_online IS TRUE
    AND lv.verification_status = 'approved'
    AND lv.last_seen < (NOW() - INTERVAL '5 minutes')
    AND NOT EXISTS (
      SELECT 1 FROM public.deliveries d
      WHERE d.driver_id = lv.id
        AND d.status IN ('accepted', 'picked_up', 'in_transit')
    );
END;
$$;

-- Créer la fonction helper pour planifier la tâche.
-- On utilise une fonction helper pour gérer la création/mise à jour du job de manière idempotente.
CREATE OR REPLACE FUNCTION public.schedule_stale_driver_check()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER AS $$
BEGIN
  SET search_path TO public, extensions; -- Correction: Utiliser 'TO' au lieu de '='.
  
  -- Supprime le job existant pour garantir une configuration propre.
  DELETE FROM cron.job WHERE jobname = 'update-stale-drivers';
  
  -- Insère le nouveau job.
  INSERT INTO cron.job (jobname, schedule, command)
  VALUES (
      'update-stale-drivers',
      '*/5 * * * *',
      'SELECT public.update_stale_driver_status()'
  );
END;
$$;

-- Étape 5: Changer le propriétaire des fonctions pour 'db_maintenance'.
-- C'est la pratique recommandée par Supabase pour les fonctions interagissant avec pg_cron.
-- Cela évite les conflits de permissions.
ALTER FUNCTION public.update_stale_driver_status() OWNER TO db_maintenance;
ALTER FUNCTION public.schedule_stale_driver_check() OWNER TO db_maintenance;

-- Étape 6: Exécuter la fonction helper pour créer la tâche cron.
SELECT public.schedule_stale_driver_check();
