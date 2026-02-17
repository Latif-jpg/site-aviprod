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

CREATE OR REPLACE FUNCTION public.upsert_lot_assignment(
    p_user_id UUID,
    p_lot_id UUID,
    p_stock_item_id UUID,
    p_daily_quantity NUMERIC,
    p_feed_type TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.lot_stock_assignments (
        user_id,
        lot_id,
        stock_item_id,
        daily_quantity_per_bird,
        feed_type,
        is_active,
        last_updated
    )
    VALUES (
        p_user_id,
        p_lot_id,
        p_stock_item_id,
        p_daily_quantity,
        p_feed_type,
        true,
        NOW()
    )
    ON CONFLICT (lot_id, stock_item_id)
    DO UPDATE SET
        daily_quantity_per_bird = EXCLUDED.daily_quantity_per_bird,
        feed_type = EXCLUDED.feed_type,
        is_active = true,
        last_updated = NOW();

    RETURN jsonb_build_object('status', 'success');
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_lot_assignment(UUID, UUID, UUID, NUMERIC, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.apply_daily_stock_deduction()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    assignment_record RECORD;
    v_quantity_consumed NUMERIC;
    v_total_deducted NUMERIC := 0;
    v_count INT := 0;
    v_audit_id UUID;
BEGIN
    -- 1. Créer une entrée d'audit (si la table existe, sinon on ignore cette partie pour l'instant)
    -- On va créer la table dans une migration séparée juste après
    
    FOR assignment_record IN
        SELECT 
            la.lot_id, 
            la.stock_item_id, 
            la.daily_quantity_per_bird, 
            la.user_id,
            l.quantity as bird_count,
            l.name as lot_name
        FROM public.lot_stock_assignments la
        JOIN public.lots l ON la.lot_id = l.id
        WHERE la.is_active = true 
          AND l.status = 'active'
    LOOP
        -- PROTECTION : Vérifier si une déduction automatique a déjà été faite aujourd'hui pour ce lot/stock
        IF NOT EXISTS (
            SELECT 1 FROM public.stock_consumption_tracking 
            WHERE lot_id = assignment_record.lot_id 
              AND stock_item_id = assignment_record.stock_item_id 
              AND date = CURRENT_DATE 
              AND entry_type = 'automatic'
        ) THEN
            -- Calculer la consommation totale du lot pour aujourd'hui
            v_quantity_consumed := COALESCE(assignment_record.bird_count, 0) * COALESCE(assignment_record.daily_quantity_per_bird, 0);

            IF v_quantity_consumed > 0 THEN
                -- Insérer dans le tracking (ceci déclenchera le trigger de déduction du stock réel)
                INSERT INTO public.stock_consumption_tracking (
                    lot_id,
                    stock_item_id,
                    user_id,
                    date,
                    quantity_consumed,
                    quantity_planned,
                    entry_type
                ) VALUES (
                    assignment_record.lot_id,
                    assignment_record.stock_item_id,
                    assignment_record.user_id,
                    CURRENT_DATE,
                    v_quantity_consumed,
                    v_quantity_consumed,
                    'automatic'
                );

                -- Mise à jour directe de la consommation accumulée sur le lot
                UPDATE public.lots 
                SET feed_consumption = COALESCE(feed_consumption, 0) + v_quantity_consumed 
                WHERE id = assignment_record.lot_id;

                v_total_deducted := v_total_deducted + v_quantity_consumed;
                v_count := v_count + 1;
            END IF;
        END IF;
    END LOOP;

    -- Notifier dans l'audit (si implémenté plus tard)
    RETURN jsonb_build_object(
        'status', 'success', 
        'assignments_processed', v_count, 
        'total_kg_deducted', v_total_deducted,
        'timestamp', NOW()
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.apply_daily_stock_deduction() TO authenticated, service_role;