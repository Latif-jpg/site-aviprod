-- Migration: Add driver_user_id and delivery_location to driver_deliveries_view
-- Date: 2025-10-26
-- Description: Enhance the driver deliveries view with additional fields for better frontend integration

-- Drop the existing view
DROP VIEW IF EXISTS public.driver_deliveries_view;

-- Recreate the view with additional fields
CREATE OR REPLACE VIEW public.driver_deliveries_view AS
SELECT
    d.id AS delivery_id,
    d.status,
    d.actual_delivery_time,
    d.created_at AS delivery_created_at,
    o.id AS order_id,
    o.total_price,
    buyer_profile.full_name AS buyer_name,
    dp.driver_earnings,
    -- Add driver_user_id for frontend reference
    lv.user_id AS driver_user_id,
    -- Add delivery location information
    d.delivery_location,
    -- Aggregate items from order_items and marketplace_products
    COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'quantity', oi.quantity,
                'name', COALESCE(mp.name, 'Produit inconnu')
            )
        ) FILTER (WHERE oi.id IS NOT NULL),
        '[]'::jsonb
    ) AS items
FROM
    public.deliveries d
JOIN
    public.orders o ON d.order_id = o.id
LEFT JOIN
    public.profiles buyer_profile ON o.buyer_id = buyer_profile.user_id
LEFT JOIN
    public.livreur_verifications lv ON d.driver_id = lv.id
LEFT JOIN
    public.driver_payments dp ON d.id = dp.delivery_id
LEFT JOIN
    public.order_items oi ON o.id = oi.order_id
LEFT JOIN
    public.marketplace_products mp ON oi.product_id = mp.id
WHERE
    -- Only show deliveries for the current authenticated driver
    lv.user_id = auth.uid()
    AND lv.verification_status = 'approved'
GROUP BY
    d.id, d.status, d.actual_delivery_time, d.created_at, d.delivery_location,
    o.id, o.total_price, buyer_profile.full_name, dp.driver_earnings, lv.user_id;

-- Grant permissions
GRANT SELECT ON public.driver_deliveries_view TO authenticated;

-- Add comment for documentation
COMMENT ON VIEW public.driver_deliveries_view IS 'View for driver deliveries with enhanced fields including driver_user_id and delivery_location for frontend integration';