-- Créer un trigger pour créer automatiquement les livraisons
CREATE OR REPLACE FUNCTION public.auto_create_delivery_on_order_ready()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Si la commande passe en 'ready' ET demande une livraison ET n'a pas de livraison
    IF NEW.status = 'ready' 
       AND NEW.delivery_requested = true 
       AND NOT EXISTS (
           SELECT 1 FROM public.deliveries WHERE order_id = NEW.id
       ) THEN
        
        INSERT INTO public.deliveries (
            order_id,
            status,
            pickup_location,
            delivery_location,
            delivery_fee,
            driver_id
        ) VALUES (
            NEW.id,
            'pending',
            NEW.pickup_address,
            NEW.delivery_address,
            NEW.delivery_fee,
            NULL
        );
        
        RAISE NOTICE '✅ Livraison automatiquement créée pour la commande %', NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Créer le trigger
DROP TRIGGER IF EXISTS auto_create_delivery ON public.orders;
CREATE TRIGGER auto_create_delivery
    AFTER UPDATE OF status ON public.orders
    FOR EACH ROW
    WHEN (NEW.status = 'ready')
    EXECUTE FUNCTION public.auto_create_delivery_on_order_ready();
