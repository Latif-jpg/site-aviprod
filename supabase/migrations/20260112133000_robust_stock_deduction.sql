-- Migration: Robust Stock Deduction Audit and CRON
-- Date: 2026-01-12

-- 1. Créer la table d'audit pour les déductions de stock
CREATE TABLE IF NOT EXISTS public.audit_stock_deductions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    execution_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status TEXT NOT NULL, -- 'success', 'error', 'partial'
    assignments_processed INT DEFAULT 0,
    total_kg_deducted NUMERIC DEFAULT 0,
    error_message TEXT,
    details JSONB
);

-- RLS pour l'audit
ALTER TABLE public.audit_stock_deductions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view audit logs" ON public.audit_stock_deductions
    FOR SELECT USING (auth.jwt() ->> 'role' = 'service_role' OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- 2. Fonction wrapper pour inclure l'audit lors de l'appel CRON
CREATE OR REPLACE FUNCTION public.scheduled_daily_deduction()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSONB;
BEGIN
    BEGIN
        SELECT public.apply_daily_stock_deduction() INTO v_result;
        
        INSERT INTO public.audit_stock_deductions (status, assignments_processed, total_kg_deducted, details)
        VALUES (
            'success', 
            (v_result->>'assignments_processed')::int, 
            (v_result->>'total_kg_deducted')::numeric,
            v_result
        );
    EXCEPTION WHEN OTHERS THEN
        INSERT INTO public.audit_stock_deductions (status, error_message)
        VALUES ('error', SQLERRM);
    END;
END;
$$;

-- 3. Activation du CRON (Nécessite pg_cron)
-- Note: Si pg_cron n'est pas activé, l'utilisateur devra le faire via le dashboard Supabase
-- ou via l'API Management.
/*
SELECT cron.schedule(
  'daily-stock-deduction',
  '0 0 * * *', -- Tous les jours à minuit
  $$SELECT public.scheduled_daily_deduction();$$
);
*/

-- On reactive aussi les jobs existants s'ils étaient commentés
/*
SELECT cron.schedule(
  'update-stock-predictions-daily',
  '0 2 * * *',
  $$SELECT update_stock_predictions();$$
);

SELECT cron.schedule(
  'auto-assign-lots-daily',
  '0 3 * * *',
  $$SELECT auto_assign_lots_to_stock();$$
);
*/
