-- Migration: Fix Schema Cache for Intelligence System
-- Date: 2025-11-06
-- Description: Force schema cache refresh for activity_logs table

-- =====================================================
-- ADD MISSING COLUMNS TO activity_logs
-- =====================================================

-- Add missing columns to activity_logs table
ALTER TABLE public.activity_logs
ADD COLUMN IF NOT EXISTS session_id text,
ADD COLUMN IF NOT EXISTS user_agent text,
ADD COLUMN IF NOT EXISTS ip_address inet,
ADD COLUMN IF NOT EXISTS duration_ms integer,
ADD COLUMN IF NOT EXISTS performance_score decimal(3,2);

-- =====================================================
-- FORCE SCHEMA CACHE REFRESH
-- =====================================================

-- Force refresh of schema cache by doing a dummy operation
SELECT pg_notify('pgrst', 'reload schema');

-- Add a comment to force schema cache update
COMMENT ON TABLE public.activity_logs IS 'Logs universels d''activité pour analyse et amélioration - Schema updated 2025-11-06';

-- =====================================================
-- VERIFY COLUMNS EXIST
-- =====================================================

-- Check if all required columns exist
DO $$
DECLARE
    column_count INTEGER;
BEGIN
    -- Count required columns
    SELECT COUNT(*) INTO column_count
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'activity_logs'
    AND column_name IN (
        'id', 'event_type', 'user_id', 'farm_id', 'priority',
        'context', 'metadata', 'outcome', 'error_message', 'created_at',
        'session_id', 'user_agent', 'ip_address', 'duration_ms', 'performance_score'
    );

    IF column_count < 15 THEN
        RAISE EXCEPTION 'Missing columns in activity_logs table. Expected 15, found %', column_count;
    END IF;

    RAISE NOTICE 'All required columns found in activity_logs table (% columns)', column_count;
END $$;

-- =====================================================
-- TEST INSERT (optional - remove in production)
-- =====================================================

/*
-- Test insert to verify schema
INSERT INTO public.activity_logs (
    event_type, user_id, farm_id, priority, context, metadata,
    outcome, error_message, session_id, user_agent, ip_address,
    duration_ms, performance_score
) VALUES (
    'test_event',
    NULL,
    NULL,
    'low',
    '{"test": true}'::jsonb,
    '{"timestamp": "2025-11-06T00:00:00.000Z"}'::jsonb,
    'success',
    NULL,
    'test_session',
    'test_agent',
    NULL,
    100,
    0.95
);

-- Clean up test data
DELETE FROM public.activity_logs WHERE event_type = 'test_event';
*/

-- =====================================================
-- LOG MIGRATION COMPLETION
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE 'Schema cache fix migration completed successfully at %', now();
END $$;