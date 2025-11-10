-- MIGRATION: Met automatiquement hors ligne les livreurs inactifs.
-- Problème: Un livreur reste "en ligne" si l'application se ferme ou perd la connexion.
-- Solution:
-- 1. Créer une fonction qui met à jour les livreurs dont le 'last_seen' est trop ancien.
-- 2. Planifier un cron job pour exécuter cette fonction toutes les 5 minutes.

-- 1. Créer la fonction pour mettre à jour les statuts.
CREATE OR REPLACE FUNCTION public.update_stale_driver_status()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER -- Important pour que le cron job ait les permissions nécessaires.
AS $$
BEGIN
  UPDATE public.profiles
  SET 
    is_online = FALSE
  WHERE 
    role = 'driver' -- Cible uniquement les livreurs
    AND is_online = TRUE -- Qui sont actuellement en ligne
    AND last_seen < (NOW() - INTERVAL '5 minutes') -- Et dont la dernière activité est > 5 minutes
    -- CONDITION CRUCIALE AJOUTÉE :
    -- Ne pas mettre hors ligne s'ils ont une livraison active.
    AND NOT EXISTS (
      SELECT 1
      FROM public.deliveries d
      JOIN public.livreur_verifications lv ON d.driver_id = lv.id
      WHERE lv.user_id = public.profiles.user_id
        AND d.status IN ('accepted', 'picked_up', 'in_transit')
    );
END;
$$;

-- 2. Planifier l'exécution de la fonction toutes les 5 minutes.
-- La chaîne '*/5 * * * *' est la syntaxe cron pour "toutes les 5 minutes".
-- Note: Si le job existe déjà, cette commande mettra à jour sa définition.
SELECT cron.schedule('update-stale-drivers', '*/5 * * * *', 'SELECT public.update_stale_driver_status()');