
-- Enable Realtime on user_subscriptions
ALTER TABLE public.user_subscriptions REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_subscriptions;

-- Enable Realtime on user_avicoins
ALTER TABLE public.user_avicoins REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_avicoins;
