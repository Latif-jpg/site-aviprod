-- Migration: Fix available_deliveries_view to properly join with orders and order_items
-- Date: 2025-11-02
-- Description: Update the view to correctly aggregate order items and include seller/buyer names

DROP VIEW IF EXISTS public.available_deliveries_view;
CREATE OR REPLACE VIEW public.available_deliveries_view
WITH (security_invoker = true)
AS
SELECT
    d.id,
    d.order_id,
    d.status,
    d.pickup_location,
    d.delivery_location,
    d.estimated_delivery_time,
    d.created_at,
    -- Create order_details object with proper structure
    json_build_object(
        'total_amount', o.total_price,
        'buyer_id', o.buyer_id,
        'seller_id', o.seller_id,
        'buyer_name', json_build_object('full_name', buyer_profile.full_name),
        'seller_name', json_build_object('full_name', seller_profile.full_name),
        'items', COALESCE(
            (
                SELECT json_agg(
                    json_build_object(
                        'product_id', oi.product_id,
                        'quantity', oi.quantity,
                        'price', mp.price,
                        'product_name', mp.name,
                        'image', mp.image
                    )
                )
                FROM public.order_items oi
                LEFT JOIN public.marketplace_products mp ON oi.product_id = mp.id
                WHERE oi.order_id = o.id
            ),
            '[]'::json
        )
    ) AS order_details
FROM
    public.deliveries d
LEFT JOIN public.orders o ON d.order_id = o.id
LEFT JOIN public.profiles buyer_profile ON o.buyer_id = buyer_profile.user_id
LEFT JOIN public.profiles seller_profile ON o.seller_id = seller_profile.user_id
WHERE
    d.status = 'pending' AND d.driver_id IS NULL;