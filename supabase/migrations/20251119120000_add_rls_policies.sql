-- Enable RLS for all relevant tables
ALTER TABLE public.lots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_records ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts (optional but safer)
DROP POLICY IF EXISTS "Enable all access for users based on user_id" ON public.lots;
DROP POLICY IF EXISTS "Enable all access for users based on user_id" ON public.stock;
DROP POLICY IF EXISTS "Enable all access for users based on user_id" ON public.notifications;
DROP POLICY IF EXISTS "Enable all access for users based on user_id" ON public.financial_records;

-- Create policies for LOTS
CREATE POLICY "Enable all access for users based on user_id"
ON public.lots
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create policies for STOCK
CREATE POLICY "Enable all access for users based on user_id"
ON public.stock
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create policies for NOTIFICATIONS
CREATE POLICY "Enable all access for users based on user_id"
ON public.notifications
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create policies for FINANCIAL_RECORDS
CREATE POLICY "Enable all access for users based on user_id"
ON public.financial_records
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
