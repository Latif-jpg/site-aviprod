-- Migration: Fix seller_orders_view to include delivery_fee and proper totals
-- Date: 2025-11-02
-- Description: Update the seller_orders_view to properly calculate totals and include delivery fees

DROP VIEW IF EXISTS public.seller_orders_view;
CREATE OR REPLACE VIEW public.seller_orders_view
WITH (security_invoker = true) AS
SELECT
    o.id,
    o.id AS order_id,
    o.buyer_id,
    o.seller_id,
    o.total_price AS items_total,
    COALESCE(o.delivery_fee, 0) AS delivery_fee,
    (o.total_price + COALESCE(o.delivery_fee, 0)) AS grand_total,
    o.status,
    o.created_at,
    o.updated_at,
    buyer_profile.full_name AS buyer_name,
    seller_profile.full_name AS seller_name,
    COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'product_id', oi.product_id,
                'quantity', oi.quantity,
                'price', mp.price,
                'product_name', mp.name,
                'image', mp.image
            )
        ) FILTER (WHERE oi.id IS NOT NULL),
        '[]'::jsonb
    ) AS items_summary
FROM public.orders o
LEFT JOIN public.profiles buyer_profile ON o.buyer_id = buyer_profile.user_id
LEFT JOIN public.profiles seller_profile ON o.seller_id = seller_profile.user_id
LEFT JOIN public.order_items oi ON o.id = oi.order_id
LEFT JOIN public.marketplace_products mp ON oi.product_id = mp.id
WHERE o.seller_id = auth.uid()
GROUP BY o.id, o.buyer_id, o.seller_id, o.total_price, o.delivery_fee, o.status, o.created_at, o.updated_at,
         buyer_profile.full_name, seller_profile.full_name;