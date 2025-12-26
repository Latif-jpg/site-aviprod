CREATE OR REPLACE FUNCTION public.get_stock_overview(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSONB;
BEGIN
    WITH
    active_lots AS (
        SELECT id, name, quantity, bird_type, age, entry_date
        FROM public.lots
        WHERE user_id = p_user_id AND status = 'active'
    ),
    lot_assignments AS (
        SELECT lot_id, stock_item_id, daily_quantity_per_bird
        FROM public.lot_stock_assignments
        WHERE user_id = p_user_id AND is_active = true
    ),
    daily_consumption_by_item AS (
        SELECT
            la.stock_item_id,
            SUM(al.quantity * la.daily_quantity_per_bird) AS total_daily_consumption,
            jsonb_agg(jsonb_build_object('name', al.name, 'consumption', COALESCE(al.quantity, 0) * COALESCE(la.daily_quantity_per_bird, 0))) AS consuming_lots
        FROM active_lots al
        JOIN lot_assignments la ON al.id = la.lot_id
        GROUP BY la.stock_item_id
    ),
    enriched_stock_items AS (
        SELECT
            s.id,
            s.name,
            s.category,
            s.quantity,
            s.unit,
            s.min_threshold,
            COALESCE(s.initial_quantity, 0) AS initial_quantity,
            s.cost,
            COALESCE(dc.total_daily_consumption, 0) AS daily_consumption,
            CASE
                WHEN COALESCE(dc.total_daily_consumption, 0) > 0 THEN floor(s.quantity / dc.total_daily_consumption)
                ELSE NULL
            END AS days_remaining,
            dc.consuming_lots
        FROM public.stock s
        LEFT JOIN daily_consumption_by_item dc ON s.id = dc.stock_item_id
        WHERE s.user_id = p_user_id
        ORDER BY s.name
    ),
    stock_kpis AS (
        SELECT
            COUNT(*) AS total_items,
            SUM(quantity * cost) AS low_stock_items,
            SUM(CASE WHEN quantity <= 0 THEN 1 ELSE 0 END) AS out_of_stock_items,
            SUM(quantity * cost) AS total_stock_value,
            SUM(CASE WHEN category = 'feed' THEN daily_consumption ELSE 0 END) AS total_feed_consumption
        FROM enriched_stock_items
    )
    SELECT jsonb_build_object(
        'kpis', (SELECT row_to_json(k) FROM stock_kpis k),
        'items', (SELECT COALESCE(jsonb_agg(i), '[]'::jsonb) FROM enriched_stock_items i)
    )
    INTO v_result;

    RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_stock_overview(UUID) TO authenticated;

COMMENT ON FUNCTION public.get_stock_overview(UUID) IS 'Fournit un aperçu complet et calculé du stock pour un utilisateur, incluant la consommation journalière, les jours restants et les KPIs globaux.';

CREATE OR REPLACE FUNCTION public.apply_daily_stock_deduction()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    assignment_record RECORD;
    daily_deduction_kg NUMERIC;
    total_deducted NUMERIC := 0;
    assignments_processed INT := 0;
BEGIN
    FOR assignment_record IN
        SELECT la.lot_id, la.stock_item_id, la.daily_quantity_per_bird, l.quantity
        FROM public.lot_stock_assignments la
        JOIN public.lots l ON la.lot_id = l.id
        WHERE la.is_active = true AND l.status = 'active'
    LOOP
        daily_deduction_kg := COALESCE(assignment_record.quantity, 0) * COALESCE(assignment_record.daily_quantity_per_bird, 0);

        UPDATE public.stock 
        SET quantity = GREATEST(0, quantity - daily_deduction_kg)
        WHERE id = assignment_record.stock_item_id;

        UPDATE public.lots SET feed_consumption = COALESCE(feed_consumption, 0) + daily_deduction_kg WHERE id = assignment_record.lot_id;

        total_deducted := total_deducted + daily_deduction_kg;
        assignments_processed := assignments_processed + 1;
    END LOOP;

    RETURN jsonb_build_object('status', 'success', 'assignments_processed', assignments_processed, 'total_feed_deducted_kg', total_deducted);
END;
$$;

GRANT EXECUTE ON FUNCTION public.apply_daily_stock_deduction() TO authenticated, service_role;