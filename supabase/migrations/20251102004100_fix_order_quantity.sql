-- Migration: Fix order quantity constraint issue
-- Date: 2025-11-02
-- Description: Add quantity column to orders table and fix the null constraint error

-- Add quantity column to orders table if it doesn't exist
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS quantity integer;

-- Make quantity NOT NULL with default value of 1 for existing records
UPDATE public.orders SET quantity = 1 WHERE quantity IS NULL;
ALTER TABLE public.orders ALTER COLUMN quantity SET NOT NULL;
ALTER TABLE public.orders ALTER COLUMN quantity SET DEFAULT 1;

-- Update the RPC function to include quantity
CREATE OR REPLACE FUNCTION public.create_order_with_notification (
  p_buyer_id uuid,
  p_seller_id uuid,
  p_product_id uuid,
  p_quantity integer,
  p_total_price numeric,
  p_delivery_fee numeric,
  p_delivery_requested boolean,
  p_delivery_address jsonb,
  p_notification_type text,
  p_notification_title text,
  p_notification_message text,
  p_notification_data jsonb
)
RETURNS uuid -- Retourne l'ID de la nouvelle commande
LANGUAGE plpgsql VOLATILE
SECURITY DEFINER -- Important pour pouvoir insérer avec les droits du serveur
AS $$
DECLARE
  new_order_id uuid;
BEGIN
  -- Étape 1: Insérer la nouvelle commande
  INSERT INTO public.orders (
    buyer_id,
    seller_id,
    quantity,
    total_price,
    status,
    delivery_requested,
    delivery_address,
    delivery_fee
  ) VALUES (
    p_buyer_id,
    p_seller_id,
    p_quantity,
    p_total_price,
    'pending', -- Statut initial
    p_delivery_requested,
    p_delivery_address,
    p_delivery_fee
  ) RETURNING id INTO new_order_id;

  -- Étape 2: Créer une notification pour le vendeur
  INSERT INTO public.notifications (
    user_id,
    type,
    title,
    message,
    data
  ) VALUES (
    p_seller_id,
    p_notification_type,
    p_notification_title,
    p_notification_message,
    p_notification_data || jsonb_build_object('order_id', new_order_id)
  );

  -- Étape 3: Retourner l'ID de la commande créée
  RETURN new_order_id;
END;
$$;

-- Donner les droits d'exécution aux utilisateurs authentifiés
GRANT EXECUTE ON FUNCTION public.create_order_with_notification(uuid, uuid, uuid, integer, numeric, numeric, boolean, jsonb, text, text, text, jsonb) TO authenticated;