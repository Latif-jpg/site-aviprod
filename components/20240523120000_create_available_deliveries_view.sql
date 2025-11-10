-- MIGRATION: Crée une vue pour simplifier la récupération des livraisons disponibles.
-- Problème: La requête côté client est complexe, utilise une jointure interne et un mapping manuel, ce qui est source d'erreurs.
-- Solution: Créer une vue SQL qui pré-joint et formate les données. Le client n'a plus qu'à lire cette vue.

CREATE OR REPLACE VIEW public.available_deliveries_view AS
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
        'buyer_name', (SELECT full_name FROM public.profiles WHERE id = o.buyer_id),
        'seller_name', (SELECT full_name FROM public.profiles WHERE id = o.seller_id),
        'items', json_build_array(
            json_build_object(
                'product_id', o.product_id,
                'quantity', o.quantity,
                'order_date', o.created_at
            )
        )
    ) AS order_details
FROM
    public.deliveries d
LEFT JOIN
    public.orders o ON d.order_id = o.id
WHERE
    d.status = 'pending' AND d.driver_id IS NULL;

-- Appliquer une politique de sécurité à la vue : seuls les livreurs peuvent la lire.
CREATE POLICY "Drivers can select from available_deliveries_view" ON public.available_deliveries_view FOR SELECT TO authenticated USING ((SELECT role FROM public.profiles WHERE user_id = auth.uid()) = 'driver');
ALTER TABLE public.available_deliveries_view ENABLE ROW LEVEL SECURITY;
-- MIGRATION: Crée une vue pour simplifier la récupération des livraisons disponibles.
-- Problème: La requête côté client est complexe, utilise une jointure interne et un mapping manuel, ce qui est source d'erreurs.
-- Solution: Créer une vue SQL qui pré-joint et formate les données. Le client n'a plus qu'à lire cette vue.

CREATE OR REPLACE VIEW public.available_deliveries_view AS
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
        'buyer_name', (SELECT full_name FROM public.profiles WHERE id = o.buyer_id),
        'seller_name', (SELECT full_name FROM public.profiles WHERE id = o.seller_id),
        'items', json_build_array(
            json_build_object(
                'product_id', o.product_id,
                'quantity', o.quantity,
                'order_date', o.created_at
            )
        )
    ) AS order_details
FROM
    public.deliveries d
LEFT JOIN
    public.orders o ON d.order_id = o.id
WHERE
    d.status = 'pending' AND d.driver_id IS NULL;

-- Appliquer une politique de sécurité à la vue : seuls les livreurs peuvent la lire.
CREATE POLICY "Drivers can select from available_deliveries_view" ON public.available_deliveries_view FOR SELECT TO authenticated USING ((SELECT role FROM public.profiles WHERE user_id = auth.uid()) = 'driver');
ALTER TABLE public.available_deliveries_view ENABLE ROW LEVEL SECURITY;