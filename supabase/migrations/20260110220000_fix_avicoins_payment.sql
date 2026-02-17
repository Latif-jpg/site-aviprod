-- Migration pour corriger le paiement par Avicoins via RPC
-- Créé le: 2026-01-10

-- Fonction RPC sécurisée pour payer avec des Avicoins
-- Cette fonction est appelée par l'Edge Function 'consume-avicoins'

-- SUPPRESSION PREALABLE des anciennes versions pour éviter les conflits de signature et de valeurs par défaut
DROP FUNCTION IF EXISTS public.pay_with_avicoins(uuid, text, integer);
DROP FUNCTION IF EXISTS public.pay_with_avicoins(uuid, text, integer, jsonb);

CREATE OR REPLACE FUNCTION public.pay_with_avicoins(
    p_user_id UUID,
    p_task_type TEXT,
    p_cost INTEGER,
    p_task_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER -- Exécuter avec les droits du créateur pour bypasser RLS si nécessaire
AS $$
DECLARE
    v_current_balance INTEGER;
BEGIN
    -- 1. Vérifier le solde actuel
    SELECT balance INTO v_current_balance
    FROM public.user_avicoins
    WHERE user_id = p_user_id;

    -- Si pas de solde trouvé, considérer comme 0
    IF v_current_balance IS NULL THEN
        v_current_balance := 0;
    END IF;

    -- 2. Vérifier si le solde est suffisant
    IF v_current_balance < p_cost THEN
        RETURN FALSE; -- Solde insuffisant
    END IF;

    -- 3. Effectuer le paiement (Insérer une transaction négative)
    -- Le trigger 'trigger_update_avicoins_balance' s'occupera de mettre à jour user_avicoins
    INSERT INTO public.avicoins_transactions (
        user_id,
        amount,
        transaction_type,
        description,
        reference_type,
        created_at
    ) VALUES (
        p_user_id,
        -p_cost, -- Montant négatif pour une dépense
        'spent',
        COALESCE(p_task_metadata->>'description', 'Paiement Avicoins: ' || p_task_type),
        p_task_type,
        NOW()
    );

    RETURN TRUE; -- Succès
EXCEPTION
    WHEN OTHERS THEN
        -- En cas d'erreur (ex: violation de contrainte), retourner faux ou lever l'erreur
        RAISE NOTICE 'Erreur lors du paiement avicoins: %', SQLERRM;
        RETURN FALSE;
END;
$$;

-- Accorder les permissions d'exécution
GRANT EXECUTE ON FUNCTION public.pay_with_avicoins TO authenticated;
GRANT EXECUTE ON FUNCTION public.pay_with_avicoins TO service_role;
