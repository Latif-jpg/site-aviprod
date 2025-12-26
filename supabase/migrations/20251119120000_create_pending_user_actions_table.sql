-- Create table to store pending user actions (to resume after payment/subscription)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pending_user_actions') THEN
    CREATE TABLE public.pending_user_actions (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      action_type TEXT NOT NULL,
      payload JSONB,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','completed','cancelled')),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_pending_user_actions_user_id ON public.pending_user_actions(user_id);
CREATE INDEX IF NOT EXISTS idx_pending_user_actions_status ON public.pending_user_actions(status);

-- trigger to update updated_at
CREATE OR REPLACE FUNCTION update_pending_user_actions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_pending_user_actions_updated_at
  BEFORE UPDATE ON public.pending_user_actions
  FOR EACH ROW
  EXECUTE FUNCTION update_pending_user_actions_updated_at();
