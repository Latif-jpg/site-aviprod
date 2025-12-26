-- MIGRATION: Supprime la fonction RPC surchargée et obsolète 'get_dashboard_financial_summary'
-- Problème: Il existe deux versions de la fonction 'get_dashboard_financial_summary',
-- ce qui crée une ambiguïté ('PGRST203') lors de l'appel depuis le client.
-- Une version (p_user_id uuid, p_reference timestamptz) semble être une version
-- de développement ou obsolète qui n'est plus dans le code source.
-- Solution: Supprimer explicitement la fonction surchargée qui accepte deux paramètres.

DROP FUNCTION IF EXISTS public.get_dashboard_financial_summary(uuid, timestamp with time zone);
