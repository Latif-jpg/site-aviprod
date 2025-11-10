-- =================================================================
-- MIGRATION: Backfill User Subscriptions
--
-- Problème: La table `user_subscriptions` est vide pour les utilisateurs
-- créés avant la mise en place du trigger `on_auth_user_created`.
--
-- Solution: Ce script parcourt tous les utilisateurs existants et leur
-- crée une souscription gratuite par défaut s'ils n'en ont pas.
-- Il s'assure également que chaque utilisateur a une entrée dans `user_avicoins`.
-- =================================================================

CREATE OR REPLACE FUNCTION public.backfill_missing_user_data()
RETURNS void AS $$
DECLARE
    user_record RECORD;
    free_plan_id UUID;
BEGIN
    -- 1. Récupérer l'ID du plan gratuit ('freemium')
    SELECT id INTO free_plan_id FROM public.subscription_plans WHERE name = 'freemium' LIMIT 1;

    IF free_plan_id IS NULL THEN
        RAISE EXCEPTION 'Plan "freemium" non trouvé. Le script de backfill ne peut pas continuer.';
    END IF;

    -- 2. Parcourir tous les utilisateurs de la table auth.users
    FOR user_record IN SELECT id FROM auth.users LOOP
        -- 3. Insérer une souscription gratuite si elle n'existe pas déjà
        INSERT INTO public.user_subscriptions (user_id, plan_id, subscription_type, status)
        VALUES (user_record.id, free_plan_id, 'free', 'active')
        ON CONFLICT (user_id) DO NOTHING;

        -- 4. Insérer un solde Avicoins par défaut s'il n'existe pas déjà
        INSERT INTO public.user_avicoins (user_id, balance, total_earned, total_spent)
        VALUES (user_record.id, 0, 0, 0)
        ON CONFLICT (user_id) DO NOTHING;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Exécuter la fonction pour effectuer le remplissage
SELECT public.backfill_missing_user_data();

-- Supprimer la fonction une fois l'opération terminée
DROP FUNCTION public.backfill_missing_user_data();