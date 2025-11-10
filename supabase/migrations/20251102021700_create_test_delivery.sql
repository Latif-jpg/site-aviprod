-- Migration: Create test delivery for testing the delivery system
-- Date: 2025-11-02
-- Description: Insert a test delivery record to test the delivery driver functionality

-- First, get an existing order that needs delivery
INSERT INTO public.deliveries (
    order_id,
    status,
    pickup_location,
    delivery_location,
    estimated_delivery_time,
    created_at
)
SELECT
    o.id,
    'pending',
    json_build_object(
        'address', 'Test Pickup Address',
        'city', 'Ouagadougou',
        'coordinates', json_build_array(-1.5197, 12.3714)
    ),
    json_build_object(
        'address', 'Test Delivery Address',
        'city', 'Ouagadougou',
        'phone', '70000000',
        'coordinates', json_build_array(-1.5197, 12.3714)
    ),
    NOW() + INTERVAL '2 hours',
    NOW()
FROM public.orders o
WHERE o.status IN ('confirmed', 'ready')
  AND NOT EXISTS (
      SELECT 1 FROM public.deliveries d WHERE d.order_id = o.id
  )
LIMIT 1;

-- If no confirmed orders exist, create one from pending orders
INSERT INTO public.deliveries (
    order_id,
    status,
    pickup_location,
    delivery_location,
    estimated_delivery_time,
    created_at
)
SELECT
    o.id,
    'pending',
    json_build_object(
        'address', 'Test Pickup Address',
        'city', 'Ouagadougou',
        'coordinates', json_build_array(-1.5197, 12.3714)
    ),
    json_build_object(
        'address', 'Test Delivery Address',
        'city', 'Ouagadougou',
        'phone', '70000000',
        'coordinates', json_build_array(-1.5197, 12.3714)
    ),
    NOW() + INTERVAL '2 hours',
    NOW()
FROM public.orders o
WHERE NOT EXISTS (
    SELECT 1 FROM public.deliveries d WHERE d.order_id = o.id
)
LIMIT 1;