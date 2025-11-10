-- MIGRATION: Crée une vue pour simplifier la récupération des livraisons disponibles.
-- Problème: La requête côté client est complexe, utilise une jointure interne et un mapping manuel, ce qui est source d'erreurs.
-- Solution: Créer une vue SQL sécurisée (security_invoker) qui pré-joint et formate les données.

CREATE OR REPLACE VIEW public.available_deliveries_view
WITH (security_invoker = true) -- La vue s'exécute avec les permissions de l'utilisateur qui l'appelle.
AS
SELECT
    d.id,
    d.order_id,
    d.status,
    d.pickup_location,
    d.delivery_location,
    d.estimated_delivery_time,
    d.created_at,
    -- Créer un objet JSON 'order_details' qui correspond à ce que l'interface attend.
    json_build_object(
        'total_amount', o.total_price,
        'buyer_id', o.buyer_id,
        'items', json_build_array(
            json_build_object(
                'product_id', o.product_id,
                'quantity', o.quantity,
                'order_date', o.created_at
            )
        )
    ) AS order_details
FROM
r     public.deliveries d LEFT JOIN public.orders o ON d.order_id = o.id
WHERE
    d.status = 'pending' AND d.driver_id IS NULL;
