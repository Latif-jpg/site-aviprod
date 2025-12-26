-- Create farms table for user farm management
CREATE TABLE IF NOT EXISTS public.farms (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    location TEXT,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.farms ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own farms" ON public.farms
    FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert their own farms" ON public.farms
    FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update their own farms" ON public.farms
    FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete their own farms" ON public.farms
    FOR DELETE USING (auth.uid() = owner_id);

-- Create a function to create farm during signup (bypasses RLS)
CREATE OR REPLACE FUNCTION create_user_farm(farm_name TEXT, user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    farm_id UUID;
BEGIN
    -- Insert the farm with service role privileges
    INSERT INTO public.farms (name, owner_id)
    VALUES (farm_name, user_id)
    RETURNING id INTO farm_id;

    RETURN farm_id;
END;
$$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS farms_owner_id_idx ON public.farms(owner_id);
CREATE INDEX IF NOT EXISTS farms_created_at_idx ON public.farms(created_at);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_farms_updated_at BEFORE UPDATE ON public.farms
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();