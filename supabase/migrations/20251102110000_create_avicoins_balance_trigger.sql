-- Function to update avicoins balance from a transaction
CREATE OR REPLACE FUNCTION public.update_avicoins_balance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Insert a new balance record or update an existing one when a transaction is made
    INSERT INTO public.user_avicoins (user_id, balance, total_earned, total_spent)
    VALUES (
        NEW.user_id, 
        NEW.amount, 
        CASE WHEN NEW.amount > 0 THEN NEW.amount ELSE 0 END, 
        CASE WHEN NEW.amount < 0 THEN ABS(NEW.amount) ELSE 0 END
    )
    ON CONFLICT (user_id) 
    DO UPDATE SET
        balance = public.user_avicoins.balance + NEW.amount,
        total_earned = public.user_avicoins.total_earned + CASE WHEN NEW.amount > 0 THEN NEW.amount ELSE 0 END,
        total_spent = public.user_avicoins.total_spent + CASE WHEN NEW.amount < 0 THEN ABS(NEW.amount) ELSE 0 END,
        updated_at = NOW();
    
    RETURN NEW;
END;
$$;

-- Trigger to automatically update the avicoins balance after a transaction is inserted
DROP TRIGGER IF EXISTS trigger_update_avicoins_balance ON public.avicoins_transactions;
CREATE TRIGGER trigger_update_avicoins_balance
    AFTER INSERT ON public.avicoins_transactions
    FOR EACH ROW EXECUTE FUNCTION public.update_avicoins_balance();
