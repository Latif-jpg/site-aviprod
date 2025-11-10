-- Fonction encore plus robuste qui accepte du text et le convertit
DROP FUNCTION IF EXISTS public.confirm_order_with_pickup_info;
CREATE OR REPLACE FUNCTION public.confirm_order_with_pickup_info(
    p_order_id text,  -- Accepter text pour mieux gérer les erreurs
    p_pickup_address jsonb DEFAULT NULL,
    p_pickup_phone text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_order_id uuid;
BEGIN
    -- Validation basique
    IF p_order_id IS NULL OR p_order_id = 'undefined' OR p_order_id = 'null' THEN
        RAISE EXCEPTION 'Order ID cannot be null or undefined';
    END IF;

    -- Conversion en UUID avec gestion d'erreur
    BEGIN
        v_order_id := p_order_id::uuid;
    EXCEPTION WHEN others THEN
        RAISE EXCEPTION 'Invalid order ID format: %', p_order_id;
    END;

    -- Mettre à jour la commande
    UPDATE public.orders 
    SET 
        status = 'confirmed',
        pickup_address = p_pickup_address,
        pickup_phone = p_pickup_phone,
        updated_at = NOW()
    WHERE id = v_order_id;
    
    -- Vérifier si la mise à jour a fonctionné
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order not found: %', v_order_id;
    END IF;
    
    -- Log de succès
    RAISE NOTICE 'Order % confirmed successfully', v_order_id;
END;
$$;